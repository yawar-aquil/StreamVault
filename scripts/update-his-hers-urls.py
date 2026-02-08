import json

# Load the data
with open('data/streamvault-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# HIS & HERS show ID
SHOW_ID = "ea1a9ec1-5975-432f-be53-884be27caa6d"

# URL mapping for HIS & HERS episodes
URL_MAP = {
    1: "https://drive.google.com/file/d/19NLICm8A-LPGQcKKkL3ZMt9Mbh1yHaR1/preview",
    2: "https://drive.google.com/file/d/1vTAi-TXAFeG0Ji9gQqtWllOrjQ-g6hkj/preview",
    3: "https://drive.google.com/file/d/10_IJsQ92S_d_ZxGgGe0hTYnGTw4uqWc8/preview",
    4: "https://drive.google.com/file/d/1tWev27E-SI9UYGbgnKctnBqZUK5qo439/preview",
    5: "https://drive.google.com/file/d/1z0orOBs8Xtp8KZaY3P2KB4ZrwNsFqY8E/preview",
    6: "https://drive.google.com/file/d/1y7z24puBEhW6qNOpK2kSqZaoxsZK_bDF/preview",
}

# Update episodes
updated_count = 0
for episode in data.get('episodes', []):
    if episode.get('showId') == SHOW_ID:
        ep_num = episode.get('episodeNumber')
        if ep_num in URL_MAP:
            episode['googleDriveUrl'] = URL_MAP[ep_num]
            updated_count += 1
            print(f"✓ Updated S1E{ep_num}: {episode['title']}")

# Save the updated data
with open('data/streamvault-data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n✅ Updated {updated_count} episodes!")
print("💾 Data saved to data/streamvault-data.json")
