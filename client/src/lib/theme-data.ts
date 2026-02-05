// Map Badge Names to Theme IDs (CSS classes) [Force Update]
// "Theme" suffixes map to simple versions, "Skin" suffixes map to animated versions
export const THEME_MAPPING: Record<string, string> = {
    "Midnight Theme": "midnight",
    "Ocean Theme": "ocean",
    "Sunset Theme": "sunset",
    "Forest Theme": "forest",
    "Cyberpunk Theme": "cyberpunk",

    // Neon Split
    "Neon Theme": "neon-theme", // Simple
    "Neon Skin": "neon",        // Animated (Legacy ID)

    // Gold Split
    "Gold Skin": "gold",        // Animated (Legacy ID)

    // Valentines
    "Valentines Skin": "valentines",

    // Galaxy
    "Galaxy Skin": "galaxy",

    // New Premium Skins
    "Glitch Skin": "glitch",
    "Retro Skin": "retro",
    "Crystal Skin": "crystal",
    "Anime Skin": "anime",
    "Wanted Skin": "wanted",

    // App-Wide Themes
    "Vaporwave Theme": "vaporwave",
    "OLED Theme": "oled",
    "Nord Theme": "nord",
    "Golden Theme": "golden",
};

// Start of Display List for Settings Page
export const DISPLAY_THEMES = [
    { name: "Midnight Theme", id: "midnight" },
    { name: "Ocean Theme", id: "ocean" },
    { name: "Sunset Theme", id: "sunset" },
    { name: "Forest Theme", id: "forest" },
    { name: "Neon Theme", id: "neon-theme" },
    { name: "Cyberpunk Theme", id: "cyberpunk" },
    { name: "Vaporwave Theme", id: "vaporwave" },
    { name: "OLED Theme", id: "oled" },
    { name: "Nord Theme", id: "nord" },
    { name: "Golden Theme", id: "golden" },
];

// Map Theme IDs to Screenshots
export const THEME_PREVIEWS: Record<string, string> = {
    "midnight": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80", // Dark purplish night
    "ocean": "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80", // Ocean
    "sunset": "https://images.unsplash.com/photo-1472120435266-53107fd0c44a?w=800&q=80", // Sunset
    "forest": "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&q=80", // Better Forest image
    "neon": "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80", // Neon Skin (Animated)
    "neon-theme": "https://images.unsplash.com/photo-1582233479366-6d38bc390a08?w=800&q=80", // Neon Simple (Distinct)
    "cyberpunk": "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800&q=80", // Cyberpunk
    "gold": "https://images.unsplash.com/photo-1610375461490-6d615d374753?w=800&q=80", // Gold Skin
    "gold-theme": "https://images.unsplash.com/photo-1605100804763-ebea2407a8cf?w=800&q=80", // Gold Simple (Distinct)
    "valentines": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80", // Valentines Hearts
    "galaxy": "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80", // Galaxy/Nebula
    "glitch": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80", // Cyberpunk/Glitch
    "retro": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80", // Retro/Synthwave
    "crystal": "https://images.unsplash.com/photo-1517482432451-24dbf77c858b?w=800&q=80", // Glass/Crystal
    "anime": "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80", // Sakura/Anime
    "wanted": "https://images.unsplash.com/photo-1587588354456-ae2182590a6b?w=800&q=80", // Old Paper/Texture
    "vaporwave": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&q=80", // Vaporwave/Pastel
    "oled": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80", // True Black / AMOLED
    "nord": "https://images.unsplash.com/photo-1483366774589-a03971054dd8?w=800&q=80", // Cool Grey/Snow
    "golden": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80", // Golden Hour/Sunset
};
