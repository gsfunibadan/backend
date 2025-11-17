"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const verifyNewUserEmail = (firstName, verificationUrl) => {
    const currentYear = new Date().getFullYear();
    const startYear = 2025;
    const copyrightYear =
        currentYear === startYear ? `${startYear}` : `${startYear} - ${currentYear}`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Email Verification</title>
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
        <span style="font-size:12px; font-weight:500; color:#4169E1; text-transform:uppercase; letter-spacing:1.5px;">Account Verification</span>
      </div>

      <h1 style="font-size:28px; font-weight:300; color:#000000; margin:0 0 24px 0; line-height:1.3;">Verify Your Email Address</h1>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
      Hello ${firstName},  welcome to Gofamint Students' Fellowship UI! We're excited to have you join our community of believers.
      </p>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        To complete your registration and secure your account, please verify your email address by clicking the button below:
      </p>

      <div style="text-align:center; margin:40px 0;">
        <a href=${verificationUrl} style="display:inline-block; background-color:#4169E1; color:#ffffff; text-decoration:none; padding:16px 32px; font-size:16px; font-weight:400; border:2px solid #4169E1;">
          Verify Email Address
        </a>
      </div>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="color:#4169E1; word-break:break-all;">${verificationUrl}</span>
      </p>

   
    </div>

    <!-- Footer -->
    <div style="background-color:#f8f9fa; padding:40px; text-align:center; border-top:1px solid #f0f0f0;">
      <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.5; margin:0 0 16px 0;">
        If you didn't create an account with GSF UI, you can safely ignore this email.
      </p>
      <div style="margin:24px 0;">
        <a href="https://gofamint-ui.vercel.app/" style="color:#4169E1; text-decoration:none; font-size:14px; margin:0 16px;">Visit Website</a>
        
      </div>
      <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.5; margin:0;">
        © ${copyrightYear} Gofamint Students' Fellowship, University of Ibadan
      </p>
    </div>

  </div>
</body>
</html>`;
};
exports.default = verifyNewUserEmail;
