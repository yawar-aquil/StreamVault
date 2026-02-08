import json

# Load extracted shows
with open('english-seasons_non_drive_category.json', encoding='utf-8') as f:
    extracted = json.load(f)

# Load StreamVault data
with open('data/streamvault-data.json', encoding='utf-8') as f:
    streamvault = json.load(f)

# Create sets for comparison
extracted_shows = list(extracted.keys())
streamvault_shows = {s['title'].lower().strip(): s for s in streamvault['shows']}

# Find matches
matches = []
new_shows = []

for show in extracted_shows:
    show_lower = show.lower().strip()
    # Try exact match
    if show_lower in streamvault_shows:
        matches.append({
            'extracted': show,
            'streamvault': streamvault_shows[show_lower]['title'],
            'id': streamvault_shows[show_lower]['id']
        })
    else:
        # Try partial match (remove common suffixes)
        show_clean = show_lower.replace(' tv series', '').replace(' online english dubbed', '').replace(' online english', '').strip()
        match_found = False
        for sv_title_lower, sv_show in streamvault_shows.items():
            sv_clean = sv_title_lower.replace(' tv series', '').replace(' online english dubbed', '').replace(' online english', '').strip()
            if show_clean == sv_clean or show_clean in sv_clean or sv_clean in show_clean:
                matches.append({
                    'extracted': show,
                    'streamvault': sv_show['title'],
                    'id': sv_show['id']
                })
                match_found = True
                break
        
        if not match_found:
            new_shows.append(show)

print(f"📊 COMPARISON RESULTS")
print("=" * 80)
print(f"Total extracted shows: {len(extracted_shows)}")
print(f"Total StreamVault shows: {len(streamvault_shows)}")
print(f"\n✅ Shows already in StreamVault: {len(matches)}")
print(f"🆕 New shows (not in StreamVault): {len(new_shows)}")

if matches:
    print(f"\n{'='*80}")
    print("✅ SHOWS ALREADY IN STREAMVAULT:")
    print("=" * 80)
    for m in matches:
        print(f"  ✓ {m['extracted']}")
        print(f"    → StreamVault: {m['streamvault']} (ID: {m['id']})")

if new_shows:
    print(f"\n{'='*80}")
    print("🆕 NEW SHOWS (Not in StreamVault):")
    print("=" * 80)
    for show in new_shows:
        episodes_count = sum(len(eps) for eps in extracted[show].values())
        seasons_count = len(extracted[show])
        print(f"  • {show}")
        print(f"    → {episodes_count} episodes across {seasons_count} season(s)")

# Save results
results = {
    'matches': matches,
    'new_shows': new_shows,
    'summary': {
        'total_extracted': len(extracted_shows),
        'already_in_streamvault': len(matches),
        'new_shows': len(new_shows)
    }
}

with open('show_comparison_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"\n💾 Results saved to: show_comparison_results.json")
