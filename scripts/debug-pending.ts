
import { storage } from "../server/storage";
import { searchShow, getShowDetails } from "../server/utils/tmdb";

async function debugPendingContent() {
    console.log("Starting debug...");

    try {
        const shows = await storage.getShows();
        console.log(`Loaded ${shows.length} shows.`);

        const animeList = await storage.getAnime();
        console.log(`Loaded ${animeList.length} anime.`);

        // Test with just one show to avoid spam
        if (shows.length > 0) {
            const show = shows[0];
            console.log(`Testing with show: ${show.title} (ID: ${show.id})`);

            const episodes = await storage.getEpisodesByShowId(show.id);
            console.log(`Local episodes: ${episodes.length}`);

            console.log("Searching TMDB...");
            const tmdbId = await searchShow(show.title);
            console.log(`TMDB ID: ${tmdbId}`);

            if (tmdbId) {
                console.log("Fetching details...");
                const tmdbDetails = await getShowDetails(tmdbId);
                console.log(`TMDB Details: Episodes=${tmdbDetails?.number_of_episodes}, Seasons=${tmdbDetails?.number_of_seasons}`);

                if (tmdbDetails) {
                    console.log("Comparison logic would run here.");
                }
            } else {
                console.log("TMDB ID not found or search failed.");
            }
        }

        console.log("Debug complete.");
    } catch (error) {
        console.error("DEBUG ERROR:", error);
    }
}

debugPendingContent();
