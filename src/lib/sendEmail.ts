import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailParams) => {
  try {
    const data = await resend.emails.send({
      // IMPORTANT: Until your domain (nomo-store.com) is verified in Resend,
      // you must use 'onboarding@resend.dev' as the from address, and you can
      // ONLY send emails to the email address associated with your Resend account.
      // Once verified, add RESEND_FROM_EMAIL to your Vercel Environment Variables.
      from: process.env.RESEND_FROM_EMAIL || 'Nomo Store <hello@nomostores.com>', 
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
};
