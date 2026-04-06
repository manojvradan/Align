import os
import time
import random
import psycopg2
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import urllib.parse

load_dotenv()

# --- DATABASE CONFIGURATION ---
db_config = {
    "dbname": os.getenv("DATABASE_NAME", "postgres"),
    "user": os.getenv("DATABASE_USER", "postgres"),
    "password": os.getenv("DATABASE_PASSWORD"),
    "host": os.getenv("DATABASE_HOST", "localhost"),
    "port": os.getenv("DATABASE_PORT", "5432")
}

# --- SCRAPING TARGETS ---
SEARCH_QUERY = "Computer Science Internship"
LOCATION = "Australia"


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

def scrape_linkedin(driver, query, location):
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

    # Limit to first 10 for testing speed (remove [:10] for production)
    for job in job_cards[:10]: 
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

def scrape_seek(driver, query, location):
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

    for job in job_listings[:10]: # Limit for testing
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

def main():
    conn = db_connect()
    if not conn:
        return
        
    try:
        create_table(conn)
        
        all_internships = []
        driver = setup_driver()
        
        try:
            # 1. Scrape LinkedIn (Most reliable for guest access)
            all_internships.extend(scrape_linkedin(driver, SEARCH_QUERY, LOCATION))
            
            # 2. Scrape Seek (Harder, might fail in headless)
            all_internships.extend(scrape_seek(driver, SEARCH_QUERY, LOCATION))
            
            # Glassdoor is omitted intentionally to prevent script hanging.
            
        except Exception as e:
            print(f"Global scraping error: {e}")
        finally:
            driver.quit()
        
        print(f"\nTotal internships scraped: {len(all_internships)}")
        
        inserted_count = insert_internships(conn, all_internships)
        print(f"Successfully processed {inserted_count} internships.")
        
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
