import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import json
import time

class NonDriveVideoExtractor:
    def __init__(self, base_url="https://www.worthcrete.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
    
    def is_google_drive_url(self, url):
        """Check if URL is a Google Drive link"""
        if not url:
            return False
        return 'drive.google.com' in url.lower()
    
    def has_non_drive_videos_quick_check(self, html_content):
        """Quick check if HTML contains non-Drive video indicators"""
        html_lower = html_content.lower()
        
        # Check for Mega.nz
        if 'mega.nz' in html_lower:
            return True
        
        # Check for direct video files
        video_extensions = ['.mp4', '.m3u8', '.webm', '.mkv', '.avi', '.mov']
        for ext in video_extensions:
            if ext in html_lower:
                return True
        
        # Check for common video hosting domains (excluding Drive and YouTube)
        non_drive_hosts = ['vimeo.com', 'dailymotion.com', 'streamtape.com', 
                          'doodstream.com', 'mixdrop.co', 'upstream.to']
        for host in non_drive_hosts:
            if host in html_lower:
                return True
        
        return False
    
    def extract_video_urls(self, html_content):
        """Extract non-Drive video URLs from HTML content"""
        video_urls = []
        
        # Patterns for different video sources
        patterns = {
            'mega': r'https?://mega\.nz/[^\s\'"<>]+',
            'direct_video': r'https?://[^\s\'"<>]+\.(mp4|m3u8|webm|mkv|avi|mov)(?:\?[^\s\'"<>]*)?',
            'iframe_src': r'<iframe[^>]+src=["\']([^"\']+)["\']',
            'video_src': r'<video[^>]+src=["\']([^"\']+)["\']',
            'source_src': r'<source[^>]+src=["\']([^"\']+)["\']',
        }
        
        for pattern_name, pattern in patterns.items():
            matches = re.findall(pattern, html_content, re.IGNORECASE)
            for match in matches:
                url = match[0] if isinstance(match, tuple) else match
                
                if self.is_google_drive_url(url):
                    continue
                
                skip_domains = ['google.com', 'facebook.com', 'twitter.com', 'instagram.com', 
                               'youtube.com', 'doubleclick.net', 'googletagmanager.com']
                if any(domain in url.lower() for domain in skip_domains):
                    continue
                
                video_urls.append({
                    'url': url,
                    'type': pattern_name
                })
        
        return video_urls
    
    def extract_season_number(self, url):
        """Extract season number from URL"""
        match = re.search(r'season[s]?-(\d+)', url.lower())
        if match:
            return int(match.group(1))
        return None
    
    def get_episode_links_from_season_page(self, season_url):
        """Extract all episode links from a season page"""
        try:
            response = self.session.get(season_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            current_season_num = self.extract_season_number(season_url)
            
            if current_season_num is None:
                print("⚠️  Could not determine season number from URL")
                return []
            
            episode_links = []
            
            for link in soup.find_all('a', href=True):
                href = link['href']
                
                if 'episode' not in href.lower():
                    continue
                
                episode_season_num = self.extract_season_number(href)
                
                if episode_season_num == current_season_num:
                    full_url = urljoin(self.base_url, href)
                    episode_links.append(full_url)
            
            episode_links = sorted(list(set(episode_links)))
            
            return episode_links
        
        except Exception as e:
            print(f"❌ Error fetching season page: {e}")
            return []
    
    def extract_video_links_from_episode(self, episode_url, retries=3):
        """Extract non-Drive video links from an episode page"""
        for attempt in range(retries):
            try:
                response = self.session.get(episode_url, timeout=15)
                response.raise_for_status()
                
                video_urls = self.extract_video_urls(response.text)
                
                if video_urls:
                    unique_urls = []
                    seen = set()
                    for video in video_urls:
                        if video['url'] not in seen:
                            seen.add(video['url'])
                            unique_urls.append(video)
                    return unique_urls
                
                if attempt == retries - 1:
                    print(f"\n⚠️  No non-Drive video URLs found")
                return []
            
            except requests.exceptions.Timeout:
                if attempt < retries - 1:
                    print(f"⏱️  Timeout, retry {attempt + 2}/{retries}...", end=" ")
                    time.sleep(3)
                else:
                    print(f"❌ Timeout after {retries} attempts")
                    return []
            
            except requests.exceptions.RequestException as e:
                if attempt < retries - 1:
                    print(f"⚠️  Error, retry {attempt + 2}/{retries}...", end=" ")
                    time.sleep(3)
                else:
                    print(f"❌ Failed: {str(e)[:50]}")
                    return []
        
        return []
    
    def extract_season(self, season_url, delay=2, check_first_only=False):
        """Extract all non-Drive video links from a season"""
        print(f"\n🔍 Extracting season from: {season_url}")
        print("=" * 80)
        
        season_num = self.extract_season_number(season_url)
        if season_num:
            print(f"📺 Detected: Season {season_num}")
        
        # Quick pre-check: fetch season page and check for non-Drive video indicators
        if check_first_only:
            try:
                print(f"🔍 Quick check: Fetching season page...")
                response = self.session.get(season_url, timeout=15)
                response.raise_for_status()
                
                # Quick check if this season has non-Drive videos
                if not self.has_non_drive_videos_quick_check(response.text):
                    print(f"⏭️  SKIPPING SHOW - No non-Drive video indicators found (likely Drive-only)")
                    return None
                else:
                    print(f"✓ Found non-Drive video indicators, proceeding...")
                
                # Use the already-fetched HTML to get episode links
                soup = BeautifulSoup(response.content, 'html.parser')
                current_season_num = self.extract_season_number(season_url)
                
                episode_links = []
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    if 'episode' not in href.lower():
                        continue
                    episode_season_num = self.extract_season_number(href)
                    if episode_season_num == current_season_num:
                        full_url = urljoin(self.base_url, href)
                        episode_links.append(full_url)
                
                episode_links = sorted(list(set(episode_links)))
                
            except Exception as e:
                print(f"⚠️  Error in quick check: {e}, falling back to normal method")
                episode_links = self.get_episode_links_from_season_page(season_url)
        else:
            episode_links = self.get_episode_links_from_season_page(season_url)
        
        if not episode_links:
            print("❌ No episodes found!")
            return []
        
        print(f"✅ Found {len(episode_links)} episodes\n")
        
        # If check_first_only, verify the first episode actually has extractable non-Drive videos
        if check_first_only and episode_links:
            print(f"🔍 Verifying first episode has extractable non-Drive videos...")
            first_episode_url = episode_links[0]
            
            # Try to extract non-Drive videos from first episode
            video_links = self.extract_video_links_from_episode(first_episode_url)
            
            if not video_links:
                # No extractable non-Drive videos found in first episode, skip the show
                print(f"⏭️  SKIPPING SHOW - No extractable non-Drive videos in first episode")
                return None
            else:
                print(f"✓ Verified: Found {len(video_links)} extractable non-Drive video(s), proceeding...")
        
        results = []
        failed_episodes = []
        
        for i, episode_url in enumerate(episode_links, 1):
            print(f"📥 [{i}/{len(episode_links)}] Processing Episode {i}...", end=" ")
            
            video_links = self.extract_video_links_from_episode(episode_url)
            
            if video_links:
                results.append({
                    'episode': i,
                    'episode_url': episode_url,
                    'video_links': video_links
                })
                print(f"✓ Found {len(video_links)} video link(s)")
            else:
                failed_episodes.append({'episode': i, 'url': episode_url})
                print(f"✗ No non-Drive videos found")
            
            if i < len(episode_links):
                time.sleep(delay)
        
        print("\n" + "=" * 80)
        print(f"✅ Successfully extracted: {len(results)}/{len(episode_links)} episodes")
        
        if failed_episodes:
            print(f"⚠️  Episodes with no non-Drive videos: {len(failed_episodes)}")
        
        return results
    
    def get_season_links_from_show_page(self, show_url):
        """Extract all season links from a show's main page"""
        try:
            response = self.session.get(show_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            season_links = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                if re.search(r'season[s]?-\d+', href.lower()) and 'episode' not in href.lower():
                    full_url = urljoin(self.base_url, href)
                    season_links.append(full_url)
            
            season_links = list(set(season_links))
            season_links.sort(key=lambda x: self.extract_season_number(x) or 0)
            
            return season_links
        
        except Exception as e:
            print(f"❌ Error fetching show page: {e}")
            return []
    
    def extract_all_seasons(self, show_main_url, delay=2):
        """Extract all seasons from a show's main page"""
        print(f"\n🎬 Extracting all seasons from: {show_main_url}")
        print("=" * 80)
        
        season_links = self.get_season_links_from_show_page(show_main_url)
        
        if not season_links:
            print("❌ No seasons found!")
            return {}
        
        print(f"✅ Found {len(season_links)} seasons\n")
        
        all_results = {}
        total_success = 0
        
        for season_num, season_url in enumerate(season_links, 1):
            print(f"\n{'='*80}")
            print(f"🎯 SEASON {season_num}")
            results = self.extract_season(season_url, delay)
            all_results[f"Season {season_num}"] = results
            total_success += len(results)
        
        print("\n" + "=" * 80)
        print("🎊 FINAL SUMMARY")
        print("=" * 80)
        print(f"📊 Total Seasons: {len(season_links)}")
        print(f"✅ Total Episodes with non-Drive videos: {total_success}")
        
        return all_results
    
    def get_show_links_from_category(self, category_url):
        """Extract all show links from a category page with pagination support"""
        print(f"🔍 Fetching shows from {category_url} with pagination...")
        show_links = []
        page = 1
        max_pages = 100  # Safety limit
        
        while page <= max_pages:
            page_url = f"{category_url}?pg={page}" if page > 1 else category_url
            try:
                print(f"   Processing page {page}...")
                response = self.session.get(page_url, timeout=15)
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                
                page_shows = []
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    # Improved regex for show links: ends with -online-something/
                    if (re.search(r'/[^/]+-online-[^/]+/?$', href) and 
                        'seasons-' not in href.lower() and 'episode' not in href.lower()):
                        full_url = urljoin(self.base_url, href)
                        # Extract show name from the segment before 'online'
                        segments = href.rstrip('/').split('/')
                        if segments:
                            last_seg = segments[-1]
                            show_name = re.sub(r'-online-[^-]+$', '', last_seg).replace('-', ' ').title()
                            if show_name:
                                page_shows.append({
                                    'name': show_name,
                                    'url': full_url
                                })
                
                if not page_shows:
                    print(f"   No more shows on page {page}. Stopping.")
                    break
                
                show_links.extend(page_shows)
                print(f"   Found {len(page_shows)} shows on page {page}")
                page += 1
                time.sleep(1)  # Delay between pages
                
            except requests.exceptions.RequestException as e:
                print(f"   Error on page {page}: {e}")
                break
        
        # Remove duplicates based on URL
        seen_urls = set()
        unique_shows = []
        for show in show_links:
            if show['url'] not in seen_urls:
                seen_urls.add(show['url'])
                unique_shows.append(show)
        
        # Sort alphabetically by name
        unique_shows.sort(key=lambda x: x['name'])
        
        print(f"✅ Total unique shows loaded: {len(unique_shows)}")
        return unique_shows
    
    def extract_category(self, category_url, delay=2):
        """Extract all shows from a category"""
        print(f"\n🌐 Extracting category from: {category_url}")
        print("=" * 80)
        
        show_links = self.get_show_links_from_category(category_url)
        
        if not show_links:
            print("❌ No shows found!")
            return {}
        
        print(f"✅ Found {len(show_links)} shows\n")
        
        all_results = {}
        skipped_shows = 0
        
        for i, show_info in enumerate(show_links, 1):
            show_name = show_info['name']
            show_url = show_info['url']
            
            print(f"\n{'='*80}")
            print(f"[{i}/{len(show_links)}] Processing: {show_name}")
            print(f"URL: {show_url}")
            print("=" * 80)
            
            # Get season links from show page
            season_links = self.get_season_links_from_show_page(show_url)
            
            if not season_links:
                print("❌ No seasons found!")
                continue
            
            print(f"✅ Found {len(season_links)} seasons")
            
            show_results = {}
            show_has_drive_links = False
            
            for season_num, season_url in enumerate(season_links, 1):
                print(f"\n🎯 SEASON {season_num}")
                # Check first episode only for Drive links
                results = self.extract_season(season_url, delay, check_first_only=True)
                
                # If results is None, the show has Drive links - skip entire show
                if results is None:
                    show_has_drive_links = True
                    print(f"⏭️  SKIPPING ENTIRE SHOW - Google Drive links detected")
                    break
                
                if results:
                    show_results[f"Season {season_num}"] = results
            
            if show_has_drive_links:
                skipped_shows += 1
            elif show_results:
                all_results[show_name] = show_results
            
            # Delay between shows
            time.sleep(delay * 2)
        
        print("\n" + "=" * 80)
        print(f"📊 Category Summary:")
        print(f"   Total shows processed: {len(show_links)}")
        print(f"   Shows with non-Drive videos: {len(all_results)}")
        print(f"   Shows skipped (Drive links): {skipped_shows}")
        
        return all_results
    
    def save_to_json(self, data, filename="non_drive_video_links.json"):
        """Save extracted data to JSON file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Data saved to: {filename}")
        except Exception as e:
            print(f"❌ Error saving file: {e}")
    
    def save_to_txt(self, data, filename="non_drive_video_links.txt"):
        """Save extracted data to simple text file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                if isinstance(data, dict):
                    # Check if it's category results (show names as keys)
                    first_key = list(data.keys())[0] if data else None
                    if first_key and isinstance(data[first_key], dict):
                        # Category mode
                        for show_name, seasons in data.items():
                            f.write(f"\n{'='*60}\n")
                            f.write(f"SHOW: {show_name.upper()}\n")
                            f.write(f"{'='*60}\n")
                            for season_name, episodes in seasons.items():
                                f.write(f"\n{season_name} ({len(episodes)} episodes)\n")
                                f.write(f"{'-'*40}\n")
                                for ep in episodes:
                                    f.write(f"\nEpisode {ep['episode']}:\n")
                                    for video in ep['video_links']:
                                        f.write(f"  [{video['type']}] {video['url']}\n")
                    else:
                        # Single show mode
                        for season_name, episodes in data.items():
                            f.write(f"\n{'='*60}\n")
                            f.write(f"{season_name.upper()} ({len(episodes)} episodes)\n")
                            f.write(f"{'='*60}\n")
                            for ep in episodes:
                                f.write(f"\nEpisode {ep['episode']}:\n")
                                for video in ep['video_links']:
                                    f.write(f"  [{video['type']}] {video['url']}\n")
                else:
                    # Single season mode
                    for ep in data:
                        f.write(f"\nEpisode {ep['episode']}:\n")
                        for video in ep['video_links']:
                            f.write(f"  [{video['type']}] {video['url']}\n")
            print(f"💾 Data saved to: {filename}")
        except Exception as e:
            print(f"❌ Error saving file: {e}")
    
    def print_results(self, results):
        """Print results in a formatted way"""
        print("\n" + "=" * 80)
        print("📋 EXTRACTION RESULTS (NON-DRIVE VIDEOS ONLY)")
        print("=" * 80)
        
        if isinstance(results, dict):
            first_key = list(results.keys())[0] if results else None
            if first_key and isinstance(results[first_key], dict):
                # Category mode
                for show_name, seasons in results.items():
                    print(f"\n🎬 {show_name.upper()}")
                    print("-" * 80)
                    for season_name, episodes in seasons.items():
                        print(f"\n  {season_name} ({len(episodes)} episodes with non-Drive videos)")
                        for ep in episodes:
                            print(f"\n    Episode {ep['episode']}:")
                            for video in ep['video_links']:
                                print(f"      [{video['type']}] {video['url']}")
            else:
                # Single show mode
                for season_name, episodes in results.items():
                    print(f"\n🎬 {season_name.upper()} ({len(episodes)} episodes with non-Drive videos)")
                    print("-" * 80)
                    for ep in episodes:
                        print(f"\n  Episode {ep['episode']}:")
                        for video in ep['video_links']:
                            print(f"    [{video['type']}] {video['url']}")
        else:
            # Single season mode
            print(f"\n📺 Total Episodes: {len(results)}")
            print("-" * 80)
            for ep in results:
                print(f"\nEpisode {ep['episode']}:")
                for video in ep['video_links']:
                    print(f"  [{video['type']}] {video['url']}")


def main():
    """Main execution function"""
    print("\n" + "="*80)
    print("🎬 WORTHCRETE NON-DRIVE VIDEO EXTRACTOR v2.0 (WITH PAGINATION)")
    print("="*80)
    print("\n⚠️  This script extracts ONLY non-Drive videos:")
    print("   ✓ Mega.nz links")
    print("   ✓ Direct video URLs (MP4, M3U8, WebM, MKV, etc.)")
    print("   ✓ Other iframe embeds")
    print("   ✗ Google Drive links (SKIPPED)")
    print("\nChoose extraction mode:")
    print("1. Extract a single season")
    print("2. Extract all seasons from a show")
    print("3. Extract all shows from a category (with pagination)")
    
    choice = input("\nEnter your choice (1/2/3): ").strip()
    
    if choice not in ['1', '2', '3']:
        print("❌ Invalid choice! Please run again and choose 1, 2, or 3.")
        return
    
    extractor = NonDriveVideoExtractor()
    
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
            
            filename = season_url.rstrip('/').split('/')[-1]
            extractor.save_to_json(results, f"{filename}_non_drive_links.json")
            extractor.save_to_txt(results, f"{filename}_non_drive_links.txt")
    
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
            
            show_name = show_url.rstrip('/').split('/')[-1]
            extractor.save_to_json(all_results, f"{show_name}_non_drive_all_seasons.json")
            extractor.save_to_txt(all_results, f"{show_name}_non_drive_all_seasons.txt")
    
    elif choice == "3":
        print("\n" + "-"*80)
        print("🌐 CATEGORY MODE (WITH PAGINATION)")
        print("-"*80)
        print("Example: https://www.worthcrete.com/literature/seasons/english-seasons/")
        category_url = input("\n🔗 Enter category URL: ").strip()
        
        if not category_url:
            print("❌ No URL provided!")
            return
        
        all_results = extractor.extract_category(category_url, delay=2)
        
        if all_results:
            extractor.print_results(all_results)
            
            category_name = category_url.rstrip('/').split('/')[-1]
            extractor.save_to_json(all_results, f"{category_name}_non_drive_category.json")
            extractor.save_to_txt(all_results, f"{category_name}_non_drive_category.txt")
    
    print("\n" + "="*80)
    print("✅ Extraction complete!")
    print("="*80)


if __name__ == "__main__":
    main()
