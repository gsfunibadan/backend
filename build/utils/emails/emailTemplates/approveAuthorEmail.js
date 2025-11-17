"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const approveAuthorEmail = (firstName) => {
    const currentYear = new Date().getFullYear();
    const startYear = 2025;
    const copyrightYear =
        currentYear === startYear ? `${startYear}` : `${startYear} - ${currentYear}`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Author Approved</title>
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
        <span style="font-size:12px; font-weight:500; color:#4169E1; text-transform:uppercase; letter-spacing:1.5px;">Author Approval</span>
      </div>

      <h1 style="font-size:28px; font-weight:300; color:#000000; margin:0 0 24px 0; line-height:1.3;">Welcome to Our Author Community!</h1>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        Congratulations ${firstName}! Your application to become a contributing author for GSF UI Blog has been approved.
      </p>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        You now have access to our publishing platform where you can share your insights, testimonies, and spiritual reflections with our community of believers.
      </p>

     

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0 0 32px 0;">
        <strong>What's next?</strong><br>
        • Access your author dashboard<br>
        • Remember to do all things in the name of the Lord<br>
        • Start creating and publishing your first post
      </p>

      <p style="font-size:16px; color:#000000; font-weight:300; line-height:1.6; margin:0;">
        We're excited to see the meaningful content you'll contribute to our growing community.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color:#f8f9fa; padding:40px; text-align:center; border-top:1px solid #f0f0f0;">
      <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.5; margin:0 0 16px 0;">
        Need help getting started? Our support team is here to assist you.
      </p>
     
      <p style="font-size:14px; color:#666666; font-weight:300; line-height:1.5; margin:0;">
        © ${copyrightYear} Gofamint Students' Fellowship, University of Ibadan
      </p>
    </div>

  </div>
</body>
</html>
`;
};
exports.default = approveAuthorEmail;
