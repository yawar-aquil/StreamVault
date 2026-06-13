// Centralized role-flag helpers so admin/moderator status is serialized
// consistently everywhere user data is returned to the frontend.
//
// Both admin and moderator status come from real DB columns (`isAdmin`,
// `isModerator`). Admin is NEVER inferred from a username at runtime — that
// would let anyone who registers a given name gain admin powers. The
// `isAdminUsername` helper below is used ONLY for the one-time bootstrap that
// grants the very first admin (the configured ADMIN_USERNAME) the flag.

export function isAdminUsername(username?: string | null): boolean {
  if (!username) return false;
  return username.toLowerCase() === (process.env.ADMIN_USERNAME || "admin").toLowerCase();
}

export interface RoleFlags {
  isAdmin: boolean;
  isModerator: boolean;
}

// Returns { isAdmin, isModerator } for a user-like object. Safe to spread into
// any serialized user payload: `{ ...getRoleFlags(user) }`. Reads the DB
// columns only — no username inference.
export function getRoleFlags(
  user?: { isAdmin?: boolean | null; isModerator?: boolean | null } | null,
): RoleFlags {
  return {
    isAdmin: !!user?.isAdmin,
    isModerator: !!user?.isModerator,
  };
}
