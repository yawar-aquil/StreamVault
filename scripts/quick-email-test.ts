import { config } from "dotenv";

config();

const API_BASE = "http://localhost:5000";

console.log("🚀 Quick Email Test\n");

async function quickTest() {
  const requestData = {
    contentType: "movie",
    title: "Inception",
    year: "2010",
    genre: "Sci-Fi, Thriller",
    description: "A thief who steals corporate secrets through dream-sharing technology.",
    reason: "Classic Christopher Nolan film!",
    email: "test@streamvault.com"
  };
  
  console.log("📤 Submitting content request:", requestData.title);
  
  try {
    const response = await fetch(`${API_BASE}/api/request-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    
    console.log("\n✅ Response:", result);
    console.log("\n📧 NOW CHECK YOUR SERVER CONSOLE!");
    console.log("   You should see:");
    console.log("   ✅ Email sent successfully to: contact@streamvault.live");
    console.log("\n   If you see:");
    console.log("   ⚠️  WEB3FORMS_ACCESS_KEY not set");
    console.log("   Then the .env file is not being loaded properly.");
    
  } catch (error) {
    console.log("❌ Error:", error);
  }
}

quickTest();
