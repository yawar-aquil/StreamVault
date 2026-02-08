import { config } from "dotenv";

config();

const API_BASE = "http://localhost:5000";

console.log("🧪 Testing Content Requests & Issue Reports\n");
console.log("=" .repeat(60));

// Test 1: Submit a content request
async function testContentRequest() {
  console.log("\n📝 TEST 1: Content Request");
  console.log("-".repeat(60));
  
  const requestData = {
    contentType: "series",
    title: "Breaking Bad",
    year: "2008",
    genre: "Crime, Drama",
    description: "A high school chemistry teacher turned meth manufacturer",
    reason: "One of the best TV series ever made!",
    email: "test@example.com"
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
      console.log("✅ Status:", response.status);
      console.log("✅ Response:", result);
      console.log("📊 Request Count:", result.requestCount);
    } else {
      console.log("❌ Failed:", response.status);
      console.log("❌ Error:", result);
    }
  } catch (error) {
    console.log("❌ Network Error:", error);
  }
}

// Test 2: Submit an issue report
async function testIssueReport() {
  console.log("\n📝 TEST 2: Issue Report");
  console.log("-".repeat(60));
  
  const reportData = {
    issueType: "video_issue",
    title: "Video not loading on Stranger Things S3E2",
    description: "The video player shows a black screen and doesn't load",
    url: "http://localhost:5000/watch/stranger-things/3/2",
    email: "user@example.com"
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
      console.log("✅ Status:", response.status);
      console.log("✅ Response:", result);
      console.log("📋 Report ID:", result.reportId);
    } else {
      console.log("❌ Failed:", response.status);
      console.log("❌ Error:", result);
    }
  } catch (error) {
    console.log("❌ Network Error:", error);
  }
}

// Test 3: Fetch top content requests
async function testGetTopRequests() {
  console.log("\n📝 TEST 3: Get Top Content Requests");
  console.log("-".repeat(60));
  
  try {
    const response = await fetch(`${API_BASE}/api/top-requests`);
    const requests = await response.json();
    
    if (response.ok) {
      console.log("✅ Status:", response.status);
      console.log(`✅ Found ${requests.length} content requests:\n`);
      
      requests.forEach((req: any, index: number) => {
        console.log(`${index + 1}. ${req.title} (${req.contentType})`);
        console.log(`   Requests: ${req.requestCount}`);
        console.log(`   Created: ${new Date(req.createdAt).toLocaleString()}`);
        console.log("");
      });
    } else {
      console.log("❌ Failed:", response.status);
    }
  } catch (error) {
    console.log("❌ Network Error:", error);
  }
}

// Test 4: Check data persistence
async function checkDataPersistence() {
  console.log("\n📝 TEST 4: Data Persistence Check");
  console.log("-".repeat(60));
  
  const { readFileSync, existsSync } = await import("fs");
  const { join } = await import("path");
  
  const dataFile = join(process.cwd(), "data", "streamvault-data.json");
  
  if (!existsSync(dataFile)) {
    console.log("❌ Data file not found!");
    return;
  }
  
  const data = JSON.parse(readFileSync(dataFile, "utf-8"));
  
  console.log("✅ Data file exists");
  console.log(`📊 Content Requests: ${data.contentRequests?.length || 0}`);
  console.log(`📊 Issue Reports: ${data.issueReports?.length || 0}`);
  
  if (data.contentRequests && data.contentRequests.length > 0) {
    console.log("\n📋 Latest Content Request:");
    const latest = data.contentRequests[data.contentRequests.length - 1];
    console.log(`   Title: ${latest.title}`);
    console.log(`   Type: ${latest.contentType}`);
    console.log(`   Count: ${latest.requestCount}`);
  }
  
  if (data.issueReports && data.issueReports.length > 0) {
    console.log("\n📋 Latest Issue Report:");
    const latest = data.issueReports[data.issueReports.length - 1];
    console.log(`   Title: ${latest.title}`);
    console.log(`   Type: ${latest.issueType}`);
    console.log(`   Status: ${latest.status}`);
  }
}

// Run all tests
async function runTests() {
  console.log("\n⚠️  Make sure your dev server is running on http://localhost:5000\n");
  
  await testContentRequest();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testIssueReport();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testGetTopRequests();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await checkDataPersistence();
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ All tests completed!");
  console.log("=".repeat(60));
  
  console.log("\n📍 WHERE TO CHECK:");
  console.log("1. ✉️  Email: Check contact@streamvault.live inbox");
  console.log("2. 💾 Data: Check data/streamvault-data.json file");
  console.log("3. 📊 Admin Panel: http://localhost:5000/admin");
  console.log("   - View all content requests");
  console.log("   - View all issue reports");
  console.log("4. 🖥️  Server Console: Check for email send logs");
  console.log("");
}

runTests().catch(console.error);
