// Per-user AI memory. Each user gets a markdown file at data/ai-memory/<userId>.md
// that Vault AI reads before replying and updates after each conversation, so it
// remembers their interests/personality across sessions. Admins can read these.

import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, statSync } from "fs";
import path from "path";

const MEMORY_DIR = path.join(process.cwd(), "data", "ai-memory");

function ensureDir() {
  if (!existsSync(MEMORY_DIR)) mkdirSync(MEMORY_DIR, { recursive: true });
}

function safeId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function fileFor(userId: string): string {
  return path.join(MEMORY_DIR, `${safeId(userId)}.md`);
}

export function readMemory(userId: string): string {
  try {
    const f = fileFor(userId);
    if (!existsSync(f)) return "";
    return readFileSync(f, "utf-8");
  } catch {
    return "";
  }
}

export function writeMemory(userId: string, content: string): void {
  try {
    ensureDir();
    writeFileSync(fileFor(userId), content, "utf-8");
  } catch (e) {
    console.error("Failed to write AI memory:", e);
  }
}

export interface MemoryFileInfo {
  userId: string;
  size: number;
  updatedAt: string;
}

// Admin: list all memory files with metadata.
export function listMemories(): MemoryFileInfo[] {
  try {
    if (!existsSync(MEMORY_DIR)) return [];
    return readdirSync(MEMORY_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const full = path.join(MEMORY_DIR, f);
        const st = statSync(full);
        return {
          userId: f.replace(/\.md$/, ""),
          size: st.size,
          updatedAt: st.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function getMemoryByUserId(userId: string): string {
  return readMemory(userId);
}
