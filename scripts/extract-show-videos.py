import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import json
import time

class ShowVideoExtractor:
    """Extract non-Drive video URLs from a specific show"""
    
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
    
    def extract_video_urls(self, html_content):
        """Extract non-Drive video URLs from HTML content"""
        video_urls = []
        
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
    
    def extract_show(self, show_url, delay=2):
        """Extract all non-Drive video links from a show"""
        print(f"\n🎬 Extracting show from: {show_url}")
        print("=" * 80)
        
        # Get season links
        season_links = self.get_season_links_from_show_page(show_url)
        
        if not season_links:
            print("❌ No seasons found!")
            return {}
        
        print(f"✅ Found {len(season_links)} seasons\n")
        
        all_results = {}
        total_episodes = 0
        total_with_videos = 0
        
        for season_num, season_url in enumerate(season_links, 1):
            print(f"\n{'='*80}")
            print(f"🎯 SEASON {season_num}")
            print(f"URL: {season_url}")
            print("=" * 80)
            
            episode_links = self.get_episode_links_from_season_page(season_url)
            
            if not episode_links:
                print("❌ No episodes found!")
                continue
            
            print(f"✅ Found {len(episode_links)} episodes\n")
            
            season_results = []
            
            for i, episode_url in enumerate(episode_links, 1):
                print(f"📥 [{i}/{len(episode_links)}] Processing Episode {i}...", end=" ")
                
                video_links = self.extract_video_links_from_episode(episode_url)
                total_episodes += 1
                
                if video_links:
                    season_results.append({
                        'episode': i,
                        'episode_url': episode_url,
                        'video_links': video_links
                    })
                    total_with_videos += 1
                    print(f"✓ Found {len(video_links)} video link(s)")
                else:
                    print(f"✗ No non-Drive videos found")
                
                if i < len(episode_links):
                    time.sleep(delay)
            
            if season_results:
                all_results[f"Season {season_num}"] = season_results
            
            print(f"\n📊 Season {season_num} Summary: {len(season_results)}/{len(episode_links)} episodes with non-Drive videos")
        
        print("\n" + "=" * 80)
        print("🎊 FINAL SUMMARY")
        print("=" * 80)
        print(f"📊 Total Seasons: {len(season_links)}")
        print(f"📊 Total Episodes: {total_episodes}")
        print(f"✅ Episodes with non-Drive videos: {total_with_videos}")
        
        return all_results
    
    def save_to_json(self, data, filename):
        """Save extracted data to JSON file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Data saved to: {filename}")
        except Exception as e:
            print(f"❌ Error saving file: {e}")
    
    def save_to_txt(self, data, filename):
        """Save extracted data to simple text file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                for season_name, episodes in data.items():
                    f.write(f"\n{'='*60}\n")
                    f.write(f"{season_name.upper()} ({len(episodes)} episodes)\n")
                    f.write(f"{'='*60}\n")
                    for ep in episodes:
                        f.write(f"\nEpisode {ep['episode']}:\n")
                        f.write(f"  URL: {ep['episode_url']}\n")
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
        
        for season_name, episodes in results.items():
            print(f"\n🎬 {season_name.upper()} ({len(episodes)} episodes)")
            print("-" * 80)
            for ep in episodes:
                print(f"\n  Episode {ep['episode']}:")
                for video in ep['video_links']:
                    print(f"    [{video['type']}] {video['url']}")


def main():
    """Main execution function"""
    print("\n" + "="*80)
    print("🎬 SHOW VIDEO EXTRACTOR - Extract non-Drive videos from a specific show")
    print("="*80)
    print("\n⚠️  This script extracts ONLY non-Drive videos:")
    print("   ✓ Mega.nz links")
    print("   ✓ Direct video URLs (MP4, M3U8, WebM, MKV, etc.)")
    print("   ✓ Other iframe embeds")
    print("   ✗ Google Drive links (SKIPPED)")
    
    print("\n" + "-"*80)
    print("Example show URL:")
    print("https://www.worthcrete.com/literature/seasons/english-seasons/stranger-things-online-english/")
    print("-"*80)
    
    show_url = input("\n🔗 Enter the show URL: ").strip()
    
    if not show_url:
        print("❌ No URL provided!")
        return
    
    # Validate URL
    if not show_url.startswith('http'):
        print("❌ Invalid URL! Must start with http:// or https://")
        return
    
    extractor = ShowVideoExtractor()
    
    # Extract the show
    results = extractor.extract_show(show_url, delay=2)
    
    if results:
        extractor.print_results(results)
        
        # Generate filename from show URL
        show_name = show_url.rstrip('/').split('/')[-1]
        if not show_name:
            show_name = "show_videos"
        
        # Save results
        extractor.save_to_json(results, f"{show_name}_non_drive.json")
        extractor.save_to_txt(results, f"{show_name}_non_drive.txt")
    else:
        print("\n❌ No non-Drive videos found for this show!")
    
    print("\n" + "="*80)
    print("✅ Extraction complete!")
    print("="*80)


if __name__ == "__main__":
    main()
