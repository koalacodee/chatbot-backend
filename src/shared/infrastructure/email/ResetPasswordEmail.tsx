import React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
} from '@react-email/components';

export interface ResetPasswordEmailProps {
  name: string;
  code: string;
}

const styles = {
  body: {
    background:
      'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 30%, #f0f9ff 100%)',
    color: '#1e293b',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: '24px',
    minHeight: '100vh',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    boxShadow:
      '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%)',
    padding: '32px 24px',
    textAlign: 'center' as const,
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
  },
  iconContainer: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  icon: {
    width: '24px',
    height: '24px',
    color: '#ffffff',
  },
  heading: {
    color: '#1e293b',
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    lineHeight: '1.2',
  },
  subheading: {
    color: '#64748b',
    fontSize: '16px',
    margin: '0',
    fontWeight: '400',
  },
  content: {
    padding: '32px 24px',
  },
  greeting: {
    fontSize: '18px',
    color: '#1e293b',
    margin: '0 0 16px 0',
    fontWeight: '500',
  },
  description: {
    fontSize: '16px',
    color: '#475569',
    lineHeight: '1.6',
    margin: '0 0 24px 0',
  },
  codeContainer: {
    background: 'rgba(248, 250, 252, 0.8)',
    border: '2px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    padding: '24px',
    margin: '24px 0',
    textAlign: 'center' as const,
  },
  codeLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 12px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  codeBox: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    padding: '16px 24px',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '24px',
    letterSpacing: '3px',
    fontWeight: '700',
    color: '#dc2626',
    margin: '8px 0',
    boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.2)',
  },
  warningCard: {
    background: 'rgba(254, 226, 226, 0.5)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    margin: '24px 0',
  },
  warningText: {
    fontSize: '14px',
    color: '#dc2626',
    margin: '0',
    fontWeight: '500',
    textAlign: 'center' as const,
  },
  securityInfo: {
    background: 'rgba(240, 249, 255, 0.5)',
    borderRadius: '8px',
    padding: '20px',
    margin: '24px 0',
  },
  securityTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  securityList: {
    margin: '0',
    paddingLeft: '20px',
    color: '#475569',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  securityListItem: {
    margin: '8px 0',
  },
  footer: {
    background: 'rgba(248, 250, 252, 0.5)',
    padding: '24px',
    textAlign: 'center' as const,
    borderTop: '1px solid rgba(226, 232, 240, 0.5)',
  },
  footerText: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0',
    lineHeight: '1.5',
  },
  divider: {
    border: 'none',
    height: '1px',
    background:
      'linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%)',
    margin: '24px 0',
  },
};

export const ResetPasswordEmail: React.FC<ResetPasswordEmailProps> = ({
  name,
  code,
}: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        {`Your password reset code is ${code}. Use it to reset your password securely.`}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header Section */}
          <Section style={styles.header}>
            <div style={styles.iconContainer}>
              <svg
                style={styles.icon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <Heading as="h1" style={styles.heading}>
              Password Reset Request
            </Heading>
            <Text style={styles.subheading}>
              Secure your account with a new password
            </Text>
          </Section>

          {/* Content Section */}
          <Section style={styles.content}>
            <Text style={styles.greeting}>
              Hello <strong>{name}</strong>,
            </Text>

            <Text style={styles.description}>
              You have requested to reset your password. Use the verification
              code below to complete the password reset process. This code is
              valid for a limited time and should not be shared with anyone.
            </Text>

            {/* Reset Code Container */}
            <div style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Your Reset Code</Text>
              <div style={styles.codeBox}>{code}</div>
            </div>

            {/* Warning Card */}
            <div style={styles.warningCard}>
              <Text style={styles.warningText}>
                ⚠️ This code will expire in 15 minutes for security purposes
              </Text>
            </div>

            <Hr style={styles.divider} />

            {/* Security Information */}
            <div style={styles.securityInfo}>
              <Text style={styles.securityTitle}>Security Information</Text>
              <ul style={styles.securityList}>
                <li style={styles.securityListItem}>
                  This code is unique to your account and cannot be reused
                </li>
                <li style={styles.securityListItem}>
                  Never share this code with anyone, including our support team
                </li>
                <li style={styles.securityListItem}>
                  If you didn't request this reset, please ignore this email
                </li>
                <li style={styles.securityListItem}>
                  Your account remains secure until you complete the reset
                </li>
              </ul>
            </div>
          </Section>

          {/* Footer Section */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              If you did not request this password reset, you can safely ignore
              this email and your account will remain secure.
              <br />
              This is an automated message. Please do not reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ResetPasswordEmail;
