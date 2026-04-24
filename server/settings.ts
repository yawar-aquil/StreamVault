import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export interface SiteSettings {
    devToolsProtection: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
    devToolsProtection: true,
};

const CONFIG_FILE = join(process.cwd(), "server", "data", "settings.json");

let currentSettings: SiteSettings = { ...DEFAULT_SETTINGS };

function persist() {
    try {
        const dir = dirname(CONFIG_FILE);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(CONFIG_FILE, JSON.stringify(currentSettings, null, 2));
    } catch (err) {
        console.error("Failed to persist site settings:", err);
    }
}

function load() {
    try {
        if (!existsSync(CONFIG_FILE)) return;
        const raw = readFileSync(CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } catch (err) {
        console.error("Failed to load site settings, using default:", err);
    }
}

load();

export function getSiteSettings(): SiteSettings {
    return { ...currentSettings };
}

export function updateSiteSettings(newSettings: Partial<SiteSettings>): SiteSettings {
    currentSettings = { ...currentSettings, ...newSettings };
    persist();
    return currentSettings;
}
