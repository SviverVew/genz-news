import "dotenv/config";
import nodemailer from "nodemailer";

async function testMail() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // 587 => false
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Nhiều Việc" <${process.env.SMTP_USER}>`,
      to: "kha.nhanmail@gmail.com",
      subject: "Test Email OTP",
      text: "Xin chào Kha, đây là mail test OTP 🚀",
    });

    console.log("✅ Email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
}

testMail();
