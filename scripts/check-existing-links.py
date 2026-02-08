import json

# Load comparison results
with open('show_comparison_results.json', encoding='utf-8') as f:
    comparison = json.load(f)

# Load StreamVault data
with open('data/streamvault-data.json', encoding='utf-8') as f:
    streamvault = json.load(f)

# Load extracted data
with open('english-seasons_non_drive_category.json', encoding='utf-8') as f:
    extracted = json.load(f)

PLACEHOLDER_IDS = ['1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd', 'PLACEHOLDER']

print("=" * 80)
print("CHECKING EXISTING SHOWS FOR VIDEO LINKS")
print("=" * 80)

shows_with_links = []
shows_with_placeholders = []
shows_no_episodes = []

for match in comparison['matches']:
    show_id = match['id']
    show_name = match['streamvault']
    extracted_name = match['extracted']
    
    # Get episodes for this show
    episodes = [ep for ep in streamvault['episodes'] if ep['showId'] == show_id]
    
    if not episodes:
        shows_no_episodes.append({
            'name': show_name,
            'extracted_name': extracted_name,
            'id': show_id
        })
        continue
    
    # Check if episodes have placeholder links
    has_real_links = False
    has_placeholders = False
    
    for ep in episodes:
        video_url = ep.get('videoUrl') or ep.get('googleDriveUrl', '')
        
        if video_url:
            # Check if it's a placeholder
            if any(placeholder in video_url for placeholder in PLACEHOLDER_IDS):
                has_placeholders = True
            else:
                has_real_links = True
        else:
            has_placeholders = True
    
    # Get extracted episode count
    extracted_episodes = sum(len(eps) for eps in extracted[extracted_name].values())
    
    if has_real_links and not has_placeholders:
        shows_with_links.append({
            'name': show_name,
            'extracted_name': extracted_name,
            'id': show_id,
            'streamvault_episodes': len(episodes),
            'extracted_episodes': extracted_episodes
        })
    else:
        shows_with_placeholders.append({
            'name': show_name,
            'extracted_name': extracted_name,
            'id': show_id,
            'streamvault_episodes': len(episodes),
            'extracted_episodes': extracted_episodes,
            'has_some_real': has_real_links,
            'has_some_placeholders': has_placeholders
        })

print(f"\n✅ Shows with REAL video links: {len(shows_with_links)}")
print(f"⚠️  Shows with PLACEHOLDER links: {len(shows_with_placeholders)}")
print(f"❌ Shows with NO episodes in DB: {len(shows_no_episodes)}")

if shows_with_links:
    print(f"\n{'='*80}")
    print("✅ SHOWS WITH REAL VIDEO LINKS (Already have content):")
    print("=" * 80)
    for show in shows_with_links:
        print(f"\n  ✓ {show['name']}")
        print(f"    StreamVault: {show['streamvault_episodes']} episodes")
        print(f"    Extracted: {show['extracted_episodes']} episodes")
        if show['extracted_episodes'] > show['streamvault_episodes']:
            print(f"    💡 Can add {show['extracted_episodes'] - show['streamvault_episodes']} more episodes!")

if shows_with_placeholders:
    print(f"\n{'='*80}")
    print("⚠️  SHOWS WITH PLACEHOLDER LINKS (Need video links):")
    print("=" * 80)
    for show in shows_with_placeholders:
        print(f"\n  • {show['name']}")
        print(f"    StreamVault: {show['streamvault_episodes']} episodes (placeholders)")
        print(f"    Extracted: {show['extracted_episodes']} episodes (with real links)")
        print(f"    💡 Can replace placeholders with real links!")

if shows_no_episodes:
    print(f"\n{'='*80}")
    print("❌ SHOWS WITH NO EPISODES IN DATABASE:")
    print("=" * 80)
    for show in shows_no_episodes:
        extracted_episodes = sum(len(eps) for eps in extracted[show['extracted_name']].values())
        print(f"\n  • {show['name']}")
        print(f"    Extracted: {extracted_episodes} episodes available")

# Save detailed results
detailed_results = {
    'shows_with_links': shows_with_links,
    'shows_with_placeholders': shows_with_placeholders,
    'shows_no_episodes': shows_no_episodes,
    'summary': {
        'with_real_links': len(shows_with_links),
        'with_placeholders': len(shows_with_placeholders),
        'no_episodes': len(shows_no_episodes)
    }
}

with open('existing_shows_link_status.json', 'w', encoding='utf-8') as f:
    json.dump(detailed_results, f, indent=2, ensure_ascii=False)

print(f"\n{'='*80}")
print("💾 Detailed results saved to: existing_shows_link_status.json")
print("=" * 80)
