const adminInviteAcceptedEmail = (
    inviteeName: string,
    inviterName: string,
    dashboardUrl: string
) => {
    const currentYear = new Date().getFullYear();
    const startYear = 2025;
    const copyrightYear =
        currentYear === startYear ? `${startYear}` : `${startYear} - ${currentYear}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Admin Team</title>
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
        <span style="font-size:12px; font-weight:500; color:#4169E1; text-transform:uppercase; letter-spacing:1.5px;">Welcome Aboard</span>
      </div>

      <h1 style="font-size:28px; font-weight:300; color:#000000; margin:0 0 24px 0; line-height:1.3;">Welcome to the Team! 🎉</h1>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        Hi <strong>${inviteeName}</strong>, great news! You've successfully accepted the admin invitation from <strong>${inviterName}</strong>.
      </p>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        You now have full administrator access to the GSF UI platform. Here's what you can do:
      </p>

      <!-- Admin Privileges List -->
      <div style="background-color:#f8f9fa; border-left:3px solid #4169E1; padding:20px 24px; margin:0 0 32px 0;">
        <ul style="margin:0; padding-left:20px; font-size:15px; color:#000000; font-weight:300; line-height:1.8;">
          <li style="margin-bottom:8px;">✓ Approve and manage blog posts</li>
          <li style="margin-bottom:8px;">✓ Review author applications</li>
          <li style="margin-bottom:8px;">✓ Monitor platform activity</li>
          <li style="margin-bottom:0;">✓ Invite other administrators</li>
        </ul>
      </div>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        Ready to get started? Click the button below to access your admin dashboard:
      </p>

      <!-- Go to Dashboard Button -->
      <div style="text-align:center; margin:32px 0;">
        <a href="${dashboardUrl}" 
           style="display:inline-block; background-color:#4169E1; color:#ffffff; text-decoration:none; padding:16px 32px; font-size:16px; font-weight:400; border:2px solid #4169E1; border-radius:4px;">
          Go to Admin Dashboard
        </a>
      </div>

      <!-- Quick Start Guide -->
      <div style="background-color:#f8f9fa; border:1px solid #e9ecef; padding:24px; margin:32px 0; border-radius:4px;">
        <p style="font-size:14px; color:#666666; font-weight:500; margin:0 0 16px 0; text-transform:uppercase; letter-spacing:0.5px;">
          Quick Start Guide
        </p>
        <p style="font-size:14px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 12px 0;">
          <strong>1. Explore the Dashboard:</strong> Familiarize yourself with the admin panel and available tools.
        </p>
        <p style="font-size:14px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 12px 0;">
          <strong>2. Review Pending Items:</strong> Check for any pending blog posts or author applications.
        </p>
        <p style="font-size:14px; color:#000000; font-weight:300; line-height:1.6; margin:0;">
          <strong>3. Get Help:</strong> If you have questions, reach out to our support team anytime.
        </p>
      </div>

      <!-- Support Notice -->
      <div style="border-top:1px solid #e9ecef; padding-top:24px; margin-top:32px;">
        <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.6; margin:0 0 12px 0;">
          💡 Need help getting started? Our support team is here to assist you.
        </p>
        <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.6; margin:0;">
          🔐 Remember to keep your admin credentials secure and never share them with anyone.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color:#f8f9fa; padding:40px; text-align:center; border-top:1px solid #f0f0f0;">
      <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.5; margin:0 0 16px 0;">
        If you have any questions or concerns about your new admin role, please don't hesitate to contact us.
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

export default adminInviteAcceptedEmail;
