import time
import psycopg2
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options # Only Options is needed now
from bs4 import BeautifulSoup
import urllib.parse

# --- DATABASE CONFIGURATION ---
# !!! IMPORTANT: Fill in your PostgreSQL database details here !!!
db_config = {
    "dbname": "postgres",
    "user": "postgres",
    "password": "Aligndb",
    "host": "localhost",  # or your db host
    "port": "5432"
}

# --- SCRAPING TARGETS ---
SEARCH_QUERY = "Computer Science Internship"
LOCATION = "Australia" # You can change this to your desired location

def setup_driver():
    """Sets up the Selenium Chrome WebDriver, automatically managing the driver."""
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run in headless mode (no browser window)
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

    # Selenium Manager will automatically handle the driver download and path.
    # We no longer need to specify CHROME_DRIVER_PATH or use the Service object.
    driver = webdriver.Chrome(options=chrome_options)
    return driver

def db_connect():
    """Connect to the PostgreSQL database and return the connection object."""
    conn = None
    try:
        print("Connecting to the PostgreSQL database...")
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
                scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
    print("Table 'internships' is ready.")


def insert_internships(conn, internships_list):
    """Insert a list of internships into the database, ignoring duplicates."""
    if not internships_list:
        return 0
        
    with conn.cursor() as cur:
        # Using a temporary table for bulk insert/update is more efficient
        cur.execute("CREATE TEMP TABLE temp_internships (title VARCHAR, company VARCHAR, location VARCHAR, url VARCHAR, source VARCHAR) ON COMMIT DROP;")
        
        # Prepare data for bulk insert
        args_str = ','.join(cur.mogrify("(%s,%s,%s,%s,%s)", x).decode('utf-8') for x in internships_list)
        
        cur.execute("INSERT INTO temp_internships VALUES " + args_str)
        
        cur.execute("""
            INSERT INTO internships (title, company, location, url, source)
            SELECT title, company, location, url, source FROM temp_internships
            ON CONFLICT (url) DO NOTHING;
        """)
        inserted_count = cur.rowcount
        conn.commit()
    return inserted_count


def scrape_linkedin(driver, query, location):
    """Scrapes internship data from LinkedIn."""
    print("Scraping LinkedIn...")
    internships = []
    query_encoded = urllib.parse.quote_plus(query)
    location_encoded = urllib.parse.quote_plus(location)
    
    url = f"https://www.linkedin.com/jobs/search/?keywords={query_encoded}&location={location_encoded}&f_JT=I" # f_JT=I filters for Internships
    
    driver.get(url)
    time.sleep(5) # Allow time for the page to load

    # Scroll to load more jobs
    for _ in range(3): # Scroll 3 times
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(3)

    soup = BeautifulSoup(driver.page_source, 'html.parser')
    job_listings = soup.find_all('div', class_='base-card')

    for job in job_listings:
        try:
            title = job.find('h3', class_='base-search-card__title').text.strip()
            company = job.find('h4', class_='base-search-card__subtitle').text.strip()
            location_text = job.find('span', class_='job-search-card__location').text.strip()
            # The URL is in an 'a' tag within the main div
            job_url = job.find('a', class_='base-card__full-link')['href'].split('?')[0]
            
            internships.append((title, company, location_text, job_url, 'LinkedIn'))
        except AttributeError:
            continue # Skip if a card is not a valid job listing
            
    print(f"Found {len(internships)} internships on LinkedIn.")
    return internships


def scrape_seek(driver, query, location):
    """Scrapes internship data from Seek."""
    print("Scraping Seek...")
    internships = []
    query_encoded = urllib.parse.quote_plus(query)
    location_encoded = urllib.parse.quote_plus(location)

    url = f"https://www.seek.com.au/{query_encoded}-jobs/in-{location_encoded}?worktype=Internship"
    
    driver.get(url)
    time.sleep(5)

    soup = BeautifulSoup(driver.page_source, 'html.parser')
    # Seek's job cards are articles with a specific data-automation attribute
    job_listings = soup.find_all('article', attrs={'data-automation': 'normalJob'})

    for job in job_listings:
        try:
            title = job.find('a', attrs={'data-automation': 'jobTitle'}).text.strip()
            company = job.find('a', attrs={'data-automation': 'jobCompany'}).text.strip()
            location_text = job.find('a', attrs={'data-automation': 'jobLocation'}).text.strip()
            job_url = "https://www.seek.com.au" + job.find('a', attrs={'data-automation': 'jobTitle'})['href']

            internships.append((title, company, location_text, job_url.split('?')[0], 'Seek'))
        except AttributeError:
            continue
            
    print(f"Found {len(internships)} internships on Seek.")
    return internships


def scrape_glassdoor(driver, query, location):
    """Scraper for Glassdoor - NOTE: This is often blocked and may not work."""
    print("Scraping Glassdoor...")
    internships = []
    query_encoded = query.replace(' ', '-')
    location_encoded = urllib.parse.quote_plus(location)

    # Glassdoor URLs are structured differently. This is an example structure.
    # It might require finding a "Location ID" for your target location.
    url = f"https://www.glassdoor.com/Job/{query_encoded}-jobs-SRCH_KO0,{len(query_encoded)}.htm"
    
    driver.get(url)
    time.sleep(7) # Glassdoor can be slow and has overlays

    # Close any potential pop-up/login modal if it appears
    try:
        close_button = driver.find_element(By.CLASS_NAME, "modal_closeIcon")
        close_button.click()
        time.sleep(2)
    except:
        print("No pop-up modal found on Glassdoor, continuing.")

    soup = BeautifulSoup(driver.page_source, 'html.parser')
    # Glassdoor's class names change frequently. This is an example.
    job_listings = soup.find_all('li', class_='react-job-listing')
    
    for job in job_listings:
        try:
            # Extracting can be complex due to nested divs
            title = job.find('a', {'data-test': 'job-title'}).text.strip()
            # Company name might not have a unique attribute, relying on structure
            company = job.find('div', class_='job-search-874ac056').text.strip()
            location_text = job.find('div', class_='job-search-e45f9152').text.strip()
            job_url = "https://www.glassdoor.com" + job.find('a', {'data-test': 'job-title'})['href']
            
            internships.append((title, company, location_text, job_url.split('?')[0], 'Glassdoor'))
        except (AttributeError, TypeError):
            continue

    print(f"Found {len(internships)} internships on Glassdoor.")
    return internships


def main():
    """Main function to orchestrate the scraping and database operations."""
    conn = db_connect()
    if not conn:
        return
        
    try:
        create_table(conn)
        
        all_internships = []
        driver = setup_driver()
        
        try:
            all_internships.extend(scrape_linkedin(driver,SEARCH_QUERY, LOCATION))
            all_internships.extend(scrape_seek(driver,SEARCH_QUERY, LOCATION))
            # Glassdoor is the most difficult and may fail
            all_internships.extend(scrape_glassdoor(driver,SEARCH_QUERY, LOCATION))
        finally:
            driver.quit()
        
        print(f"\nTotal internships scraped from all sources: {len(all_internships)}")
        
        inserted_count = insert_internships(conn, all_internships)
        
        print(f"Successfully inserted {inserted_count} new internships into the database.")
        
    finally:
        if conn:
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    main()