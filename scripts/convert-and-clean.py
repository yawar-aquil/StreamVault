import json
import re

# Read the TXT file
with open('english-seasons_non_drive_category.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Parse the TXT format into JSON
data = {}
current_show = None
current_season = None

# Split by show sections
show_sections = re.split(r'={60,}\nSHOW: (.+?)\n={60,}', content)

for i in range(1, len(show_sections), 2):
    show_name = show_sections[i].strip()
    show_content = show_sections[i + 1]
    
    data[show_name] = {}
    
    # Split by seasons
    season_sections = re.split(r'Season (\d+) \((\d+) episodes\)\n-{40,}', show_content)
    
    for j in range(1, len(season_sections), 3):
        season_num = int(season_sections[j])
        season_content = season_sections[j + 2]
        
        season_key = f"Season {season_num}"
        data[show_name][season_key] = []
        
        # Split by episodes
        episode_sections = re.split(r'Episode (\d+):', season_content)
        
        for k in range(1, len(episode_sections), 2):
            ep_num = int(episode_sections[k])
            ep_content = episode_sections[k + 1]
            
            # Extract video links
            video_links = []
            for line in ep_content.strip().split('\n'):
                line = line.strip()
                if line.startswith('['):
                    match = re.match(r'\[(.+?)\] (.+)', line)
                    if match:
                        link_type = match.group(1)
                        url = match.group(2)
                        video_links.append({
                            'type': link_type,
                            'url': url
                        })
            
            if video_links:
                data[show_name][season_key].append({
                    'episode': ep_num,
                    'video_links': video_links
                })

# List of 11 new shows to remove
new_shows_to_remove = [
    "ABSENTIA TV SERIES",
    "DANGEROUS LIAISONS TV SERIES",
    "DEXTER TV SERIES",
    "ETOILE TV SERIES ONLINE ENGLISH DUBBED",
    "LIP SERVICE TV SERIES",
    "TALES OF THE CITY TV SERIES",
    "THE CLEANING LADY",
    "THE FLASH",
    "THE MONSTER OF FLORENCE TV SERIES",
    "THE PATIENT TV SERIES",
    "WENTWORTH TV SERIES"
]

# Remove the 11 new shows
for show in new_shows_to_remove:
    if show in data:
        del data[show]
        print(f"✓ Removed: {show}")

# Save to JSON
with open('english-seasons_non_drive_category.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n✅ Completed!")
print(f"   Shows removed: {len(new_shows_to_remove)}")
print(f"   Shows remaining: {len(data)}")
