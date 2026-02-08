import json

# Load the data
with open('data/streamvault-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Banshee show ID
BANSHEE_SHOW_ID = "15ee663c-c0b2-4ddb-816e-7f426e3e6321"

# URL mapping for Banshee episodes (Season/Episode -> URL)
URL_MAP = {
    # Season 1 (S1E1 already updated, skip it)
    (1, 2): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S1-ENG/Banshee_S01E02-ENG.mp4",
    (1, 3): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S1-ENG/Banshee_S01E03-ENG.mp4",
    (1, 4): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S1-ENG/Banshee_S01E04-ENG.mp4",
    (1, 5): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S1-ENG/Banshee_S01E05-ENG.mp4",
    (1, 6): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S1-ENG/Banshee_S01E06-ENG.mp4",
    (1, 7): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S1-ENG/Banshee_S01E07-ENG.mp4",
    (1, 8): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S1-ENG/Banshee_S01E08-ENG.mp4",
    (1, 9): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S1-ENG/Banshee_S01E09-ENG.mp4",
    (1, 10): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S1-ENG/Banshee_S01E10-ENG.mp4",
    # Season 2
    (2, 1): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S2-ENG/Banshee_S02E01-ENG.mp4",
    (2, 2): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S2-ENG/Banshee_S02E02-ENG.mp4",
    (2, 3): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S2-ENG/Banshee_S02E03-ENG.mp4",
    (2, 4): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S2-ENG/Banshee_S02E04-ENG.mp4",
    (2, 5): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S2-ENG/Banshee_S02E05-ENG.mp4",
    (2, 6): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S2-ENG/Banshee_S02E06-ENG.mp4",
    (2, 7): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S2-ENG/Banshee_S02E07-ENG.mp4",
    (2, 8): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S2-ENG/Banshee_S02E08-ENG.mp4",
    (2, 9): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S2-ENG/Banshee_S02E09-ENG.mp4",
    (2, 10): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S2-ENG/Banshee_S02E10-ENG.mp4",
    # Season 3
    (3, 1): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S3-ENG/Banshee_S03E01-ENG.mp4",
    (3, 2): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S3-ENG/Banshee_S03E02-ENG.mp4",
    (3, 3): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S3-ENG/Banshee_S03E03-ENG.mp4",
    (3, 4): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S3-ENG/Banshee_S03E04-ENG.mp4",
    (3, 5): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S3-ENG/Banshee_S03E05-ENG.mp4",
    (3, 6): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S3-ENG/Banshee_S03E06-ENG.mp4",
    (3, 7): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S3-ENG/Banshee_S03E07-ENG.mp4",
    (3, 8): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S3-ENG/Banshee_S03E08-ENG.mp4",
    (3, 9): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S3-ENG/Banshee_S03E09-ENG.mp4",
    (3, 10): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S3-ENG/Banshee_S03E10-ENG.mp4",
    # Season 4
    (4, 1): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S4-ENG/Banshee_S04E01-ENG.mp4",
    (4, 2): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S4-ENG/Banshee_S04E02-ENG.mp4",
    (4, 3): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S4-ENG/Banshee_S04E03-ENG.mp4",
    (4, 4): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S4-ENG/Banshee_S04E04-ENG.mp4",
    (4, 5): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S4-ENG/Banshee_S04E05-ENG.mp4",
    (4, 6): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S4-ENG/Banshee_S04E06-ENG.mp4",
    (4, 7): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S4-ENG/Banshee_S04E07-ENG.mp4",
    (4, 8): "https://www.worthcrete.com/wp-content/uploads/DATA/ENGLISH_Series/Banshee_S1-S4-ENG/Banshee_S4-ENG/Banshee_S04E08-ENG.mp4",
}

# Update episodes
updated_count = 0
for episode in data.get('episodes', []):
    if episode.get('showId') == BANSHEE_SHOW_ID:
        season = episode.get('season')
        ep_num = episode.get('episodeNumber')
        
        # Skip S1E1 - already updated
        if season == 1 and ep_num == 1:
            print(f"✓ Skipping S{season}E{ep_num} - already updated")
            continue
        
        key = (season, ep_num)
        if key in URL_MAP:
            old_url = episode.get('googleDriveUrl', 'N/A')
            new_url = URL_MAP[key]
            episode['googleDriveUrl'] = new_url
            updated_count += 1
            print(f"✓ Updated S{season}E{ep_num}: {episode['title']}")
        else:
            print(f"⚠️ No URL mapping for S{season}E{ep_num}")

# Save the updated data
with open('data/streamvault-data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n✅ Updated {updated_count} episodes!")
print("💾 Data saved to data/streamvault-data.json")
