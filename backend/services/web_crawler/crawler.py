import os
import time
import random
import psycopg2
import argparse
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import urllib.parse
from typing import Optional

load_dotenv()

# --- DATABASE CONFIGURATION ---
db_config = {
    "dbname": os.getenv("DATABASE_NAME", "postgres"),
    "user": os.getenv("DATABASE_USER", "postgres"),
    "password": os.getenv("DATABASE_PASSWORD"),
    "host": os.getenv("DATABASE_HOST", "localhost"),
    "port": os.getenv("DATABASE_PORT", "5432")
}

if db_config["host"] not in {"localhost", "127.0.0.1"}:
    db_config["sslmode"] = "require"

# --- SCRAPING TARGETS ---
SEARCH_QUERY = "Computer Science Internship"
LOCATION = "Australia"
LIMIT_PER_SOURCE = int(os.getenv("CRAWLER_LIMIT_PER_SOURCE", "10"))

DOMAIN_HINTS = {
    "pharmacy": ["pharmacy", "pharmacist", "pharmacology"],
    "software": [
        "software", "frontend", "backend", "full stack", "developer",
        "engineering", "computer science",
    ],
    "data": [
        "data", "machine learning", "ai", "analytics", "bi", "scientist",
    ],
    "finance": [
        "finance", "financial", "accounting", "investment", "banking",
        "economics",
    ],
    "marketing": ["marketing", "brand", "seo", "content", "growth"],
    "mechanical": ["mechanical", "cad", "manufacturing"],
    "civil": ["civil", "structural", "construction"],
    "electrical": ["electrical", "electronics", "embedded"],
    "legal": ["legal", "law", "compliance", "policy"],
    "health": ["health", "nursing", "biomedical", "clinical"],
}


def setup_driver():
    """Sets up the Selenium Chrome WebDriver with anti-detection headers."""
    chrome_options = Options()
    # chrome_options.add_argument("--headless") # Comment this out to SEE what is happening (debug mode)
    chrome_options.add_argument("--window-size=1920,1080") # Important for Seek
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # Use a real user agent to avoid detection
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(options=chrome_options)
    return driver


def db_connect():
    conn = None
    try:
        conn = psycopg2.connect(**db_config)
    except psycopg2.OperationalError as e:
        print(f"Could not connect to the database: {e}")
    return conn


def infer_domain(
    role: Optional[str],
    major: Optional[str],
    keywords: Optional[str],
) -> Optional[str]:
    haystack = " ".join(filter(None, [role, major, keywords])).lower()
    if not haystack:
        return None

    for domain, hints in DOMAIN_HINTS.items():
        if any(hint in haystack for hint in hints):
            return domain
    return None


def build_search_query(
    role: Optional[str],
    major: Optional[str],
    keywords: Optional[str],
) -> str:
    if role and role.strip():
        return f"{role.strip()} Internship"

    domain = infer_domain(role, major, keywords)
    if domain:
        return f"{domain.title()} Internship"

    return SEARCH_QUERY


def get_target_queries_from_students(conn):
    """
    Build crawl queries from current students so scraping can adapt to each domain.
    Returns a de-duplicated list like:
    - "Frontend Developer Internship"
    - "Pharmacy Internship"
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT preferred_job_role, major, search_keywords
            FROM students
            WHERE preferred_job_role IS NOT NULL
               OR major IS NOT NULL
               OR search_keywords IS NOT NULL;
            """
        )
        rows = cur.fetchall()

    if not rows:
        return [SEARCH_QUERY]

    queries = []
    for preferred_job_role, major, search_keywords in rows:
        query = build_search_query(preferred_job_role, major, search_keywords)
        if query:
            queries.append(query)

    unique_queries = sorted(set(queries))
    return unique_queries if unique_queries else [SEARCH_QUERY]


def create_table(conn):
    """Create the internships table if it doesn't exist."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS internships (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                company VARCHAR(255),
                location VARCHAR(255),
                url VARCHAR(500) UNIQUE NOT NULL,
                source VARCHAR(50),
                description TEXT,  -- Added description column
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
    print("Table 'internships' is ready.")


def insert_internships(conn, internships_list):
    """
    Insert a list of internships into the database.
    Updates description if the URL already exists.
    """
    if not internships_list:
        return 0

    print(f"Inserting {len(internships_list)} internships...")
    count = 0
    with conn.cursor() as cur:
        for job in internships_list:
            # Unwrap tuple
            title, company, location, url, source, description = job
            
            try:
                cur.execute("""
                    INSERT INTO internships (title, company, location, url, source, description)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (url) 
                    DO UPDATE SET 
                        description = EXCLUDED.description,
                        title = EXCLUDED.title;
                """, (title, company, location, url, source, description))
                count += 1
            except Exception as e:
                print(f"Error inserting {title}: {e}")
                conn.rollback() 
                continue
                
        conn.commit()
    return count

# --- HELPER: Extract Description from a single URL ---
def get_job_description(driver, url, source):
    """Visits the job URL and scrapes the full description."""
    try:
        driver.get(url)
        time.sleep(random.uniform(2, 4)) # Human-like pause
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        description = "No description available."
        
        if source == 'LinkedIn':
            # LinkedIn guest view description class
            desc_box = soup.find('div', class_='show-more-less-html__markup')
            if not desc_box:
                desc_box = soup.find('div', class_='description__text')
            if desc_box:
                # We return HTML so we can render formatting (bullet points) in React
                description = str(desc_box) 
                
        elif source == 'Seek':
            # Seek description is usually in this data-automation attribute
            desc_box = soup.find('div', attrs={'data-automation': 'jobAdDetails'})
            if desc_box:
                description = str(desc_box)

        return description
        
    except Exception as e:
        print(f"Failed to get description for {url}: {e}")
        return None

def scrape_linkedin(driver, query, location, limit_per_source=10):
    print("--- Scraping LinkedIn ---")
    internships_data = []
    
    query_encoded = urllib.parse.quote_plus(query)
    location_encoded = urllib.parse.quote_plus(location)
    url = f"https://www.linkedin.com/jobs/search/?keywords={query_encoded}&location={location_encoded}&f_JT=I"
    
    driver.get(url)
    time.sleep(3)
    
    # Scroll a bit
    for _ in range(2):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)

    soup = BeautifulSoup(driver.page_source, 'html.parser')
    job_cards = soup.find_all('div', class_='base-card')

    print(f"Found {len(job_cards)} cards on LinkedIn. Fetching details...")

    for job in job_cards[:limit_per_source]:
        try:
            title = job.find('h3', class_='base-search-card__title').text.strip()
            company = job.find('h4', class_='base-search-card__subtitle').text.strip()
            location_text = job.find('span', class_='job-search-card__location').text.strip()
            job_url = job.find('a', class_='base-card__full-link')['href'].split('?')[0]
            
            # --- NEW STEP: Visit page to get description ---
            print(f"Fetching description for: {title}")
            description = get_job_description(driver, job_url, 'LinkedIn')
            
            internships_data.append((title, company, location_text, job_url, 'LinkedIn', description))
            
        except AttributeError:
            continue
            
    return internships_data

def scrape_seek(driver, query, location, limit_per_source=10):
    print("--- Scraping Seek ---")
    internships_data = []
    
    # Seek URL construction
    query_slug = query.replace(' ', '-')
    location_slug = location.replace(' ', '-')
    url = f"https://www.seek.com.au/{query_slug}-jobs/in-{location_slug}?worktype=Internship"
    
    driver.get(url)
    time.sleep(5) # Seek takes longer to load React components

    soup = BeautifulSoup(driver.page_source, 'html.parser')
    
    # Seek changed selectors recently. They use 'article' often.
    # We look for the main job card container.
    job_listings = soup.find_all('article')
    
    if not job_listings:
        # Fallback for "No results" or "Bot detection"
        print("No job cards found on Seek. Possible bot detection or bad selector.")
        # Debug: Save page source to see what happened
        # with open("seek_debug.html", "w", encoding="utf-8") as f:
        #     f.write(driver.page_source)
        return []

    print(f"Found {len(job_listings)} cards on Seek. Fetching details...")

    for job in job_listings[:limit_per_source]:
        try:
            title_elem = job.find('a', attrs={'data-automation': 'jobTitle'})
            company_elem = job.find('a', attrs={'data-automation': 'jobCompany'})
            location_elem = job.find('a', attrs={'data-automation': 'jobLocation'})
            
            if not title_elem: continue

            title = title_elem.text.strip()
            company = company_elem.text.strip() if company_elem else "Unknown"
            location_text = location_elem.text.strip() if location_elem else "Australia"
            
            # Seek URLs are relative
            job_url = "https://www.seek.com.au" + title_elem['href']
            
            # --- Visit page to get description ---
            print(f"Fetching description for: {title}")
            description = get_job_description(driver, job_url, 'Seek')
            
            internships_data.append((title, company, location_text, job_url, 'Seek', description))

        except Exception as e:
            print(f"Error parsing Seek card: {e}")
            continue

    return internships_data

def run_crawl(conn, queries, location, limit_per_source):
    all_internships = []
    driver = setup_driver()

    try:
        for query in queries:
            print(f"\n=== Crawling query: {query} | location: {location} ===")
            all_internships.extend(
                scrape_linkedin(
                    driver,
                    query,
                    location,
                    limit_per_source=limit_per_source,
                )
            )
            all_internships.extend(
                scrape_seek(
                    driver,
                    query,
                    location,
                    limit_per_source=limit_per_source,
                )
            )
    except Exception as e:
        print(f"Global scraping error: {e}")
    finally:
        driver.quit()

    print(f"\nTotal internships scraped: {len(all_internships)}")
    inserted_count = insert_internships(conn, all_internships)
    print(f"Successfully processed {inserted_count} internships.")


def parse_args():
    parser = argparse.ArgumentParser(description="Domain-aware internship crawler")
    parser.add_argument("--mode", choices=["static", "users"], default="users")
    parser.add_argument("--query", default=SEARCH_QUERY)
    parser.add_argument("--location", default=LOCATION)
    parser.add_argument("--limit-per-source", type=int, default=LIMIT_PER_SOURCE)
    return parser.parse_args()


def main():
    args = parse_args()

    conn = db_connect()
    if not conn:
        return
        
    try:
        create_table(conn)

        if args.mode == "users":
            queries = get_target_queries_from_students(conn)
        else:
            queries = [args.query]

        print(f"Crawler mode: {args.mode}")
        print(f"Queries to crawl ({len(queries)}): {queries}")

        run_crawl(
            conn,
            queries=queries,
            location=args.location,
            limit_per_source=args.limit_per_source,
        )
        
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
