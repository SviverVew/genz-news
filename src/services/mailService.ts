// src/services/MailService.ts
import nodemailer from "nodemailer";
import { config } from "../config";
import "dotenv/config";

export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: false,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendOtpMail(to: string, otp: string) {
    await this.transporter.sendMail({
      from: `"Cyclone Project" <${config.smtp.user}>`,
      to,
      subject: "Xác thực tài khoản",
      html: `
        <h2>Mã xác thực của bạn</h2>
        <p>OTP: <b>${otp}</b></p>
        <p>Mã này sẽ hết hạn sau 5 phút.</p>
      `,
    });
  }
}
