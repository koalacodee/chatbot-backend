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
} from '@react-email/components';

export interface InviteEmployeeEmailProps {
  name: string;
  token: string;
  baseUrl: string;
}

const styles = {
  body: {
    background: '#ffffff',
    color: '#222',
    fontFamily: 'Arial, sans-serif',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    maxWidth: 480,
    margin: '0 auto',
    padding: 32,
    border: '1px solid #2563eb',
  },
  heading: {
    color: '#2563eb',
    marginBottom: 8,
  },
  text: {
    margin: '16px 0',
  },
  button: {
    display: 'inline-block',
    background: '#2563eb',
    color: '#ffffff',
    padding: '12px 28px',
    borderRadius: 4,
    textDecoration: 'none',
    fontWeight: 600,
    margin: '24px 0',
  },
  footer: {
    fontSize: 12,
    color: '#666',
    marginTop: 32,
  },
};

export const InviteEmployeeEmail: React.FC<InviteEmployeeEmailProps> = ({
  name,
  token,
  baseUrl,
}: InviteEmployeeEmailProps) => {
  const inviteLink = `${baseUrl}?token=${token}`;
  return (
    <Html>
      <Head />
      <Preview>
        {`You're invited to join as an Employee. Click to accept your invitation!`}
      </Preview>
      <Body style={styles.body}>
        <Container>
          <Section>
            <Heading as="h2" style={styles.heading}>
              Employment Invitation
            </Heading>
            <Text style={styles.text}>
              Hello <b>{name}</b>,
            </Text>
            <Text style={styles.text}>
              You have been invited to join as an <b>Employee</b> on our
              platform. Please click the button below to accept your invitation
              and set up your account.
            </Text>
            <Button href={inviteLink} style={styles.button}>
              Accept Invitation
            </Button>
            <Text style={styles.footer}>
              If you did not expect this invitation, you can safely ignore this
              email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default InviteEmployeeEmail;
