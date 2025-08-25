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
} from '@react-email/components';

export interface TwoFactorEmailProps {
  name: string;
  code: string;
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
  codeBox: {
    display: 'inline-block',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '12px 16px',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 18,
    letterSpacing: 2,
    fontWeight: 700,
    color: '#111827',
    margin: '12px 0',
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

export const TwoFactorEmail: React.FC<TwoFactorEmailProps> = ({
  name,
  code,
}: TwoFactorEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        {`Your verification code is ${code}. Use it to complete your sign-in.`}
      </Preview>
      <Body style={styles.body}>
        <Container>
          <Section>
            <Heading as="h2" style={styles.heading}>
              Two-Factor Authentication
            </Heading>
            <Text style={styles.text}>
              Hello <b>{name}</b>,
            </Text>
            <Text style={styles.text}>
              Use the following verification code to complete your sign-in. This
              code is valid for a limited time and should not be shared with
              anyone.
            </Text>
            <div style={styles.codeBox as React.CSSProperties}>{code}</div>
            <Text style={styles.footer}>
              If you did not request this code, you can safely ignore this
              email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TwoFactorEmail;
