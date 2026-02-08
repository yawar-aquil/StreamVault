import { config } from "dotenv";

config();

const API_BASE = "http://localhost:5000";

console.log("📧 Testing Email Service\n");
console.log("=" .repeat(60));

// Test 1: Submit a new content request
async function testContentRequest() {
  console.log("\n🎬 TEST 1: New Content Request");
  console.log("-".repeat(60));
  
  const requestData = {
    contentType: "series",
    title: "The Last of Us",
    year: "2023",
    genre: "Drama, Sci-Fi, Thriller",
    description: "After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity's last hope.",
    reason: "Amazing adaptation of the video game! Highly requested by users.",
    email: "fan@example.com"
  };
  
  console.log("Submitting:", requestData.title);
  console.log("Type:", requestData.contentType);
  
  try {
    const response = await fetch(`${API_BASE}/api/request-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log("\n✅ Content Request Submitted!");
      console.log("   Status:", response.status);
      console.log("   Message:", result.message);
      console.log("   Request Count:", result.requestCount);
      console.log("\n📧 Check server console for email confirmation!");
    } else {
      console.log("\n❌ Failed:", response.status);
      console.log("   Error:", result);
    }
  } catch (error) {
    console.log("\n❌ Network Error:", error);
  }
}

// Test 2: Submit a new issue report
async function testIssueReport() {
  console.log("\n\n🐛 TEST 2: New Issue Report");
  console.log("-".repeat(60));
  
  const reportData = {
    issueType: "playback_error",
    title: "Video buffering constantly on The Last of Us",
    description: "The video keeps buffering every few seconds, making it unwatchable. Tried on Chrome and Firefox, same issue. Internet speed is good (100 Mbps).",
    url: "http://localhost:5000/watch/the-last-of-us/1/1",
    email: "user123@example.com"
  };
  
  console.log("Submitting:", reportData.title);
  console.log("Type:", reportData.issueType);
  
  try {
    const response = await fetch(`${API_BASE}/api/report-issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log("\n✅ Issue Report Submitted!");
      console.log("   Status:", response.status);
      console.log("   Message:", result.message);
      console.log("   Report ID:", result.reportId);
      console.log("\n📧 Check server console for email confirmation!");
    } else {
      console.log("\n❌ Failed:", response.status);
      console.log("   Error:", result);
    }
  } catch (error) {
    console.log("\n❌ Network Error:", error);
  }
}

// Run tests
async function runTests() {
  console.log("\n⚠️  Make sure your dev server is running!\n");
  
  await testContentRequest();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testIssueReport();
  
  console.log("\n\n" + "=".repeat(60));
  console.log("✅ Tests Complete!");
  console.log("=".repeat(60));
  
  console.log("\n📍 WHERE TO CHECK:");
  console.log("\n1. 🖥️  SERVER CONSOLE:");
  console.log("   Look for these messages:");
  console.log("   ✅ Email sent successfully to: contact@streamvault.live");
  console.log("   (If you see this, emails are working!)");
  console.log("");
  console.log("   ⚠️  WEB3FORMS_ACCESS_KEY not set");
  console.log("   (If you see this, restart the server)");
  console.log("");
  console.log("2. ✉️  EMAIL INBOX:");
  console.log("   Check: contact@streamvault.live");
  console.log("   You should receive 2 emails:");
  console.log("   - Content Request: The Last of Us");
  console.log("   - Issue Report: Video buffering constantly");
  console.log("");
  console.log("3. 💾 DATA FILE:");
  console.log("   File: data/streamvault-data.json");
  console.log("   Should now have:");
  console.log("   - 2 content requests (Breaking Bad + The Last of Us)");
  console.log("   - 2 issue reports");
  console.log("");
  console.log("4. 📊 ADMIN PANEL:");
  console.log("   URL: http://localhost:5000/admin");
  console.log("   - Click 'Requests' tab → See 2 requests");
  console.log("   - Click 'Reports' tab → See 2 reports");
  console.log("");
}

runTests().catch(console.error);
