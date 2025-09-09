import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Text,
  Heading,
  Button,
  Section,
  Hr,
} from '@react-email/components';

interface SupportTicketVerificationEmailProps {
  guestName: string;
  ticketSubject: string;
  ticketDescription: string;
  departmentName: string;
  verificationCode: string;
  ticketId: string;
}

export const SupportTicketVerificationEmail = ({
  guestName,
  ticketSubject,
  ticketDescription,
  departmentName,
  verificationCode,
  ticketId,
}: SupportTicketVerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your support ticket - {ticketSubject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Support Ticket Verification</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>Hello {guestName || 'there'},</Text>

            <Text style={text}>
              Thank you for submitting a support ticket. To complete your ticket
              submission, please verify your email address by clicking the
              button below.
            </Text>

            <Section style={ticketInfo}>
              <Heading as="h2" style={h2}>
                Ticket Details
              </Heading>
              <Text style={ticketDetail}>
                <strong>Subject:</strong> {ticketSubject}
              </Text>
              <Text style={ticketDetail}>
                <strong>Department:</strong> {departmentName}
              </Text>
              <Text style={ticketDetail}>
                <strong>Description:</strong> {ticketDescription}
              </Text>
              <Text style={ticketDetail}>
                <strong>Ticket ID:</strong> {ticketId}
              </Text>
            </Section>

            <Section style={codeContainer}>
              <Text style={codeLabel}>Your verification code:</Text>
              <Text style={codeContainer}>{verificationCode}</Text>
            </Section>

            <Text style={text}>
              Please use this verification code to complete your ticket
              submission. The code will expire in 24 hours.
            </Text>

            <Text style={text}>
              If you didn't create this ticket, you can safely ignore this
              email.
            </Text>

            <Hr style={hr} />

            <Text style={footerText}>
              This email was sent to verify your support ticket submission. The
              verification code will expire in 24 hours.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '0 48px',
};

const h1 = {
  color: '#1d1c1d',
  fontSize: '36px',
  fontWeight: '700',
  lineHeight: '40px',
  margin: '0 0 20px',
};

const h2 = {
  color: '#1d1c1d',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '30px',
  margin: '0 0 16px',
};

const content = {
  padding: '0 48px',
};

const text = {
  color: '#000000',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const ticketInfo = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const ticketDetail = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const codeContainer = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const codeLabel = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const verificationCode: React.CSSProperties = {
  color: '#1d1c1d',
  fontSize: '32px',
  fontWeight: '700',
  letterSpacing: '4px',
  fontFamily: 'monospace',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
};
