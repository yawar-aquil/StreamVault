import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function RoleBadge({ role }: { role?: "admin" | "moderator" | null | boolean }) {
  if (role === "admin" || role === true) { // Handling true as admin if used generically, though we prefer strings
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="ml-2 bg-red-500 text-white hover:bg-red-600 border-0 text-[10px] px-1.5 py-0 h-4 font-bold shadow-[0_0_8px_rgba(239,68,68,0.5)] cursor-help">
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
            <Badge className="ml-2 bg-red-500 text-white hover:bg-red-600 border-0 text-[10px] px-1.5 py-0 h-4 font-bold shadow-[0_0_8px_rgba(239,68,68,0.5)] cursor-help">
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
