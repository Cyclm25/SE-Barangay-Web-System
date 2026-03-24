const nodemailer = require('nodemailer');

const sendInquiryEmail = async (inquiryData) => {
  const { residentName, email, subject, message, announcementTitle } = inquiryData;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER or EMAIL_PASS is not set in your .env file.');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.verify();

  const mailOptions = {
    from: `"Barangay 160 Inquiry System" <${process.env.EMAIL_USER}>`,
    replyTo: `"${residentName}" <${email}>`,
    to: process.env.BARANGAY_EMAIL || 'mabutascarlaaa@gmail.com',
    subject: `[BARANGAY INQUIRY] ${announcementTitle}: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #2957a1; padding: 20px 24px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">📬 New Announcement Inquiry</h2>
          <p style="color: #c7d9f5; margin: 4px 0 0; font-size: 13px;">Barangay 160 — Resident Inquiry System</p>
        </div>
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #555; width: 140px;"><strong>Resident Name:</strong></td>
              <td style="padding: 8px 0; font-size: 14px; color: #222;">${residentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #555;"><strong>Email Address:</strong></td>
              <td style="padding: 8px 0; font-size: 14px; color: #222;">
                <a href="mailto:${email}" style="color: #2957a1;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #555;"><strong>Subject:</strong></td>
              <td style="padding: 8px 0; font-size: 14px; color: #222;">${subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #555;"><strong>Regarding:</strong></td>
              <td style="padding: 8px 0; font-size: 14px; color: #222;">${announcementTitle}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 20px;" />
          <p style="font-size: 14px; color: #555; margin-bottom: 8px;"><strong>Message:</strong></p>
          <div style="background: #f4f7fc; border-left: 4px solid #2957a1; padding: 16px; border-radius: 6px; font-size: 14px; color: #333; line-height: 1.6;">
            ${message.replace(/\n/g, '<br/>')}
          </div>
        </div>
        <div style="background: #f9f9f9; padding: 16px 24px; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #999; margin: 0;">
            💡 <em>Hit <strong>Reply</strong> to respond directly to <strong>${residentName}</strong> at ${email}.</em>
          </p>
          <p style="font-size: 12px; color: #bbb; margin: 6px 0 0;">
            This email was sent via the Barangay 160 Resident Inquiry System.
          </p>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendInquiryEmail };