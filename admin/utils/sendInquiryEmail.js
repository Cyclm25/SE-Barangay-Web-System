const { buildThemedEmail } = require('./emailTheme');
const { createTransporter } = require("./mailer");

const sendInquiryEmail = async (inquiryData) => {
  const { residentName, email, subject, message, announcementTitle, receiverEmail } = inquiryData;

  const { transporter, fromUser } = createTransporter();

  await transporter.verify();

  const mailOptions = {
    from: `"Barangay 160 Inquiry System" <${fromUser}>`,
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
