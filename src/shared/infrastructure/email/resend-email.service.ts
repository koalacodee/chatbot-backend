import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import * as React from 'react';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

@Injectable()
export class ResendEmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private readonly resend: Resend;
  private readonly defaultFrom: string;

  constructor(
    private readonly config: ConfigService,
    @InjectQueue('mails') private readonly mailsQueue: Queue,
  ) {
    const apiKey = config.get('RESEND_API_KEY');
    if (!apiKey) throw new Error('RESEND_API_KEY is not set');
    this.resend = new Resend(apiKey);
    const resendFrom = config.get('RESEND_FROM');
    if (!resendFrom) {
      throw new Error('RESEND_FROM is not set');
    }
    this.defaultFrom = resendFrom;
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    console.log(options);

    try {
      const res = await this.resend.emails.send({
        from: this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}`);
      console.log(res);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Send an email using a React Email component as the template.
   * Best practice: Use semantic components (Html, Head, Preview, Body) in the template for compatibility.
   * Optionally, generate a plain text version for better deliverability.
   * @param to Recipient(s)
   * @param subject Email subject
   * @param Component React component (email template)
   * @param props Props for the React component
   */
  async sendReactEmail<T>(
    to: string | string[],
    subject: string,
    Component: React.ComponentType<T>,
    props: T,
  ): Promise<void> {
    // Best practice: The Component should use <Html>, <Head>, <Preview>, <Body> from @react-email/components
    // Optionally, generate a plain text version for better deliverability
    const html = await render(React.createElement(Component, props));
    // If you want to add plain text:
    // const text = ... // generate plain text version here
    await this.mailsQueue.add('send', { to, subject, html });
  }
}
