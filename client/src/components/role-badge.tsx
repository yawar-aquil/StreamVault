import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Derive the role purely from the real DB flags sent by the backend.
// Admin is NEVER inferred from the username — `isAdmin` is an authoritative flag.
export function getUserRole(
  user?: { isAdmin?: boolean | null; isModerator?: boolean | null } | null,
): "admin" | "moderator" | null {
  if (!user) return null;
  if (user.isAdmin) return "admin";
  if (user.isModerator) return "moderator";
  return null;
}

export function RoleBadge({ role }: { role?: "admin" | "moderator" | null | boolean }) {
  if (role === "admin" || role === true) { // Handling true as admin if used generically, though we prefer strings
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="ml-1 bg-red-500 text-white hover:bg-red-600 border-0 text-[10px] px-1.5 py-0 h-4 font-bold shadow-[0_0_8px_rgba(239,68,68,0.5)] cursor-help">
              ADMIN
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Site Administrator</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (role === "moderator") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="ml-1 bg-red-500 text-white hover:bg-red-600 border-0 text-[10px] px-1.5 py-0 h-4 font-bold shadow-[0_0_8px_rgba(239,68,68,0.5)] cursor-help">
              MOD
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Community Moderator</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}
