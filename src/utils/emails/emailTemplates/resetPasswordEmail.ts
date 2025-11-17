const resetPasswordEmail = (firstName: string, resetUrl: string) => {
    const currentYear = new Date().getFullYear();
    const startYear = 2025;
    const copyrightYear =
        currentYear === startYear ? `${startYear}` : `${startYear} - ${currentYear}`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
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
        <span style="font-size:12px; font-weight:500; color:#4169E1; text-transform:uppercase; letter-spacing:1.5px;">Password Reset</span>
      </div>

      <h1 style="font-size:28px; font-weight:300; color:#000000; margin:0 0 24px 0; line-height:1.3;">Reset Your Password</h1>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        Hi ${firstName}, we received a request to reset your password for your GSF UI account.
      </p>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        Click the button below to reset your password securely:
      </p>

      <!-- Reset Button -->
      <div style="text-align:center; margin:32px 0;">
        <a href="${resetUrl}" 
           style="display:inline-block; background-color:#4169E1; color:#ffffff; text-decoration:none; padding:16px 32px; font-size:16px; font-weight:400; border:2px solid #4169E1; border-radius:4px;">
          Reset My Password
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
          <code style="font-family:'Courier New', monospace; font-size:12px; color:#333333;">${resetUrl}</code>
        </div>
      </div>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:32px 0 0 0;">
        This reset link will expire in 15 minutes .
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color:#f8f9fa; padding:40px; text-align:center; border-top:1px solid #f0f0f0;">
      <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.5; margin:0 0 16px 0;">
        If you didn't request a password reset, please ignore this email or contact support if you have concerns.
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

export default resetPasswordEmail;
