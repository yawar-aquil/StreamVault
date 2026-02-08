import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import json
import time

class WorthCreteExtractor:
    def __init__(self, base_url="https://www.worthcrete.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
    
    def extract_google_drive_id(self, html_content):
        """Extract Google Drive file ID from HTML content with multiple patterns"""
        patterns = [
            r'drive\.google\.com/file/d/([a-zA-Z0-9_-]+)',  # Standard iframe
            r'drive-video-([a-zA-Z0-9_-]+)',                # Video ID attribute
            r'/file/d/([a-zA-Z0-9_-]+)/preview',            # Preview URL
            r'id="drive-video-([a-zA-Z0-9_-]+)"',           # ID with drive-video
            r'data-id="([a-zA-Z0-9_-]+)"',                  # Data attribute
            r'fileId["\s:=]+([a-zA-Z0-9_-]+)',              # fileId variable
            r'video[_-]?id["\s:=]+([a-zA-Z0-9_-]+)',        # video_id/videoId
            r'src="[^"]*?/d/([a-zA-Z0-9_-]+)',              # src attribute
        ]
        
        for pattern in patterns:
            match = re.search(pattern, html_content, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def extract_season_number(self, url):
        """Extract season number from URL"""
        match = re.search(r'season[s]?-(\d+)', url.lower())
        if match:
            return int(match.group(1))
        return None
    
    def get_episode_links_from_season_page(self, season_url):
        """Extract all episode links from a season page - FIXED VERSION"""
        try:
            response = self.session.get(season_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract the season number from the current URL
            current_season_num = self.extract_season_number(season_url)
            
            if current_season_num is None:
                print("⚠️  Could not determine season number from URL")
                return []
            
            episode_links = []
            
            # Find all links containing "episode" in the URL
            for link in soup.find_all('a', href=True):
                href = link['href']
                
                # Must contain 'episode' keyword
                if 'episode' not in href.lower():
                    continue
                
                # Must contain the same season number as current page
                episode_season_num = self.extract_season_number(href)
                
                # Only add if it matches the current season
                if episode_season_num == current_season_num:
                    full_url = urljoin(self.base_url, href)
                    episode_links.append(full_url)
            
            # Remove duplicates and sort
            episode_links = sorted(list(set(episode_links)))
            
            return episode_links
        
        except Exception as e:
            print(f"❌ Error fetching season page: {e}")
            return []
    
    def extract_drive_link_from_episode(self, episode_url, retries=3):
        """Extract Google Drive link from an episode page with retry logic"""
        for attempt in range(retries):
            try:
                response = self.session.get(episode_url, timeout=15)
                response.raise_for_status()
                
                drive_id = self.extract_google_drive_id(response.text)
                if drive_id:
                    return f"https://drive.google.com/file/d/{drive_id}/view"
                
                # If no drive_id found on last attempt, show debug info
                if attempt == retries - 1:
                    print(f"\n⚠️  No Google Drive ID found in HTML")
                return None
            
            except requests.exceptions.Timeout:
                if attempt < retries - 1:
                    print(f"⏱️  Timeout, retry {attempt + 2}/{retries}...", end=" ")
                    time.sleep(3)
                else:
                    print(f"❌ Timeout after {retries} attempts")
                    return None
            
            except requests.exceptions.RequestException as e:
                if attempt < retries - 1:
                    print(f"⚠️  Error, retry {attempt + 2}/{retries}...", end=" ")
                    time.sleep(3)
                else:
                    print(f"❌ Failed: {str(e)[:50]}")
                    return None
        
        return None
    
    def extract_season(self, season_url, delay=2):
        """Extract all Google Drive links from a season"""
        print(f"\n🔍 Extracting season from: {season_url}")
        print("=" * 80)
        
        # Extract season number
        season_num = self.extract_season_number(season_url)
        if season_num:
            print(f"📺 Detected: Season {season_num}")
        
        # Get all episode links
        episode_links = self.get_episode_links_from_season_page(season_url)
        
        if not episode_links:
            print("❌ No episodes found!")
            return []
        
        print(f"✅ Found {len(episode_links)} episodes\n")
        
        results = []
        failed_episodes = []
        
        for i, episode_url in enumerate(episode_links, 1):
            print(f"📥 [{i}/{len(episode_links)}] Processing Episode {i}...", end=" ")
            
            drive_link = self.extract_drive_link_from_episode(episode_url)
            
            if drive_link:
                results.append({
                    'episode': i,
                    'episode_url': episode_url,
                    'google_drive_link': drive_link
                })
                print(f"✓ Success")
            else:
                failed_episodes.append({'episode': i, 'url': episode_url})
                print(f"✗ Failed")
            
            # Delay between requests
            if i < len(episode_links):
                time.sleep(delay)
        
        # Show summary
        print("\n" + "=" * 80)
        print(f"✅ Successfully extracted: {len(results)}/{len(episode_links)} episodes")
        
        if failed_episodes:
            print(f"⚠️  Failed episodes: {len(failed_episodes)}")
            for ep in failed_episodes:
                print(f"   - Episode {ep['episode']}: {ep['url']}")
        
        return results
    
    def extract_all_seasons(self, show_main_url, delay=2):
        """Extract all seasons from a show's main page"""
        print(f"\n🎬 Extracting all seasons from: {show_main_url}")
        print("=" * 80)
        
        try:
            response = self.session.get(show_main_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            season_links = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                # Match season pages (e.g., "seasons-1", "seasons-2")
                if re.search(r'season[s]?-\d+', href.lower()) and 'episode' not in href.lower():
                    full_url = urljoin(self.base_url, href)
                    season_links.append(full_url)
            
            # Remove duplicates and sort by season number
            season_links = list(set(season_links))
            season_links.sort(key=lambda x: self.extract_season_number(x) or 0)
            
            if not season_links:
                print("❌ No seasons found!")
                return {}
            
            print(f"✅ Found {len(season_links)} seasons\n")
            
            all_results = {}
            total_success = 0
            total_failed = 0
            
            for season_num, season_url in enumerate(season_links, 1):
                print(f"\n{'='*80}")
                print(f"🎯 SEASON {season_num}")
                results = self.extract_season(season_url, delay)
                all_results[f"Season {season_num}"] = results
                
                # Count successes
                total_success += len(results)
                episode_links = self.get_episode_links_from_season_page(season_url)
                total_failed += len(episode_links) - len(results)
            
            # Final summary
            print("\n" + "=" * 80)
            print("🎊 FINAL SUMMARY")
            print("=" * 80)
            print(f"📊 Total Seasons: {len(season_links)}")
            print(f"✅ Total Episodes Extracted: {total_success}")
            if total_failed > 0:
                print(f"⚠️  Total Failed: {total_failed}")
            
            return all_results
        
        except Exception as e:
            print(f"❌ Error fetching show page: {e}")
            return {}
    
    def save_to_json(self, data, filename="google_drive_links.json"):
        """Save extracted data to JSON file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Data saved to: {filename}")
        except Exception as e:
            print(f"❌ Error saving file: {e}")
    
    def save_to_txt(self, data, filename="google_drive_links.txt"):
        """Save extracted data to simple text file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                if isinstance(data, dict) and any(k.startswith('Season') for k in data.keys()):
                    # Multiple seasons
                    for season_name, episodes in data.items():
                        f.write(f"\n{'='*60}\n")
                        f.write(f"{season_name.upper()} ({len(episodes)} episodes)\n")
                        f.write(f"{'='*60}\n")
                        for ep in episodes:
                            f.write(f"Episode {ep['episode']}: {ep['google_drive_link']}\n")
                else:
                    # Single season
                    for ep in data:
                        f.write(f"Episode {ep['episode']}: {ep['google_drive_link']}\n")
            print(f"💾 Data saved to: {filename}")
        except Exception as e:
            print(f"❌ Error saving file: {e}")
    
    def print_results(self, results):
        """Print results in a formatted way"""
        print("\n" + "=" * 80)
        print("📋 EXTRACTION RESULTS")
        print("=" * 80)
        
        if isinstance(results, dict) and any(k.startswith('Season') for k in results.keys()):
            # Multiple seasons
            for season_name, episodes in results.items():
                print(f"\n🎬 {season_name.upper()} ({len(episodes)} episodes)")
                print("-" * 80)
                for ep in episodes:
                    print(f"  Episode {ep['episode']}: {ep['google_drive_link']}")
        else:
            # Single season
            print(f"\n📺 Total Episodes: {len(results)}")
            print("-" * 80)
            for ep in results:
                print(f"Episode {ep['episode']}: {ep['google_drive_link']}")


def main():
    """Main execution function"""
    print("\n" + "="*80)
    print("🎬 WORTHCRETE GOOGLE DRIVE EXTRACTOR v2.1")
    print("="*80)
    print("\nChoose extraction mode:")
    print("1. Extract a single season")
    print("2. Extract all seasons from a show")
    
    choice = input("\nEnter your choice (1/2): ").strip()
    
    if choice not in ['1', '2']:
        print("❌ Invalid choice! Please run again and choose 1 or 2.")
        return
    
    extractor = WorthCreteExtractor()
    
    if choice == "1":
        print("\n" + "-"*80)
        print("📌 SINGLE SEASON MODE")
        print("-"*80)
        print("Example: https://www.worthcrete.com/literature/seasons/english-seasons/stranger-things-online-english/stranger-things-seasons-1-online-english/")
        season_url = input("\n🔗 Enter season URL: ").strip()
        
        if not season_url:
            print("❌ No URL provided!")
            return
        
        results = extractor.extract_season(season_url, delay=2)
        
        if results:
            extractor.print_results(results)
            
            # Generate filename from URL
            filename = season_url.rstrip('/').split('/')[-1]
            extractor.save_to_json(results, f"{filename}_links.json")
            extractor.save_to_txt(results, f"{filename}_links.txt")
    
    elif choice == "2":
        print("\n" + "-"*80)
        print("🎭 ALL SEASONS MODE")
        print("-"*80)
        print("Example: https://www.worthcrete.com/literature/seasons/english-seasons/stranger-things-online-english/")
        show_url = input("\n🔗 Enter show URL: ").strip()
        
        if not show_url:
            print("❌ No URL provided!")
            return
        
        all_results = extractor.extract_all_seasons(show_url, delay=2)
        
        if all_results:
            extractor.print_results(all_results)
            
            # Generate filename from URL
            show_name = show_url.rstrip('/').split('/')[-1]
            extractor.save_to_json(all_results, f"{show_name}_all_seasons.json")
            extractor.save_to_txt(all_results, f"{show_name}_all_seasons.txt")
    
    print("\n" + "="*80)
    print("✅ Extraction complete!")
    print("="*80)


if __name__ == "__main__":
    main()
