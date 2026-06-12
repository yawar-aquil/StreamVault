import { Badge } from "@/components/ui/badge";

export function RoleBadge({ role }: { role?: "admin" | "moderator" | null | boolean }) {
  if (role === "admin" || role === true) { // Handling true as admin if used generically, though we prefer strings
    return (
      <Badge className="ml-2 bg-yellow-500 text-black hover:bg-yellow-600 border-0 text-[10px] px-1.5 py-0 h-4 font-bold shadow-[0_0_8px_rgba(234,179,8,0.5)]">
        ADMIN
      </Badge>
    );
  }
  
  if (role === "moderator") {
    return (
      <Badge className="ml-2 bg-blue-500 text-white hover:bg-blue-600 border-0 text-[10px] px-1.5 py-0 h-4 font-bold shadow-[0_0_8px_rgba(59,130,246,0.5)]">
        MOD
      </Badge>
    );
  }

  return null;
}
