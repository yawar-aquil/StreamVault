
import { storage } from "./storage";
import { User } from "@shared/schema";

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: "onboarding" | "viewing" | "genre" | "social" | "time" | "progression" | "secret";
    condition: (user: User, additionalData?: any) => boolean | Promise<boolean>;
}

export const ACHIEVEMENTS: Achievement[] = [
    // --- Onboarding (The Basics) ---
    { id: "new-comer", name: "New Comer", description: "Create your account", icon: "user-plus", category: "onboarding", condition: () => true }, // Always true for registered users
    { id: "bio-hazard", name: "Bio-hazed", description: "Update your bio", icon: "file-text", category: "onboarding", condition: (user) => !!user.bio && user.bio.length > 5 },
    { id: "identity-crisis", name: "Identity Crisis", description: "Upload an avatar", icon: "image", category: "onboarding", condition: (user) => !!user.avatarUrl },

    // --- Progression (Levels) ---
    { id: "level-2", name: "Novice", description: "Reach Level 2", icon: "chevrons-up", category: "progression", condition: (user) => (user.level || 1) >= 2 },
    { id: "level-5", name: "Apprentice", description: "Reach Level 5", icon: "star", category: "progression", condition: (user) => (user.level || 1) >= 5 },
    { id: "level-10", name: "Expert", description: "Reach Level 10", icon: "shield", category: "progression", condition: (user) => (user.level || 1) >= 10 },
    { id: "level-20", name: "Master", description: "Reach Level 20", icon: "crown", category: "progression", condition: (user) => (user.level || 1) >= 20 },
    { id: "level-50", name: "Legend", description: "Reach Level 50", icon: "award", category: "progression", condition: (user) => (user.level || 1) >= 50 },
    { id: "level-100", name: "Mythic", description: "Reach Level 100", icon: "zap", category: "progression", condition: (user) => (user.level || 1) >= 100 },

    // --- XP Milestones ---
    { id: "xp-1k", name: "Getting Started", description: "Earn 1,000 XP", icon: "battery-charging", category: "progression", condition: (user) => (user.xp || 0) >= 1000 },
    { id: "xp-10k", name: "Dedicated", description: "Earn 10,000 XP", icon: "battery-full", category: "progression", condition: (user) => (user.xp || 0) >= 10000 },
    { id: "xp-50k", name: "Streamaholic", description: "Earn 50,000 XP", icon: "flame", category: "progression", condition: (user) => (user.xp || 0) >= 50000 },
    { id: "xp-100k", name: "Vault Keeper", description: "Earn 100,000 XP", icon: "gem", category: "progression", condition: (user) => (user.xp || 0) >= 100000 },
    { id: "xp-500k", name: "XP Millionaire", description: "Earn 500,000 XP", icon: "diamond", category: "progression", condition: (user) => (user.xp || 0) >= 500000 },

    // --- Viewer Milestones (Movies) ---
    { id: "movie-1", name: "Popcorn Ready", description: "Watch your first movie", icon: "ticket", category: "viewing", condition: async (user) => (await countContent(user.id, "movie")) >= 1 },
    { id: "movie-10", name: "Movie Buff", description: "Watch 10 Movies", icon: "film", category: "viewing", condition: async (user) => (await countContent(user.id, "movie")) >= 10 },
    { id: "movie-25", name: "Cinephile", description: "Watch 25 Movies", icon: "clapperboard", category: "viewing", condition: async (user) => (await countContent(user.id, "movie")) >= 25 },
    { id: "movie-50", name: "Cinema God", description: "Watch 50 Movies", icon: "video", category: "viewing", condition: async (user) => (await countContent(user.id, "movie")) >= 50 },
    { id: "movie-100", name: "Film Historian", description: "Watch 100 Movies", icon: "roll", category: "viewing", condition: async (user) => (await countContent(user.id, "movie")) >= 100 },

    // --- Viewer Milestones (Episodes) ---
    { id: "episode-1", name: "Pilot", description: "Watch your first episode", icon: "play-circle", category: "viewing", condition: async (user) => (await countContent(user.id, "episode")) >= 1 },
    { id: "episode-10", name: "Binge Watcher", description: "Watch 10 Episodes", icon: "tv", category: "viewing", condition: async (user) => (await countContent(user.id, "episode")) >= 10 },
    { id: "episode-50", name: "Marathon Runner", description: "Watch 50 Episodes", icon: "repeat", category: "viewing", condition: async (user) => (await countContent(user.id, "episode")) >= 50 },
    { id: "episode-100", name: "Series Addict", description: "Watch 100 Episodes", icon: "layers", category: "viewing", condition: async (user) => (await countContent(user.id, "episode")) >= 100 },
    { id: "episode-500", name: "Couch Potato", description: "Watch 500 Episodes", icon: "sofa", category: "viewing", condition: async (user) => (await countContent(user.id, "episode")) >= 500 },

    // --- Genre Specialist ---
    { id: "genre-horror-5", name: "Scream King", description: "Watch 5 Horror movies", icon: "ghost", category: "genre", condition: async (user) => (await countGenre(user.id, "horror", "movie")) >= 5 },
    { id: "genre-horror-20", name: "Nightmare Fuel", description: "Watch 20 Horror movies", icon: "skull", category: "genre", condition: async (user) => (await countGenre(user.id, "horror", "movie")) >= 20 },

    { id: "genre-comedy-5", name: "Laugh Track", description: "Watch 5 Comedy movies", icon: "laugh", category: "genre", condition: async (user) => (await countGenre(user.id, "comedy", "movie")) >= 5 },
    { id: "genre-comedy-20", name: "Comedian", description: "Watch 20 Comedy movies", icon: "smile", category: "genre", condition: async (user) => (await countGenre(user.id, "comedy", "movie")) >= 20 },

    { id: "genre-action-10", name: "Adrenaline Junkie", description: "Watch 10 Action movies", icon: "sword", category: "genre", condition: async (user) => (await countGenre(user.id, "action", "movie")) >= 10 },
    { id: "genre-action-50", name: "Action Hero", description: "Watch 50 Action movies", icon: "crosshair", category: "genre", condition: async (user) => (await countGenre(user.id, "action", "movie")) >= 50 },

    { id: "genre-romance-5", name: "Hopeless Romantic", description: "Watch 5 Romance movies", icon: "heart", category: "genre", condition: async (user) => (await countGenre(user.id, "romance", "movie")) >= 5 },
    { id: "genre-scifi-5", name: "Time Traveler", description: "Watch 5 Sci-Fi movies", icon: "rocket", category: "genre", condition: async (user) => (await countGenre(user.id, "sci-fi", "movie")) >= 5 },

    { id: "genre-anime-10", name: "Otaku", description: "Watch 10 Anime series", icon: "japanese-yen", category: "genre", condition: async (user) => (await countGenre(user.id, "", "anime")) >= 10 },
    { id: "genre-anime-50", name: "Weeb Lord", description: "Watch 50 Anime series", icon: "scroll", category: "genre", condition: async (user) => (await countGenre(user.id, "", "anime")) >= 50 },

    // --- Time & Habits ---
    { id: "early-bird", name: "Early Bird", description: "Watch something between 5-8 AM", icon: "sunrise", category: "time", condition: async (user) => checkTimeHabit(user.id, 5, 8) },
    { id: "night-owl", name: "Night Owl", description: "Watch something between 2-5 AM", icon: "moon", category: "time", condition: async (user) => checkTimeHabit(user.id, 2, 5) },
    { id: "lunch-break", name: "Lunch Break", description: "Watch something between 12-1 PM", icon: "coffee", category: "time", condition: async (user) => checkTimeHabit(user.id, 12, 13) },

    // --- Social ---
    { id: "social-1", name: "First Friend", description: "Add 1 Friend", icon: "user-plus", category: "social", condition: async (user) => (await storage.getFriends(user.id)).length >= 1 },
    { id: "social-5", name: "Social Butterfly", description: "Add 5 Friends", icon: "users", category: "social", condition: async (user) => (await storage.getFriends(user.id)).length >= 5 },
    { id: "social-10", name: "Popular", description: "Add 10 Friends", icon: "star", category: "social", condition: async (user) => (await storage.getFriends(user.id)).length >= 10 },
    { id: "social-25", name: "Influencer", description: "Add 25 Friends", icon: "globe", category: "social", condition: async (user) => (await storage.getFriends(user.id)).length >= 25 },
];

// --- Helpers ---

async function countGenre(userId: string, genre: string, type: "movie" | "show" | "anime"): Promise<number> {
    const progress = await storage.getViewingProgress(`user:${userId}`);
    let count = 0;
    for (const entry of progress) {
        if ((entry.progress / entry.duration) > 0.9) {
            let matches = false;

            if (type === "movie" && entry.movieId) {
                const m = await storage.getMovieById(entry.movieId);
                // Simple case-insensitive includes check
                if (m && (!genre || (m.genres && m.genres.toLowerCase().includes(genre)))) matches = true;
            } else if (type === "anime" && entry.animeId) {
                const a = await storage.getAnimeById(entry.animeId);
                if (a && (!genre || (a.genres && a.genres.toLowerCase().includes(genre)))) matches = true;
            }

            if (matches) count++;
        }
    }
    return count;
}

async function countContent(userId: string, type: "episode" | "movie"): Promise<number> {
    const progress = await storage.getViewingProgress(`user:${userId}`);
    let count = 0;
    for (const entry of progress) {
        if ((entry.progress / entry.duration) > 0.9) {
            if (type === "episode" && (entry.episodeId || entry.showId)) count++;
            else if (type === "movie" && entry.movieId) count++;
        }
    }
    return count;
}

async function checkTimeHabit(userId: string, startHour: number, endHour: number): Promise<boolean> {
    const progress = await storage.getViewingProgress(`user:${userId}`);
    return progress.some(p => {
        const hour = new Date(p.lastWatched).getHours();
        return hour >= startHour && hour < endHour;
    });
}

// Main Checker Function
export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
    const user = await storage.getUserById(userId);
    if (!user) return [];

    const earnedBadges: string[] = [];

    // Get existing badges from user json to save DB queries
    let existingBadges: any[] = [];
    try {
        existingBadges = user.badges ? JSON.parse(user.badges) : [];
    } catch (e) { existingBadges = []; }

    const existingBadgeIds = new Set(existingBadges.map((b: any) => b.id));

    // console.log(`[Achievements] Checking for user ${userId}. Existing: ${existingBadgeIds.size}`);

    for (const achievement of ACHIEVEMENTS) {
        if (existingBadgeIds.has(achievement.id)) continue;

        try {
            const metCondition = await achievement.condition(user);
            if (metCondition) {
                console.log(`[Achievements] Unlocked: ${achievement.name} for user ${userId}`);

                // Add badge
                await storage.addBadge(userId, {
                    id: achievement.id,
                    name: achievement.name,
                    description: achievement.description,
                    icon: achievement.icon,
                    earnedAt: new Date().toISOString()
                });

                // Notification
                await storage.createNotification({
                    userId: userId,
                    type: 'achievement',
                    title: 'Achievement Unlocked! 🏆',
                    message: `You earned the "${achievement.name}" badge!`,
                    data: {
                        achievementId: achievement.id,
                        name: achievement.name,
                        description: achievement.description,
                        icon: achievement.icon
                    },
                    read: false,
                });

                earnedBadges.push(achievement.name);
            }
        } catch (err) {
            console.error(`Error checking achievement ${achievement.id}:`, err);
        }
    }

    return earnedBadges;
}
