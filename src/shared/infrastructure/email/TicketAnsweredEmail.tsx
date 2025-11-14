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

export interface TicketAnsweredEmailProps {
  name: string;
  code: string;
  subject: string;
  description: string;
  answerContent: string;
  departmentName: string;
  subDepartmentName?: string;
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
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
  ticketInfoCard: {
    background: 'rgba(248, 250, 252, 0.8)',
    border: '1px solid rgba(226, 232, 240, 0.5)',
    borderRadius: '12px',
    padding: '20px',
    margin: '24px 0',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 12px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  infoItem: {
    fontSize: '14px',
    color: '#4b5563',
    margin: '8px 0',
    display: 'flex',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontWeight: '600',
    color: '#374151',
    minWidth: '100px',
    flexShrink: 0,
  },
  infoValue: {
    color: '#1f2937',
    marginLeft: '8px',
    flex: 1,
    wordBreak: 'break-word' as const,
  },
  codeBadge: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    color: '#1e40af',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  badge: {
    display: 'inline-block',
    background: '#dbeafe',
    color: '#1e40af',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    margin: '2px 4px 2px 0',
  },
  answerCard: {
    background: 'rgba(236, 253, 245, 0.8)',
    border: '2px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '12px',
    padding: '24px',
    margin: '24px 0',
  },
  answerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#065f46',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
  },
  answerContent: {
    fontSize: '15px',
    color: '#1f2937',
    lineHeight: '1.7',
    margin: '0',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  ticketDetailsCard: {
    background: 'rgba(240, 249, 255, 0.5)',
    borderRadius: '8px',
    padding: '20px',
    margin: '24px 0',
  },
  ticketDetailsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  ticketDetailsText: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.6',
    margin: '8px 0',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
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

export const TicketAnsweredEmail: React.FC<TicketAnsweredEmailProps> = ({
  name,
  code,
  subject,
  description,
  answerContent,
  departmentName,
  subDepartmentName,
}: TicketAnsweredEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        {`Your support ticket ${code} has been answered. Check the response below.`}
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <Heading as="h1" style={styles.heading}>
              Ticket Answered
            </Heading>
            <Text style={styles.subheading}>
              Your support request has been responded to
            </Text>
          </Section>

          {/* Content Section */}
          <Section style={styles.content}>
            <Text style={styles.greeting}>
              Hello <strong>{name}</strong>,
            </Text>

            <Text style={styles.description}>
              Great news! Your support ticket has been answered. Please find the
              response and ticket details below.
            </Text>

            {/* Ticket Information Card */}
            <div style={styles.ticketInfoCard}>
              <Text style={styles.infoTitle}>Ticket Information</Text>

              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Ticket Code:</span>
                <span style={styles.infoValue}>
                  <span style={styles.codeBadge}>{code}</span>
                </span>
              </div>

              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Subject:</span>
                <span style={styles.infoValue}>{subject}</span>
              </div>

              {subDepartmentName ? (
                <>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Department:</span>
                    <span style={styles.infoValue}>
                      <span style={styles.badge}>{departmentName}</span>
                    </span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Sub-Department:</span>
                    <span style={styles.infoValue}>
                      <span style={styles.badge}>{subDepartmentName}</span>
                    </span>
                  </div>
                </>
              ) : (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Department:</span>
                  <span style={styles.infoValue}>
                    <span style={styles.badge}>{departmentName}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Answer Card */}
            <div style={styles.answerCard}>
              <Text style={styles.answerTitle}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ marginRight: '8px' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Response
              </Text>
              <Text style={styles.answerContent}>{answerContent}</Text>
            </div>

            <Hr style={styles.divider} />

            {/* Ticket Details */}
            <div style={styles.ticketDetailsCard}>
              <Text style={styles.ticketDetailsTitle}>Original Request</Text>
              <Text style={styles.ticketDetailsText}>
                <strong>Description:</strong>
                <br />
                {description}
              </Text>
            </div>
          </Section>

          {/* Footer Section */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              If you have any further questions or concerns, please don't
              hesitate to reach out to our support team.
              <br />
              <br />
              Thank you for using our support system.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TicketAnsweredEmail;
