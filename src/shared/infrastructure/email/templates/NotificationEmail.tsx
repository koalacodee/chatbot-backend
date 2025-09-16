// NotificationEmail.tsx
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
import Briefcase from './icons/Briefcase';
import Bell from './icons/Bell';
import UserPlus from './icons/UserPlus';

// Notification types from the backend
type NotificationType =
  | 'staff_request_created'
  | 'staff_request_resolved'
  | 'task_created'
  | 'task_approved'
  | 'task_rejected'
  | 'task_submitted'
  | 'ticket_assigned'
  | 'ticket_created'
  | 'ticket_reopened'
  | 'ticket_opened';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationEmailProps {
  notification: AppNotification;
  dashboardUrl: string;
  count?: number;
}

// Message generation based on notification type and title
const generateNotificationMessage = (
  notification: AppNotification,
  count?: number,
): string => {
  const { type, title } = notification;

  switch (type) {
    // Staff Request notifications
    case 'staff_request_created':
      return `A new staff request has been created: "${title}".`;
    case 'staff_request_resolved':
      return `Staff request "${title}" has been resolved.`;

    // Task notifications
    case 'task_created':
      return `A new task has been created: "${title}".`;
    case 'task_approved':
      return `Your task "${title}" has been approved and completed.`;
    case 'task_rejected':
      return `Your task "${title}" was rejected and requires changes.`;
    case 'task_submitted':
      return `Task "${title}" has been submitted for review.`;

    // Ticket notifications
    case 'ticket_assigned':
      return `Ticket "${title}" has been assigned to you.`;
    case 'ticket_created':
    case 'ticket_opened':
      return `A new ticket has been created: "${title}".`;
    case 'ticket_reopened':
      return `Ticket "${title}" has been reopened for review.`;

    default:
      return `New notification: ${title}`;
  }
};

// Map notification types to their corresponding sidebar hrefs
const getNotificationHref = (type: NotificationType): string => {
  switch (type) {
    // Task notifications -> Tasks page
    case 'task_created':
    case 'task_approved':
    case 'task_rejected':
    case 'task_submitted':
      return '/tasks';

    // Ticket notifications -> Tickets page
    case 'ticket_assigned':
    case 'ticket_created':
    case 'ticket_reopened':
    case 'ticket_opened':
      return '/tickets';

    // Staff request notifications -> Staff Requests page
    case 'staff_request_created':
    case 'staff_request_resolved':
      return '/staff-requests';

    default:
      return '/';
  }
};

// Notification configuration based on type
const getNotificationConfig = (type: NotificationType) => {
  // Group types by category for consistent styling
  const getCategoryConfig = (notificationType: NotificationType) => {
    if (notificationType.startsWith('task_')) {
      return {
        icon: <Briefcase width={32} height={32} />,
        buttonText: 'Go to Tasks',
        href: getNotificationHref(notificationType),
        primaryColor: '#dc2626',
      };
    }

    if (notificationType.startsWith('ticket_')) {
      return {
        icon: <Bell width={32} height={32} />,
        buttonText: 'Go to Tickets',
        href: getNotificationHref(notificationType),
        primaryColor: '#2563eb',
      };
    }

    if (notificationType.startsWith('staff_request_')) {
      return {
        icon: <UserPlus width={32} height={32} />,
        buttonText: 'Go to Team',
        href: getNotificationHref(notificationType),
        primaryColor: '#16a34a',
      };
    }

    // Default configuration
    return {
      icon: <Bell width={32} height={32} />,
      buttonText: 'View Details',
      href: '/',
      primaryColor: '#6b7280',
    };
  };

  return getCategoryConfig(type);
};

const styles = {
  body: {
    backgroundColor: '#f9fafb',
    fontFamily: 'Arial, sans-serif',
    padding: '48px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    maxWidth: 480,
    margin: '0 auto',
    padding: '32px',
    border: '1px solid #e5e7eb',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  icon: {
    fontSize: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 8px',
  },
  message: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 1.5,
    margin: '0 0 16px',
  },
  count: {
    fontSize: 14,
    color: '#6b7280',
  },
  button: {
    display: 'inline-block',
    padding: '12px 28px',
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 16,
    textDecoration: 'none',
    color: '#ffffff',
    marginTop: 24,
  },
  footer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center' as const,
    marginTop: 32,
  },
  hr: {
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    margin: '32px 0',
  },
};

export const NotificationEmail: React.FC<NotificationEmailProps> = ({
  notification,
  count,
  dashboardUrl,
}) => {
  const { type, title } = notification;
  const config = getNotificationConfig(type);
  const message = generateNotificationMessage(notification, count);

  return (
    <Html>
      <Head />
      <Preview>{message}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <div style={styles.icon}>{config.icon}</div>
            <Heading as="h2" style={styles.title}>
              {title}
            </Heading>
          </Section>

          <Section>
            <Text style={styles.message}>{message}</Text>
            {count !== undefined && count > 1 && (
              <Text style={styles.count}>Total: {count} items</Text>
            )}
          </Section>

          <Section style={{ textAlign: 'center' }}>
            <Button
              href={`${dashboardUrl}${config.href}`}
              style={{
                ...styles.button,
                backgroundColor: config.primaryColor,
              }}
            >
              {config.buttonText}
            </Button>
          </Section>

          <Hr style={styles.hr} />

          <Section>
            <Text style={styles.footer}>
              You received this email because you have notifications enabled in
              your account.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default NotificationEmail;
