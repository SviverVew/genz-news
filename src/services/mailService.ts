// src/services/MailService.ts
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { config } from "../config";
import "dotenv/config";

export class MailService {
  private transporter;
  private useSendGrid: boolean;

  constructor() {
    this.useSendGrid = !!config.sendgrid.apiKey;
    if (this.useSendGrid) {
      sgMail.setApiKey(config.sendgrid.apiKey);
    } else {
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
  }

  async sendOtpMail(to: string, otp: string) {
    if (this.useSendGrid) {
      const msg = {
        to,
        from: "phalekham@gmail.com", // Thay bằng email đã xác minh trên SendGrid
        subject: "Xác thực tài khoản",
        html: `
          <h2>Mã xác thực của bạn</h2>
          <p>OTP: <b>${otp}</b></p>
          <p>Mã này sẽ hết hạn sau 5 phút.</p>
        `,
      };
      await sgMail.send(msg);
    } else {
      await this.transporter.sendMail({
        from: `"Lit Project" <${config.smtp.user}>`,
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
}
