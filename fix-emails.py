import re

with open('server/email-service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

func_start = content.find("export async function sendFeedbackEmail(feedback: Feedback): Promise<void> {")

new_content = content[:func_start] + """export async function sendFeedbackEmail(feedback: Feedback): Promise<void> {
  const categoryLabels: Record<string, string> = {
    issue: '🔴 Platform Issue',
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

  const isResolved = feedback.status === "resolved";
  const statusColor = isResolved ? "#22c55e" : "#eab308";
  const statusText = isResolved ? "Resolved" : feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1);
  const statusIcon = isResolved ? "✓" : "↻";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Update</title>
</head>
<body style="margin:0; padding:0; background-color:#09090b; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#18181b; border-radius:16px; overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid #27272a;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 0 30px 0; background: linear-gradient(180deg, rgba(88,28,135,0.15) 0%, rgba(24,24,27,1) 100%); border-bottom: 1px solid #27272a;">
              <h1 style="margin:0 0 20px 0; color:#E50914; font-size:24px; font-weight:900; letter-spacing:3px; text-transform:uppercase;">STREAMVAULT</h1>
              
              <div style="display:inline-block; padding:8px 16px; background-color:rgba(34, 197, 94, 0.1); border:1px solid rgba(34, 197, 94, 0.3); border-radius:20px; margin-bottom:10px;">
                <span style="color:${statusColor}; font-size:14px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">
                  <span style="display:inline-block; margin-right:6px; font-size:16px;">${statusIcon}</span>Status: ${statusText}
                </span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin:0 0 20px 0; color:#ffffff; font-size:22px; font-weight:bold; line-height:1.4;">
                Hi ${feedback.username || "there"},
              </h2>
              
              <p style="margin:0 0 25px 0; color:#a1a1aa; font-size:16px; line-height: 1.6;">
                We're writing to let you know that we've updated the status of your recent feedback submission regarding <strong>"${feedback.subject}"</strong>.
              </p>

              ${feedback.adminNote ? `
              <!-- Admin Note Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090b; border-left:4px solid #6961ff; border-radius:6px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin:0 0 10px 0; color:#6961ff; font-size:13px; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">A message from our team</p>
                    <p style="margin:0; color:#e4e4e7; font-size:15px; line-height:1.6; font-style:italic;">
                      "${feedback.adminNote}"
                    </p>
                  </td>
                </tr>
              </table>` : ''}

              <p style="margin:0 0 30px 0; color:#a1a1aa; font-size:16px; line-height: 1.6;">
                Thank you for helping us improve StreamVault! Your input directly shapes the future of our platform.
              </p>
              
              <p style="margin:0; color:#71717a; font-size:16px; line-height: 1.6;">
                Best regards,<br>
                <strong style="color:#e4e4e7;">The StreamVault Team</strong>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height:1px; background-color:#27272a; width:100%;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 40px;">
              <p style="margin:0 0 10px 0; color:#71717a; font-size:12px;">
                You received this email because you recently submitted feedback on StreamVault.
              </p>
              <p style="margin:0; color:#52525b; font-size:12px;">
                © ${new Date().getFullYear()} StreamVault. All rights reserved.
              </p>
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

Hi ${feedback.username || "there"},

We're writing to let you know that we've updated the status of your recent feedback regarding "${feedback.subject}" to ${statusText.toUpperCase()}.

${feedback.adminNote ? 'Message from our team:\n\n"' + feedback.adminNote + '"\n\n' : ''}Thank you for helping us improve StreamVault!

Best regards,
The StreamVault Team
`;

  await sendEmail({
    to: feedback.email,
    subject: `Update on your feedback: ${feedback.subject}`,
    from: "StreamVault Support <support@streamvault.in>",
    html,
    text,
  });
}
"""

with open('server/email-service.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)
