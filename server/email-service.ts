import type { ContentRequest, IssueReport } from "./storage";

// Email addresses
const ADMIN_EMAIL = "streamvault.live@gmail.com";
// Temporary: Use verified email until SPF records are verified in Resend
const VERIFIED_EMAIL = "yawaraquil121@gmail.com";
// Set to true once all DNS records show "Verified" in Resend dashboard
const DOMAIN_FULLY_VERIFIED = true; // ✅ DNS records verified!

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Email notification function using Resend
async function sendEmail(data: EmailData): Promise<boolean> {
  console.error("!!! CRITICAL DEBUG !!! sendEmail EXECUTING for:", data.to); // console.error to be sure
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    console.log(`[DEBUG] sendEmail called for: ${data.to}`); // Trace Log
    console.log(`[DEBUG] API Key present: ${!!RESEND_API_KEY}`); // Trace Log

    if (!RESEND_API_KEY) {
      // Fallback to console logging if no API key
      console.log("\n" + "=".repeat(60));
      console.log("📧 EMAIL NOTIFICATION (Console Only - No API Key)");
      console.log("=".repeat(60));
      console.log("To:", data.to);
      console.log("Subject:", data.subject);
      console.log("-".repeat(60));
      console.log(data.text);
      console.log("=".repeat(60) + "\n");
      return true;
    }

    // Use verified email until domain SPF records are verified
    const recipientEmail = DOMAIN_FULLY_VERIFIED ? data.to : VERIFIED_EMAIL;
    const fromEmail = DOMAIN_FULLY_VERIFIED
      ? "StreamVault <noreply@streamvault.live>"
      : "StreamVault <onboarding@resend.dev>";

    // Send email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: data.subject,
        html: data.html,
        text: data.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Failed to send email via Resend:", error);

      // Log to console as fallback
      console.log("\n📧 Email (failed to send, showing content):");
      console.log("To:", data.to);
      console.log("Subject:", data.subject);
      console.log(data.text);
      return false;
    }

    const result = await response.json();
    console.log("✅ Email sent successfully via Resend");
    console.log("   From:", fromEmail);
    console.log("   To:", recipientEmail);
    if (!DOMAIN_FULLY_VERIFIED) {
      console.log("   ⚠️  Using verified email until SPF records propagate");
      console.log("   📝 Intended recipient:", data.to);
    }
    console.log("   Subject:", data.subject);
    console.log("   Email ID:", result.id);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error);

    // Log to console as fallback
    console.log("\n📧 Email (error occurred, showing content):");
    console.log("To:", data.to);
    console.log("Subject:", data.subject);
    console.log(data.text);
    return false;
  }
}

export async function sendContentRequestEmail(request: ContentRequest): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Content Request</title>
</head>
<body style="margin:0; padding:0; background-color:#141414; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#141414;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#1f1f1f; border-radius:8px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#000000;">
              <h1 style="margin:0; color:#E50914; font-size:36px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">STREAMVAULT</h1>
            </td>
          </tr>
          
          <!-- Hero Section -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:24px; font-weight:bold;">New Content Request</h2>
              <p style="margin:0; color:#b3b3b3; font-size:16px;">A user has requested adding a new ${request.contentType}.</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#2a2a2a; border-radius:6px; border:1px solid #333;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin:0 0 5px 0; color:#E50914; font-size:20px; font-weight:bold;">${request.title}</h3>
                    <p style="margin:0 0 20px 0; color:#ffffff; font-size:14px;">${request.year ? request.year + ' • ' : ''}${request.contentType.toUpperCase()}</p>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      ${request.genre ? `
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px; width: 100px;">Genre</td>
                        <td style="padding: 8px 0; color:#ddd; font-size:14px;">${request.genre}</td>
                      </tr>` : ''}
                      ${request.description ? `
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px; vertical-align: top;">Description</td>
                        <td style="padding: 8px 0; color:#ddd; font-size:14px; line-height: 1.4;">${request.description}</td>
                      </tr>` : ''}
                      ${request.reason ? `
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px; vertical-align: top;">Reason</td>
                        <td style="padding: 8px 0; color:#ddd; font-size:14px; line-height: 1.4;">${request.reason}</td>
                      </tr>` : ''}
                      ${request.email ? `
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px;">Requested By</td>
                        <td style="padding: 8px 0; color:#E50914; font-size:14px;">${request.email}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px;">Total Requests</td>
                        <td style="padding: 8px 0; color:#fff; font-size:14px;"><span style="background:#E50914; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${request.requestCount}</span></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px;">Submitted</td>
                        <td style="padding: 8px 0; color:#ddd; font-size:14px;">${new Date(request.createdAt).toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://streamvault.live/admin" style="display: inline-block; background-color: #E50914; color: #ffffff; padding: 16px 32px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 4px; text-transform: uppercase;">Review in Admin Panel</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#181818; border-top:1px solid #2a2a2a;">
              <p style="margin:0; color:#666; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
              <p style="margin:5px 0 0; color:#444; font-size:12px;">This is an automated notification sent to the admin team.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `NEW CONTENT REQUEST

Title: ${request.title}
Type: ${request.contentType}
${request.year ? 'Year: ' + request.year : ''}
${request.email ? 'Requested By: ' + request.email : ''}
Request Count: ${request.requestCount}

${request.description ? 'Description: ' + request.description : ''}
${request.reason ? 'Reason: ' + request.reason : ''}

Manage in Admin Panel: https://streamvault.live/admin
`;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `📺 Request: ${request.title}`,
    html,
    text,
  });
}

export async function sendIssueReportEmail(report: IssueReport): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Issue Report</title>
</head>
<body style="margin:0; padding:0; background-color:#141414; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#141414;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#1f1f1f; border-radius:8px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#000000;">
              <h1 style="margin:0; color:#E50914; font-size:36px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">STREAMVAULT</h1>
            </td>
          </tr>
          
          <!-- Hero Section -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h2 style="margin:0 0 10px 0; color:#E50914; font-size:24px; font-weight:bold;">⚠️ Issue Reported</h2>
              <p style="margin:0; color:#b3b3b3; font-size:16px;">A user has reported an issue that requires attention.</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#2a2a2a; border-radius:6px; border:1px solid #333;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin:0 0 5px 0; color:#ffffff; font-size:20px; font-weight:bold;">${report.title}</h3>
                    <p style="margin:0 0 20px 0; color:#e5e5e5; font-size:14px; font-weight:bold; letter-spacing: 0.5px;">TYPE: <span style="color:#E50914;">${report.issueType.replace(/_/g, ' ').toUpperCase()}</span></p>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px; vertical-align: top; width: 100px;">Description</td>
                        <td style="padding: 8px 0; color:#ddd; font-size:14px; line-height: 1.4;">${report.description}</td>
                      </tr>
                      ${report.url ? `
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px; vertical-align: top;">Affected URL</td>
                        <td style="padding: 8px 0; color:#E50914; font-size:14px;"><a href="${report.url}" style="color:#E50914; text-decoration:none;">${report.url}</a></td>
                      </tr>` : ''}
                      ${report.email ? `
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px;">Reported By</td>
                        <td style="padding: 8px 0; color:#ddd; font-size:14px;">${report.email}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px;">Status</td>
                        <td style="padding: 8px 0; color:#fff; font-size:14px;"><span style="background:#333; border: 1px solid #555; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${report.status.toUpperCase()}</span></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px;">Submitted</td>
                        <td style="padding: 8px 0; color:#ddd; font-size:14px;">${new Date(report.createdAt).toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://streamvault.live/admin" style="display: inline-block; background-color: #E50914; color: #ffffff; padding: 16px 32px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 4px; text-transform: uppercase;">Resolve in Admin Panel</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#181818; border-top:1px solid #2a2a2a;">
              <p style="margin:0; color:#666; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
              <p style="margin:5px 0 0; color:#444; font-size:12px;">Please prioritize this issue to ensure platform stability.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `NEW ISSUE REPORT

Title: ${report.title}
Type: ${report.issueType}
Status: ${report.status}
${report.email ? 'Reported By: ' + report.email : ''}

Description: ${report.description}
${report.url ? 'URL: ' + report.url : ''}

Manage in Admin Panel: https://streamvault.live/admin
`;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `⚠️ Issue: ${report.title}`,
    html,
    text,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin:0; padding:0; background-color:#141414; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#141414;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#1f1f1f; border-radius:8px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#000000;">
              <h1 style="margin:0; color:#E50914; font-size:36px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">STREAMVAULT</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:24px; font-weight:bold;">Reset Your Password</h2>
              <p style="margin:0 0 30px 0; color:#b3b3b3; font-size:16px;">Biometric scan failed? Don't worry. Use the code below to reset your password.</p>
              
              <div style="background-color:#2a2a2a; border:1px solid #333; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <span style="color:#E50914; font-size: 32px; font-weight: bold; letter-spacing: 5px;">${token}</span>
              </div>

              <p style="margin:0 0 10px 0; color:#666; font-size:14px;">This code will expire in 15 minutes.</p>
              <p style="margin:0; color:#666; font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#181818; border-top:1px solid #2a2a2a;">
              <p style="margin:0; color:#666; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `RESET YOUR PASSWORD
  
Use the code below to reset your password:

${token}

This code will expire in 15 minutes.
If you didn't request this, please ignore this email.
`;

  return sendEmail({
    to: email,
    subject: "🔐 Reset Your Password",
    html,
    text,
  });
}
export async function sendPurchaseReceiptEmail(
  email: string,
  username: string,
  productName: string,
  productImageUrl: string,
  price: number,
  remainingBalance: number,
  transactionId: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Receipt</title>
</head>
<body style="margin:0; padding:0; background-color:#09090b; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#18181b; border-radius:16px; overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid #27272a;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 0 0 0; background: linear-gradient(180deg, rgba(88,28,135,0.2) 0%, rgba(24,24,27,1) 100%);">
              <h1 style="margin:0 0 30px 0; color:#E50914; font-size:24px; font-weight:900; letter-spacing:3px; text-transform:uppercase;">STREAMVAULT</h1>
              
              <!-- Product Image Container -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="position: relative; display: inline-block;">
                      <div style="background-color: #27272a; padding: 20px; border-radius: 20px; border: 1px solid #3f3f46; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                        <img src="${productImageUrl}" alt="${productName}" width="120" height="120" style="display: block; object-fit: contain;">
                      </div>
                      <!-- Checkmark Badge -->
                      <div style="position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%); background-color: #22c55e; width: 40px; height: 40px; border-radius: 50%; border: 4px solid #18181b; text-align: center; line-height: 40px; color: white; font-size: 20px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                        ✓
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px 40px;">
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:28px; font-weight:bold;">Purchase Successful!</h2>
              <p style="margin:0; color:#a1a1aa; font-size:16px;">Hi ${username}, you are now the owner of <strong style="color: #fbbf24;">${productName}</strong>.</p>
            </td>
          </tr>

          <!-- Receipt Settings -->
          <tr>
             <td style="padding: 0 40px 40px 40px;">
              <div style="background-color:#27272a; border-radius: 12px; padding: 20px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">Product</td>
                    <td style="padding: 12px 0; color:#fff; font-size:15px; font-weight: 600; text-align: right; border-bottom: 1px solid #3f3f46;">${productName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">Price</td>
                    <td style="padding: 12px 0; color:#E50914; font-size:15px; font-weight: 600; text-align: right; border-bottom: 1px solid #3f3f46;">${price} Coins</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">Transaction ID</td>
                    <td style="padding: 12px 0; color:#71717a; font-size:12px; font-family: monospace; text-align: right; border-bottom: 1px solid #3f3f46;">${transactionId}</td>
                  </tr>
                   <tr>
                    <td style="padding: 15px 0 5px 0; color:#a1a1aa; font-size:14px;">Remaining Balance</td>
                    <td style="padding: 15px 0 5px 0; color:#22c55e; font-size:16px; font-weight: bold; text-align: right;">${remainingBalance} Coins</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#18181b; border-top:1px solid #27272a;">
              <a href="https://streamvault.live" style="color: #71717a; text-decoration: none; font-size: 12px; margin-right: 15px;">Website</a>
              <a href="https://streamvault.live/inventory" style="color: #71717a; text-decoration: none; font-size: 12px;">Inventory</a>
              <p style="margin:20px 0 0; color:#52525b; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `PURCHASE RECEIPT
  
Hi ${username},

Purchase Successful!
You are now the owner of ${productName}.

Product: ${productName}
Price: ${price} Coins
Transaction ID: ${transactionId}

Remaining Balance: ${remainingBalance} Coins

View your item: https://streamvault.live/inventory

© StreamVault
`;

  return sendEmail({
    to: email,
    subject: `Receipt: You purchased ${productName}`,
    html,
    text,
  });
}

export async function sendCoinPurchaseReceiptEmail(
  email: string,
  username: string,
  amount: number,
  cost: string,
  newBalance: number,
  transactionId: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coin Purchase Receipt</title>
</head>
<body style="margin:0; padding:0; background-color:#09090b; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#18181b; border-radius:16px; overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid #27272a;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 0 0 0; background: linear-gradient(180deg, rgba(234,179,8,0.2) 0%, rgba(24,24,27,1) 100%);">
              <h1 style="margin:0 0 30px 0; color:#EAB308; font-size:24px; font-weight:900; letter-spacing:3px; text-transform:uppercase;">STREAMVAULT</h1>
              
              <!-- Coin Icon -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="position: relative; display: inline-block;">
                      <!-- CSS StreamCoin Replica -->
                      <div style="background: linear-gradient(135deg, #FCD34D 0%, #F59E0B 50%, #D97706 100%); width: 80px; height: 80px; border-radius: 50%; border: 4px solid #B45309; box-shadow: 0 0 20px rgba(234,179,8,0.6); display: inline-block; text-align: center; line-height: 80px;">
                        <span style="font-family: serif; font-size: 48px; font-weight: bold; color: #78350F; text-shadow: 1px 1px 0px rgba(255,255,255,0.4);">S</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td align="center" style="padding: 30px 40px 30px 40px;">
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:28px; font-weight:bold;">Wallet Top-Up Successful!</h2>
              <p style="margin:0; color:#a1a1aa; font-size:16px;">Hi ${username}, you've successfully added <strong style="color: #fbbf24;">${amount} Coins</strong> to your wallet.</p>
            </td>
          </tr>

          <!-- Receipt Settings -->
          <tr>
             <td style="padding: 0 40px 40px 40px;">
              <div style="background-color:#27272a; border-radius: 12px; padding: 20px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">Coins Added</td>
                    <td style="padding: 12px 0; color:#fbbf24; font-size:15px; font-weight: 600; text-align: right; border-bottom: 1px solid #3f3f46;">+${amount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">Total Cost</td>
                    <td style="padding: 12px 0; color:#fff; font-size:15px; font-weight: 600; text-align: right; border-bottom: 1px solid #3f3f46;">${cost}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">Transaction ID</td>
                    <td style="padding: 12px 0; color:#71717a; font-size:12px; font-family: monospace; text-align: right; border-bottom: 1px solid #3f3f46;">${transactionId}</td>
                  </tr>
                   <tr>
                    <td style="padding: 15px 0 5px 0; color:#a1a1aa; font-size:14px;">New Wallet Balance</td>
                    <td style="padding: 15px 0 5px 0; color:#22c55e; font-size:16px; font-weight: bold; text-align: right;">${newBalance} Coins</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#18181b; border-top:1px solid #27272a;">
              <a href="https://streamvault.live" style="color: #71717a; text-decoration: none; font-size: 12px; margin-right: 15px;">Website</a>
              <a href="https://streamvault.live/wallet" style="color: #71717a; text-decoration: none; font-size: 12px;">My Wallet</a>
              <p style="margin:20px 0 0; color:#52525b; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `WALLET TOP-UP RECEIPT
  
Hi ${username},

Success! You've added ${amount} Coins to your wallet.

Coins Added: +${amount}
Total Cost: ${cost}
Transaction ID: ${transactionId}

New Wallet Balance: ${newBalance} Coins

Manage Wallet: https://streamvault.live/wallet

© StreamVault
`;

  return sendEmail({
    to: email,
    subject: `Receipt: You purchased ${amount} Coins`,
    html,
    text,
  });
}

export async function sendEmailVerificationEmail(email: string, code: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin:0; padding:0; background-color:#141414; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#141414;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#1f1f1f; border-radius:8px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#000000;">
              <h1 style="margin:0; color:#E50914; font-size:36px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">STREAMVAULT</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:24px; font-weight:bold;">Verify Your Email Address</h2>
              <p style="margin:0 0 30px 0; color:#b3b3b3; font-size:16px;">Welcome to StreamVault! Please verify your email address to complete your registration.</p>
              
              <div style="background-color:#2a2a2a; border:1px solid #333; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <span style="color:#E50914; font-size: 32px; font-weight: bold; letter-spacing: 5px;">${code}</span>
              </div>

              <p style="margin:0 0 10px 0; color:#666; font-size:14px;">This code will expire in 30 minutes.</p>
              <p style="margin:0; color:#666; font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#181818; border-top:1px solid #2a2a2a;">
              <p style="margin:0; color:#666; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `VERIFY YOUR EMAIL
  
Use the code below to verify your email address:

${code}

This code will expire in 30 minutes.
`;

  return sendEmail({
    to: email,
    subject: "✉️ Verify Your Email Address",
    html,
    text,
  });
}


export async function sendContentRequestCompletedEmail(request: ContentRequest): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Fulfilled</title>
</head>
<body style="margin:0; padding:0; background-color:#141414; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#141414;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#1f1f1f; border-radius:8px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#000000;">
              <h1 style="margin:0; color:#E50914; font-size:36px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">STREAMVAULT</h1>
            </td>
          </tr>
          
          <!-- Hero Section -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:24px; font-weight:bold;">Good News! 🎉</h2>
              <p style="margin:0; color:#b3b3b3; font-size:16px;">The content you requested has been added to StreamVault.</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#2a2a2a; border-radius:6px; border:1px solid #333;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin:0 0 5px 0; color:#E50914; font-size:20px; font-weight:bold;">${request.title}</h3>
                    <p style="margin:0 0 20px 0; color:#ffffff; font-size:14px;">${request.year ? request.year + ' • ' : ''}${request.contentType.toUpperCase()}</p>
                    
                    <p style="margin:0; color:#ddd; font-size:14px; line-height: 1.6;">
                      You can now watch <strong>${request.title}</strong> on StreamVault. Thank you for your request!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://streamvault.live" style="display: inline-block; background-color: #E50914; color: #ffffff; padding: 16px 32px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 4px; text-transform: uppercase;">Watch Now</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#181818; border-top:1px solid #2a2a2a;">
              <p style="margin:0; color:#666; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
              <p style="margin:5px 0 0; color:#444; font-size:12px;">You received this email because you requested content on StreamVault.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `GOOD NEWS!
  
The content you requested has been added to StreamVault.

Title: ${request.title}
Type: ${request.contentType}

Watch Now: https://streamvault.live

Thank you for your request!
`;

  if (request.email) {
    await sendEmail({
      to: request.email,
      subject: `✅ Available Now: ${request.title}`,
      html,
      text,
    });
  }
}

export async function sendIssueReportResolvedEmail(report: IssueReport): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Issue Resolved</title>
</head>
<body style="margin:0; padding:0; background-color:#141414; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#141414;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#1f1f1f; border-radius:8px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#000000;">
              <h1 style="margin:0; color:#E50914; font-size:36px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">STREAMVAULT</h1>
            </td>
          </tr>
          
          <!-- Hero Section -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:24px; font-weight:bold;">Issue Resolved ✅</h2>
              <p style="margin:0; color:#b3b3b3; font-size:16px;">We've fixed the issue you reported.</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#2a2a2a; border-radius:6px; border:1px solid #333;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin:0 0 5px 0; color:#E50914; font-size:20px; font-weight:bold;">${report.title}</h3>
                    <p style="margin:0 0 20px 0; color:#e5e5e5; font-size:14px; font-weight:bold; letter-spacing: 0.5px;">STATUS: <span style="color:#22c55e;">RESOLVED</span></p>
                    
                    <p style="margin:0; color:#ddd; font-size:14px; line-height: 1.6;">
                      Thank you for reporting this issue. Our team has investigated and resolved it.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://streamvault.live" style="display: inline-block; background-color: #E50914; color: #ffffff; padding: 16px 32px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 4px; text-transform: uppercase;">Back to StreamVault</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; background-color:#181818; border-top:1px solid #2a2a2a;">
              <p style="margin:0; color:#666; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
              <p style="margin:5px 0 0; color:#444; font-size:12px;">Thank you for helping us improve StreamVault.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `ISSUE RESOLVED
  
We've fixed the issue you reported.

Title: ${report.title}
Status: RESOLVED

Back to StreamVault: https://streamvault.live

Thank you for helping us improve StreamVault.
`;

  if (report.email) {
    await sendEmail({
      to: report.email,
      subject: `✅ Issue Resolved: ${report.title}`,
      html,
      text,
    });
  }
}
