import type { ContentRequest, IssueReport, Feedback } from "./storage";

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
                        ${productImageUrl.match(/\.(png|jpg|jpeg|webp|gif)(\?|$)/i)
      ? `<img src="${productImageUrl}" alt="${productName}" width="120" height="120" style="display: block; object-fit: contain;">`
      : `<div style="width: 120px; height: 120px; position: relative;">
                              <div style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid #EAB308; position: relative; overflow: hidden;">
                                <div style="position: absolute; top: 50%; left: 50%; width: 140%; height: 4px; background-color: #EAB308; transform: translate(-50%, -50%) rotate(-45deg);"></div>
                              </div>
                              <div style="position: absolute; bottom: 12px; left: 0; right: 0; text-align: center;">
                                <span style="font-size: 28px; font-weight: 900; color: #EAB308; font-family: 'Helvetica Neue', Arial, sans-serif; letter-spacing: 2px;">AD</span>
                              </div>
                            </div>`
    }
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

export async function sendSubscriptionRenewalEmail(
  email: string,
  username: string,
  subType: string,
  price: number,
  daysLeft: number
): Promise<boolean> {
  const planName = subType === 'yearly' ? 'Ad-Free Yearly' : 'Ad-Free Monthly';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Renewing Soon</title>
</head>
<body style="margin:0; padding:0; background-color:#09090b; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#18181b; border-radius:16px; overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid #27272a;">
          <tr>
            <td align="center" style="padding: 40px 0 20px 0; background: linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(24,24,27,1) 100%);">
              <h1 style="margin:0 0 10px 0; color:#E50914; font-size:24px; font-weight:900; letter-spacing:3px; text-transform:uppercase;">STREAMVAULT</h1>
              <div style="font-size:48px;">🔄</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 40px 30px 40px;">
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:24px; font-weight:bold;">Subscription Renewing Tomorrow</h2>
              <p style="margin:0; color:#a1a1aa; font-size:16px;">Hi ${username}, your <strong style="color:#fbbf24;">${planName}</strong> subscription will auto-renew in <strong style="color:#22c55e;">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <div style="background-color:#27272a; border-radius: 12px; padding: 20px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">Plan</td>
                    <td style="padding: 12px 0; color:#fff; font-size:15px; font-weight: 600; text-align: right; border-bottom: 1px solid #3f3f46;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">Renewal Cost</td>
                    <td style="padding: 12px 0; color:#E50914; font-size:15px; font-weight: 600; text-align: right; border-bottom: 1px solid #3f3f46;">${price} Coins</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px;">Auto-Renew</td>
                    <td style="padding: 12px 0; color:#22c55e; font-size:15px; font-weight: 600; text-align: right;">✅ Enabled</td>
                  </tr>
                </table>
              </div>
              <p style="margin:20px 0 0; color:#71717a; font-size:13px; text-align:center;">Make sure you have enough coins in your wallet. You can manage auto-renewal in your <a href="https://streamvault.live/store" style="color:#fbbf24; text-decoration:none;">Store</a> settings.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 30px; background-color:#18181b; border-top:1px solid #27272a;">
              <p style="margin:0; color:#52525b; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `SUBSCRIPTION RENEWING SOON

Hi ${username},

Your ${planName} subscription will auto-renew in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.

Plan: ${planName}
Renewal Cost: ${price} Coins
Auto-Renew: Enabled

Make sure you have enough coins. Manage settings: https://streamvault.live/store

© StreamVault
`;

  return sendEmail({
    to: email,
    subject: `🔄 Your ${planName} subscription renews tomorrow`,
    html,
    text,
  });
}

export async function sendSubscriptionExpiringEmail(
  email: string,
  username: string,
  subType: string,
  daysLeft: number
): Promise<boolean> {
  const planName = subType === 'yearly' ? 'Ad-Free Yearly' : 'Ad-Free Monthly';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Expiring Soon</title>
</head>
<body style="margin:0; padding:0; background-color:#09090b; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#18181b; border-radius:16px; overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid #27272a;">
          <tr>
            <td align="center" style="padding: 40px 0 20px 0; background: linear-gradient(180deg, rgba(239,68,68,0.15) 0%, rgba(24,24,27,1) 100%);">
              <h1 style="margin:0 0 10px 0; color:#E50914; font-size:24px; font-weight:900; letter-spacing:3px; text-transform:uppercase;">STREAMVAULT</h1>
              <div style="font-size:48px;">⏰</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 40px 30px 40px;">
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:24px; font-weight:bold;">Your Subscription Expires Tomorrow</h2>
              <p style="margin:0; color:#a1a1aa; font-size:16px;">Hi ${username}, your <strong style="color:#fbbf24;">${planName}</strong> subscription expires in <strong style="color:#ef4444;">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>. Don't lose your ad-free experience!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px;">
                <tr>
                  <td align="center">
                    <a href="https://streamvault.live/store?category=subscription" style="display: inline-block; background: linear-gradient(135deg, #E50914, #ff6b6b); color: #ffffff; padding: 16px 40px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 12px; text-transform: uppercase; box-shadow: 0 4px 15px rgba(229,9,20,0.4);">Renew Now</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <p style="margin:0; color:#71717a; font-size:13px; text-align:center;">You can also enable auto-renewal in your store settings to never miss a day of ad-free streaming.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 30px; background-color:#18181b; border-top:1px solid #27272a;">
              <p style="margin:0; color:#52525b; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `SUBSCRIPTION EXPIRING SOON

Hi ${username},

Your ${planName} subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Don't lose your ad-free experience!

Renew now: https://streamvault.live/store?category=subscription

You can also enable auto-renewal in your store settings.

© StreamVault
`;

  return sendEmail({
    to: email,
    subject: `⏰ Your ${planName} subscription expires tomorrow`,
    html,
    text,
  });
}

export async function sendSubscriptionRenewedEmail(
  email: string,
  username: string,
  subType: string,
  price: number,
  remainingCoins: number,
  newExpiryDate: Date
): Promise<boolean> {
  const planName = subType === 'yearly' ? 'Ad-Free Yearly' : 'Ad-Free Monthly';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Renewed</title>
</head>
<body style="margin:0; padding:0; background-color:#09090b; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#18181b; border-radius:16px; overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid #27272a;">
          <tr>
            <td align="center" style="padding: 40px 0 20px 0; background: linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(24,24,27,1) 100%);">
              <h1 style="margin:0 0 10px 0; color:#E50914; font-size:24px; font-weight:900; letter-spacing:3px; text-transform:uppercase;">STREAMVAULT</h1>
              <div style="font-size:48px;">✅</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 40px 30px 40px;">
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:24px; font-weight:bold;">Subscription Renewed!</h2>
              <p style="margin:0; color:#a1a1aa; font-size:16px;">Hi ${username}, your <strong style="color:#fbbf24;">${planName}</strong> has been automatically renewed.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <div style="background-color:#27272a; border-radius: 12px; padding: 20px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">Plan</td>
                    <td style="padding: 12px 0; color:#fff; font-size:15px; font-weight: 600; text-align: right; border-bottom: 1px solid #3f3f46;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">Charged</td>
                    <td style="padding: 12px 0; color:#E50914; font-size:15px; font-weight: 600; text-align: right; border-bottom: 1px solid #3f3f46;">${price} Coins</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">New Expiry</td>
                    <td style="padding: 12px 0; color:#fff; font-size:15px; font-weight: 600; text-align: right; border-bottom: 1px solid #3f3f46;">${newExpiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px;">Remaining Balance</td>
                    <td style="padding: 12px 0; color:#22c55e; font-size:16px; font-weight: bold; text-align: right;">${remainingCoins} Coins</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 30px; background-color:#18181b; border-top:1px solid #27272a;">
              <p style="margin:0; color:#52525b; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `SUBSCRIPTION RENEWED

Hi ${username},

Your ${planName} has been automatically renewed!

Plan: ${planName}
Charged: ${price} Coins
New Expiry: ${newExpiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Remaining Balance: ${remainingCoins} Coins

© StreamVault
`;

  return sendEmail({
    to: email,
    subject: `✅ Your ${planName} subscription has been renewed`,
    html,
    text,
  });
}

export async function sendSubscriptionFailedEmail(
  email: string,
  username: string,
  subType: string,
  price: number,
  currentCoins: number
): Promise<boolean> {
  const planName = subType === 'yearly' ? 'Ad-Free Yearly' : 'Ad-Free Monthly';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Renewal Failed</title>
</head>
<body style="margin:0; padding:0; background-color:#09090b; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#18181b; border-radius:16px; overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid #27272a;">
          <tr>
            <td align="center" style="padding: 40px 0 20px 0; background: linear-gradient(180deg, rgba(239,68,68,0.15) 0%, rgba(24,24,27,1) 100%);">
              <h1 style="margin:0 0 10px 0; color:#E50914; font-size:24px; font-weight:900; letter-spacing:3px; text-transform:uppercase;">STREAMVAULT</h1>
              <div style="font-size:48px;">❌</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 40px 30px 40px;">
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:24px; font-weight:bold;">Renewal Failed — Insufficient Coins</h2>
              <p style="margin:0; color:#a1a1aa; font-size:16px;">Hi ${username}, we couldn't renew your <strong style="color:#fbbf24;">${planName}</strong> because you don't have enough coins.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="background-color:#27272a; border-radius: 12px; padding: 20px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px; border-bottom: 1px solid #3f3f46;">Required</td>
                    <td style="padding: 12px 0; color:#E50914; font-size:15px; font-weight: 600; text-align: right; border-bottom: 1px solid #3f3f46;">${price} Coins</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color:#a1a1aa; font-size:14px;">Your Balance</td>
                    <td style="padding: 12px 0; color:#ef4444; font-size:15px; font-weight: 600; text-align: right;">${currentCoins} Coins</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="https://streamvault.live/wallet" style="display: inline-block; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000; padding: 16px 40px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 12px; text-transform: uppercase; box-shadow: 0 4px 15px rgba(251,191,36,0.4);">Top Up Coins</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <p style="margin:0; color:#71717a; font-size:13px; text-align:center;">Auto-renewal has been turned off. You can re-enable it after topping up your wallet.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 30px; background-color:#18181b; border-top:1px solid #27272a;">
              <p style="margin:0; color:#52525b; font-size:12px;">© ${new Date().getFullYear()} StreamVault. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `RENEWAL FAILED

Hi ${username},

We couldn't renew your ${planName} because you don't have enough coins.

Required: ${price} Coins
Your Balance: ${currentCoins} Coins

Top up your wallet: https://streamvault.live/wallet

Auto-renewal has been turned off. Re-enable it after topping up.

© StreamVault
`;

  return sendEmail({
    to: email,
    subject: `❌ ${planName} renewal failed — insufficient coins`,
    html,
    text,
  });
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

export async function sendFeedbackEmail(feedback: Feedback): Promise<void> {
  const categoryLabels: Record<string, string> = {
    feature: '🚀 Feature Request',
    improvement: '✨ Improvement',
    bug: '🐛 Bug Report',
    content: '🎬 Content Suggestion',
    other: '💬 Other',
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Feedback</title>
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
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:24px; font-weight:bold;">💡 New User Feedback</h2>
              <p style="margin:0; color:#b3b3b3; font-size:16px;">A user has submitted feedback/suggestion for StreamVault.</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#2a2a2a; border-radius:6px; border:1px solid #333;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin:0 0 15px 0; color:#E50914; font-size:14px; font-weight:bold; letter-spacing: 0.5px;">${categoryLabels[feedback.category] || feedback.category.toUpperCase()}</p>
                    <h3 style="margin:0 0 15px 0; color:#ffffff; font-size:20px; font-weight:bold;">${feedback.subject}</h3>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px; vertical-align: top; width: 100px;">Message</td>
                        <td style="padding: 8px 0; color:#ddd; font-size:14px; line-height: 1.6;">${feedback.message}</td>
                      </tr>
                      ${feedback.username ? `
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px;">Username</td>
                        <td style="padding: 8px 0; color:#E50914; font-size:14px;">${feedback.username}</td>
                      </tr>` : ''}
                      ${feedback.email ? `
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px;">Email</td>
                        <td style="padding: 8px 0; color:#E50914; font-size:14px;">${feedback.email}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding: 8px 0; color:#888; font-size:14px;">Submitted</td>
                        <td style="padding: 8px 0; color:#ddd; font-size:14px;">${new Date(feedback.createdAt).toLocaleString()}</td>
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

  const text = `NEW USER FEEDBACK

Category: ${feedback.category}
Subject: ${feedback.subject}
${feedback.username ? 'Username: ' + feedback.username : ''}
${feedback.email ? 'Email: ' + feedback.email : ''}

Message: ${feedback.message}

Manage in Admin Panel: https://streamvault.live/admin
`;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `💡 Feedback: ${feedback.subject}`,
    html,
    text,
  });
}

export async function sendFeedbackResolvedEmail(feedback: Feedback): Promise<void> {
  if (!feedback.email) return;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Follow-up</title>
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
              <h2 style="margin:0 0 10px 0; color:#ffffff; font-size:24px; font-weight:bold;">Update on Your Feedback</h2>
              <p style="margin:0; color:#b3b3b3; font-size:16px;">We have an update regarding the feedback you submitted.</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#2a2a2a; border-radius:6px; border:1px solid #333;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin:0 0 15px 0; color:#ffffff; font-size:20px; font-weight:bold;">\${feedback.subject}</h3>
                    
                    <p style="margin:0 0 15px 0; color:#ddd; font-size:14px; line-height: 1.6;">
                      Thank you for taking the time to provide feedback. The team has reviewed it and the status is now <strong>\${feedback.status.toUpperCase()}</strong>.
                    </p>

                    ${feedback.adminNote ? `
                    <div style="background-color:#1f1f1f; border-left:4px solid #E50914; padding:15px; margin-top:20px;">
                      <p style="margin:0 0 5px 0; color:#888; font-size:12px; text-transform:uppercase;">Note from Admin:</p>
                      <p style="margin:0; color:#fff; font-size:14px; font-style:italic;">"${feedback.adminNote}"</p>
                    </div>` : ''}
                  </td>
                </tr>
              </table>
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

  const text = `UPDATE ON YOUR FEEDBACK
  
Subject: ${feedback.subject}
Status: ${feedback.status.toUpperCase()}

${feedback.adminNote ? 'Admin Note: ' + feedback.adminNote : ''}

Thank you for your feedback! It helps us improve StreamVault.
`;

  await sendEmail({
    to: feedback.email,
    subject: `Update on your feedback: ${feedback.subject}`,
    html,
    text,
  });
}
