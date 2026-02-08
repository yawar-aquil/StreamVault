// Session ID management for API calls
export function getSessionId(): string {
  let sessionId = localStorage.getItem("streamvault-session-id");
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("streamvault-session-id", sessionId);
  }
  return sessionId;
}

export function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Session-ID": getSessionId(),
  };
}
