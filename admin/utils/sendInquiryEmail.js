const nodemailer = require('nodemailer');
const { buildThemedEmail } = require('./emailTheme');

const sendInquiryEmail = async (inquiryData) => {
  const { residentName, email, subject, message, announcementTitle, receiverEmail } = inquiryData;

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
    to: receiverEmail || process.env.BARANGAY_EMAIL || 'mabutascarlaaa@gmail.com',
    subject: `[BARANGAY INQUIRY] ${announcementTitle}: ${subject}`,
    html: buildThemedEmail({
      title: "New Announcement Inquiry",
      subtitle: "Barangay 160 Resident Inquiry System",
      keyValues: [
        { label: "Resident Name", value: residentName },
        { label: "Email Address", value: email },
        { label: "Subject", value: subject },
        { label: "Regarding", value: announcementTitle },
      ],
      lines: message.split("\n"),
      notice: `Hit Reply to respond directly to ${residentName} at ${email}.`,
    }),
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendInquiryEmail };
