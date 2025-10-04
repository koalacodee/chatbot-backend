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
  Button,
  Hr,
} from '@react-email/components';

export interface InviteEmployeeEmailProps {
  name: string;
  token: string;
  baseUrl: string;
  jobTitle?: string;
  subDepartmentNames?: string[];
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
    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
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
  infoCard: {
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
    alignItems: 'center',
  },
  infoLabel: {
    fontWeight: '600',
    color: '#374151',
    minWidth: '80px',
  },
  infoValue: {
    color: '#1f2937',
    marginLeft: '8px',
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
  button: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
    color: '#ffffff',
    padding: '16px 32px',
    borderRadius: '12px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '16px',
    margin: '24px 0',
    textAlign: 'center' as const,
    boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.3)',
    transition: 'all 0.2s ease',
  },
  featuresList: {
    background: 'rgba(240, 249, 255, 0.5)',
    borderRadius: '8px',
    padding: '20px',
    margin: '24px 0',
  },
  featuresTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  featuresListItems: {
    margin: '0',
    paddingLeft: '20px',
    color: '#475569',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  featuresListItem: {
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

export const InviteEmployeeEmail: React.FC<InviteEmployeeEmailProps> = ({
  name,
  token,
  baseUrl,
  jobTitle,
  subDepartmentNames,
}: InviteEmployeeEmailProps) => {
  const inviteLink = `${baseUrl}?token=${token}`;

  return (
    <Html>
      <Head />
      <Preview>
        {`You're invited to join as an Employee. Complete your registration to get started!`}
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <Heading as="h1" style={styles.heading}>
              Employee Invitation
            </Heading>
            <Text style={styles.subheading}>
              Complete your registration to get started
            </Text>
          </Section>

          {/* Content Section */}
          <Section style={styles.content}>
            <Text style={styles.greeting}>
              Hello <strong>{name}</strong>,
            </Text>

            <Text style={styles.description}>
              You have been invited to join as an <strong>Employee</strong> on
              our platform. We're excited to have you on board! Please complete
              your registration to access your account and start your work.
            </Text>

            {/* Invitation Details Card */}
            {(jobTitle || subDepartmentNames?.length) && (
              <div style={styles.infoCard}>
                <Text style={styles.infoTitle}>Invitation Details</Text>

                {jobTitle && (
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Position:</span>
                    <span style={styles.infoValue}>{jobTitle}</span>
                  </div>
                )}

                {subDepartmentNames?.length && (
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Departments:</span>
                    <div style={{ marginLeft: '8px' }}>
                      {subDepartmentNames.map((dept, index) => (
                        <span key={index} style={styles.badge}>
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CTA Button */}
            <div style={{ textAlign: 'center' }}>
              <Button href={inviteLink} style={styles.button}>
                Complete Registration
              </Button>
            </div>

            <Hr style={styles.divider} />

            {/* Features List */}
            <div style={styles.featuresList}>
              <Text style={styles.featuresTitle}>
                After completing registration, you'll be able to:
              </Text>
              <ul style={styles.featuresListItems}>
                <li style={styles.featuresListItem}>
                  Set up your username and secure password
                </li>
                <li style={styles.featuresListItem}>
                  Upload a profile picture (optional)
                </li>
                <li style={styles.featuresListItem}>
                  Review and confirm your information
                </li>
                <li style={styles.featuresListItem}>
                  Access your employee dashboard
                </li>
                <li style={styles.featuresListItem}>
                  Start working on assigned tasks
                </li>
              </ul>
            </div>
          </Section>

          {/* Footer Section */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              If you did not expect this invitation, you can safely ignore this
              email.
              <br />
              This invitation link will expire after 7 days for security
              purposes.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default InviteEmployeeEmail;
