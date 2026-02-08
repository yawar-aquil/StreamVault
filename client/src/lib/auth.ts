// Helper function to get authentication headers for admin API calls
export function getAuthHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    "x-admin-token": token || "",
  };
}

// Check if user is authenticated
export async function checkAuth(): Promise<boolean> {
  const token = localStorage.getItem("adminToken");
  
  if (!token) {
    return false;
  }

  try {
    const res = await fetch("/api/admin/verify", {
      headers: { "x-admin-token": token },
    });
    const data = await res.json();
    return data.valid;
  } catch (error) {
    return false;
  }
}

// Logout user
export async function logout() {
  const token = localStorage.getItem("adminToken");
  
  if (token) {
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: { "x-admin-token": token },
    });
  }

  localStorage.removeItem("adminToken");
}
