// Maps an admin API request to a human-readable audit-log entry.
// Used by the automatic moderator audit-logging middleware so that EVERY
// privileged mutation is recorded consistently, without hand-instrumenting
// each route.

export interface AuditDescriptor {
  action: string;
  category: string; // 'content' | 'user' | 'moderation' | 'store' | 'settings' | 'security' | 'other'
  targetType: string | null;
}

const VERB: Record<string, string> = {
  POST: "Created",
  PUT: "Updated",
  PATCH: "Updated",
  DELETE: "Deleted",
};

// Singular, human label for a path resource segment.
const RESOURCE_LABEL: Record<string, { label: string; category: string }> = {
  shows: { label: "show", category: "content" },
  movies: { label: "movie", category: "content" },
  anime: { label: "anime", category: "content" },
  "anime-episodes": { label: "anime episode", category: "content" },
  episodes: { label: "episode", category: "content" },
  blog: { label: "blog post", category: "content" },
  reviews: { label: "review", category: "moderation" },
  comments: { label: "comment", category: "moderation" },
  polls: { label: "poll", category: "content" },
  challenges: { label: "challenge", category: "content" },
  badges: { label: "badge", category: "store" },
  users: { label: "user", category: "user" },
  moderators: { label: "moderator", category: "user" },
  admins: { label: "admin", category: "user" },
  settings: { label: "settings", category: "settings" },
  "stream-mode": { label: "stream mode", category: "settings" },
  security: { label: "security setting", category: "security" },
  broadcast: { label: "broadcast", category: "settings" },
};

// Specific sub-actions keyed by "resource/subpath".
const SPECIAL: Record<string, AuditDescriptor> = {
  "badges/award": { action: "Awarded badge", category: "store", targetType: "badge" },
  "badges/revoke": { action: "Revoked badge", category: "store", targetType: "badge" },
  "moderators/promote": { action: "Promoted user to moderator", category: "user", targetType: "user" },
  "moderators/demote": { action: "Demoted moderator", category: "user", targetType: "user" },
  "admins/promote": { action: "Granted admin access", category: "user", targetType: "user" },
  "admins/demote": { action: "Revoked admin access", category: "user", targetType: "user" },
  "users/gift": { action: "Gifted item/coins to user", category: "store", targetType: "user" },
};

// `pathAfterPrefix` is the request path with the leading "/api/admin/" removed,
// e.g. "shows/abc123" or "moderators/promote".
export function describeAdminAction(method: string, pathAfterPrefix: string): AuditDescriptor {
  const clean = pathAfterPrefix.replace(/^\/+|\/+$/g, "");
  const segments = clean.split("/").filter(Boolean);
  const resource = segments[0] || "";
  const sub = segments[1] || "";

  // Exact special sub-action match (ignores trailing ids)
  const specialKey = `${resource}/${sub}`;
  if (SPECIAL[specialKey]) return SPECIAL[specialKey];

  const info = RESOURCE_LABEL[resource];
  const verb = VERB[method] || method;

  if (info) {
    return {
      action: `${verb} ${info.label}`,
      category: info.category,
      targetType: info.label,
    };
  }

  // Fallback: use the resource name as-is
  return {
    action: `${verb} ${resource || "resource"}`.trim(),
    category: "other",
    targetType: resource || null,
  };
}

// Pull a meaningful target id out of the path / request body.
export function extractTargetId(pathAfterPrefix: string, body: any): string | null {
  const segments = pathAfterPrefix.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  const subActions = new Set(["promote", "demote", "award", "revoke", "gift", "all", "search", "bulk"]);
  if (segments.length >= 2 && last && !subActions.has(last)) return last;
  if (body && typeof body === "object") {
    return body.userId || body.id || body.badgeId || body.showId || body.movieId || body.animeId || null;
  }
  return null;
}

// Build a short human detail string from a response/request payload.
export function describeTarget(body: any): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, any>;
  if (b.title) return String(b.title);
  if (b.name) return String(b.name);
  if (b.username) return String(b.username);
  if (Array.isArray(b.receiverUsernames)) return b.receiverUsernames.join(", ");
  return null;
}
