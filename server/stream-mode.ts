import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

/**
 * Runtime-configurable streaming mode. The admin can flip between these via
 * the admin panel, and the change takes effect instantly (no redeploy).
 *
 *  - "direct":     client fetches video URLs straight from archive.org.
 *                  Free, but slow from India. The /api/stream proxy is disabled.
 *  - "vps":        client routes archive.org URLs through /api/stream on our
 *                  Mumbai VPS. Fastest path; uses VPS egress bandwidth.
 *                  Cache-Control is set to "private, no-store" so Cloudflare
 *                  does NOT cache; every viewer round-trips through the VPS.
 *  - "vps-cached": same as "vps" but with aggressive Cache-Control so
 *                  Cloudflare caches chunks at its edge. First viewer pays VPS
 *                  egress; subsequent viewers served from CF for free.
 *
 * The two proxied modes are only served to authenticated users; anonymous
 * visitors always get direct (enforced on the /api/stream endpoint).
 */
export type StreamMode = "direct" | "vps" | "vps-cached";

const VALID_MODES: StreamMode[] = ["direct", "vps", "vps-cached"];

const CONFIG_FILE = join(process.cwd(), "server", "data", "stream-mode.json");

let currentMode: StreamMode = "direct";

function persist() {
    try {
        const dir = dirname(CONFIG_FILE);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(CONFIG_FILE, JSON.stringify({ mode: currentMode }, null, 2));
    } catch (err) {
        console.error("Failed to persist stream mode:", err);
    }
}

function load() {
    try {
        if (!existsSync(CONFIG_FILE)) return;
        const raw = readFileSync(CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (VALID_MODES.includes(parsed?.mode)) {
            currentMode = parsed.mode;
        }
    } catch (err) {
        console.error("Failed to load stream mode, using default:", err);
    }
}

load();

export function getStreamMode(): StreamMode {
    return currentMode;
}

export function setStreamMode(mode: StreamMode): StreamMode {
    if (!VALID_MODES.includes(mode)) {
        throw new Error(`Invalid stream mode: ${mode}`);
    }
    currentMode = mode;
    persist();
    return currentMode;
}

export function isValidStreamMode(mode: unknown): mode is StreamMode {
    return typeof mode === "string" && VALID_MODES.includes(mode as StreamMode);
}
