const inviteAdminEmail = (inviterName: string, inviteUrl: string, invitee: string) => {
    const currentYear = new Date().getFullYear();
    const startYear = 2025;
    const copyrightYear =
        currentYear === startYear ? `${startYear}` : `${startYear} - ${currentYear}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Invitation</title>
</head>
<body style="margin:0; padding:0; background-color:#f8f9fa; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">

  <div style="max-width:600px; margin:0 auto; background-color:#ffffff;">

    <!-- Header -->
    <div style="background-color:#ffffff; padding:40px 40px 20px; text-align:center; border-bottom:1px solid #f0f0f0;">
      <div style="margin-bottom:20px;">
        <div style="width:60px; height:2px; background-color:#4169E1; margin:0 auto 16px;"></div>
        <h1 style="font-size:24px; font-weight:300; color:#000000; margin:0; letter-spacing:2px;">GSF UI</h1>
      </div>
    </div>

    <!-- Content -->
    <div style="background-color:#ffffff; padding:40px;">
      <div style="display:flex; align-items:center; margin-bottom:24px;">
        <div style="width:32px; height:1px; background-color:#4169E1; margin-right:12px;"></div>
        <span style="font-size:12px; font-weight:500; color:#4169E1; text-transform:uppercase; letter-spacing:1.5px;">Admin Invitation</span>
      </div>

      <h1 style="font-size:28px; font-weight:300; color:#000000; margin:0 0 24px 0; line-height:1.3;">You've Been Invited!</h1>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        Hi <strong>${invitee}</strong>, <strong>${inviterName}</strong> has invited you to join the GSF UI platform as an administrator.
      </p>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 16px 0;">
        As an admin, you'll have access to:
      </p>

      <!-- Admin Privileges List -->
      <div style="background-color:#f8f9fa; border-left:3px solid #4169E1; padding:20px 24px; margin:0 0 32px 0;">
        <ul style="margin:0; padding-left:20px; font-size:15px; color:#000000; font-weight:300; line-height:1.8;">
          <li style="margin-bottom:8px;">Approve and manage blog posts</li>
          <li style="margin-bottom:8px;">Review author applications</li>
          <li style="margin-bottom:8px;">Monitor platform activity</li>
          <li style="margin-bottom:0;">Invite other administrators</li>
        </ul>
      </div>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        Click the button below to accept your invitation and get started:
      </p>

      <!-- Accept Invitation Button -->
      <div style="text-align:center; margin:32px 0;">
        <a href="${inviteUrl}" 
           style="display:inline-block; background-color:#4169E1; color:#ffffff; text-decoration:none; padding:16px 32px; font-size:16px; font-weight:400; border:2px solid #4169E1; border-radius:4px;">
          Accept Invitation
        </a>
      </div>

      <!-- Fallback Instructions -->
      <div style="background-color:#f8f9fa; border:1px solid #e9ecef; padding:24px; margin:32px 0; border-radius:4px;">
        <p style="font-size:14px; color:#666666; font-weight:500; margin:0 0 12px 0; text-transform:uppercase; letter-spacing:0.5px;">
          Button not working?
        </p>
        <p style="font-size:14px; color:#000000; font-weight:300; line-height:1.5; margin:0 0 16px 0;">
          Copy and paste this link into your browser:
        </p>
        <div style="background-color:#ffffff; border:1px solid #ddd; padding:12px; border-radius:4px; word-break:break-all;">
          <code style="font-family:'Courier New', monospace; font-size:12px; color:#333333;">${inviteUrl}</code>
        </div>
      </div>

      <!-- Security Notice -->
      <div style="border-top:1px solid #e9ecef; padding-top:24px; margin-top:32px;">
        <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.6; margin:0 0 12px 0;">
          ⏱️ This invitation will expire in <strong>7 days</strong> for security purposes.
        </p>
        <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.6; margin:0;">
          🔒 Only accept this invitation if you recognize the sender and trust this request.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color:#f8f9fa; padding:40px; text-align:center; border-top:1px solid #f0f0f0;">
      <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.5; margin:0 0 16px 0;">
        If you didn't expect this invitation or believe it was sent in error, please ignore this email or contact support.
      </p>
      <div style="margin:24px 0;">
        <a href="#" style="color:#4169E1; text-decoration:none; font-size:14px; margin:0 16px;">Visit Website</a>
        <a href="#" style="color:#4169E1; text-decoration:none; font-size:14px; margin:0 16px;">Contact Support</a>
      </div>
      <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.5; margin:0;">
        © ${copyrightYear} Gofamint Students' Fellowship, University of Ibadan
      </p>
    </div>

  </div>
</body>
</html>`;
};

export default inviteAdminEmail;
