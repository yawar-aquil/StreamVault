import { config } from "dotenv";

config();

const API_BASE = "http://localhost:5000";

console.log("\n" + "=".repeat(70));
console.log("🧪 FULL EMAIL SYSTEM TEST - StreamVault");
console.log("=".repeat(70));

async function testContentRequest() {
  console.log("\n📝 TEST 1: Content Request");
  console.log("-".repeat(70));
  
  const requestData = {
    contentType: "series",
    title: "Game of Thrones",
    year: "2011",
    genre: "Fantasy, Drama, Adventure",
    description: "Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.",
    reason: "Most requested show by users! Epic fantasy series.",
    email: "fan@streamvault.com"
  };
  
  console.log("Submitting:", requestData.title);
  
  try {
    const response = await fetch(`${API_BASE}/api/request-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log("✅ Content Request Submitted!");
      console.log("   Request Count:", result.requestCount);
    } else {
      console.log("❌ Failed:", result);
    }
  } catch (error) {
    console.log("❌ Error:", error);
  }
}

async function testIssueReport() {
  console.log("\n\n🐛 TEST 2: Issue Report");
  console.log("-".repeat(70));
  
  const reportData = {
    issueType: "video_issue",
    title: "Video player not loading on mobile",
    description: "When I try to watch episodes on my iPhone, the video player shows a black screen. Audio plays but no video. Works fine on desktop.",
    url: "http://localhost:5000/watch/stranger-things/1/1",
    email: "mobile-user@example.com"
  };
  
  console.log("Submitting:", reportData.title);
  
  try {
    const response = await fetch(`${API_BASE}/api/report-issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log("✅ Issue Report Submitted!");
      console.log("   Report ID:", result.reportId);
    } else {
      console.log("❌ Failed:", result);
    }
  } catch (error) {
    console.log("❌ Error:", error);
  }
}

async function runTests() {
  console.log("\n⚠️  Make sure your dev server is running on port 5000!\n");
  
  await testContentRequest();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testIssueReport();
  
  console.log("\n\n" + "=".repeat(70));
  console.log("✅ TESTS COMPLETE!");
  console.log("=".repeat(70));
  
  console.log("\n📍 CHECK THESE LOCATIONS:\n");
  
  console.log("1. 🖥️  SERVER CONSOLE:");
  console.log("   Look for:");
  console.log("   ✅ Email sent successfully via Resend");
  console.log("   From: StreamVault <noreply@streamvault.live>");
  console.log("   To: contact@streamvault.live");
  console.log("   Email ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
  console.log("");
  
  console.log("2. ✉️  EMAIL INBOX:");
  console.log("   Check: contact@streamvault.live");
  console.log("   Expected: 2 new emails");
  console.log("   - Content Request: Game of Thrones");
  console.log("   - Issue Report: Video player not loading on mobile");
  console.log("");
  
  console.log("3. 💾 DATA FILE:");
  console.log("   File: data/streamvault-data.json");
  console.log("   Search for: 'Game of Thrones'");
  console.log("   Should be in contentRequests array");
  console.log("");
  
  console.log("4. 📊 ADMIN PANEL:");
  console.log("   URL: http://localhost:5000/admin");
  console.log("   Login: admin / streamvault2024");
  console.log("   - Click 'Requests' tab → See Game of Thrones");
  console.log("   - Click 'Reports' tab → See video player issue");
  console.log("");
  
  console.log("5. 🌐 PRODUCTION (Railway):");
  console.log("   URL: https://streamvault.live/admin");
  console.log("   Same login credentials");
  console.log("   Should see all requests and reports");
  console.log("");
  
  console.log("=".repeat(70));
  console.log("🎉 If you see emails in contact@streamvault.live,");
  console.log("   your email system is FULLY WORKING!");
  console.log("=".repeat(70) + "\n");
}

runTests().catch(console.error);
