



// Remove top-level constant to ensure we read env vars after dotenv config
const BASE_URL = "https://api.themoviedb.org/3";

interface TMDBShow {
    id: number;
    name: string;
    number_of_episodes: number;
    number_of_seasons: number;
    seasons: {
        season_number: number;
        episode_count: number;
        air_date: string;
    }[];
    status: string;
}

interface TMDBAnime {
    id: number;
    name: string;
    number_of_episodes: number;
    number_of_seasons: number;
    seasons: {
        season_number: number;
        episode_count: number;
        air_date: string;
    }[];
    status: string;
}

function getApiKey() {
    return process.env.TMDB_API_KEY;
}

export async function searchShow(title: string): Promise<number | null> {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.error("TMDB_API_KEY is not set");
        return null;
    }

    try {
        const url = `${BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(title)}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`TMDB Search Error: ${res.status} ${res.statusText}`);
            return null;
        }

        const data: any = await res.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].id;
        }
        return null;
    } catch (error) {
        console.error("TMDB Search Error:", error);
        return null;
    }
}

export async function getShowDetails(tmdbId: number): Promise<TMDBShow | null> {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.error("TMDB_API_KEY is not set");
        return null;
    }

    try {
        const url = `${BASE_URL}/tv/${tmdbId}?api_key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`TMDB Details Error: ${res.status} ${res.statusText}`);
            return null;
        }

        const data: any = await res.json();
        return {
            id: data.id,
            name: data.name,
            number_of_episodes: data.number_of_episodes,
            number_of_seasons: data.number_of_seasons,
            seasons: data.seasons,
            status: data.status
        };
    } catch (error) {
        console.error("TMDB Details Error:", error);
        return null;
    }
}

// Re-using same logic for Anime since TMDB treats them as TV shows usually
export const searchAnime = searchShow;
export const getAnimeDetails = getShowDetails;
