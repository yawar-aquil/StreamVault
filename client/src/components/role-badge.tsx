import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function RoleBadge({ role }: { role?: "admin" | "moderator" | null | boolean }) {
  if (role === "admin" || role === true) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="ml-1.5 flex items-center justify-center cursor-help" style={{ width: '18px', height: '18px' }} title="Admin">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-full h-full drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                <defs>
                  <linearGradient id="adminGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </linearGradient>
                  <filter id="adminGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path fill="url(#adminGrad)" filter="url(#adminGlow)" d="M256 32l192 64v128c0 106-96 256-192 256C160 480 64 330 64 224V96l192-64z"/>
                <path fill="#ffffff" opacity="0.9" d="M256 80l144 48v80c0 80-72 192-144 192C184 400 112 288 112 208v-80l144-48z"/>
                <path fill="#ef4444" d="M256 120l104 35v53c0 53-52 128-104 128-52 0-104-75-104-128v-53l104-35z"/>
                <path fill="#ffffff" d="M256 150c22.1 0 40 17.9 40 40 0 16.6-10.1 30.8-24.5 36.9L288 280h-64l16.5-53.1C226.1 220.8 216 206.6 216 190c0-22.1 17.9-40 40-40z"/>
              </svg>
            </div>
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
            <div className="ml-1.5 flex items-center justify-center cursor-help" style={{ width: '18px', height: '18px' }} title="Moderator">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-full h-full drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]">
                <defs>
                  <linearGradient id="modGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                </defs>
                <path fill="url(#modGrad)" d="M256 32L64 96v128c0 106 96 256 192 256s192-150 192-256V96L256 32z"/>
                <path fill="#ffffff" opacity="0.9" d="M256 80L112 128v80c0 80 72 192 144 192s144-112 144-192v-80L256 80z"/>
                <path fill="#3b82f6" d="M256 120L152 155v53c0 53 52 128 104 128s104-75 104-128v-53L256 120z"/>
                <path fill="#ffffff" d="M336 216l-120 120-64-64 24-24 40 40 96-96 24 24z"/>
              </svg>
            </div>
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
