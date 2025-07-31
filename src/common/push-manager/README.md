# Push Manager Module

A NestJS module for managing push notification subscriptions in a clean architecture style.

## Features

- Register push notification subscriptions from clients (browsers)
- Store subscription information in PostgreSQL
- Retrieve subscriptions by user ID
- Clean architecture with domain-driven design principles
- Full TypeScript support with validation

## API Endpoints

### POST /push/register

Register a new push subscription.

**Request Body:**

```json
{
  "userId": "abc-123",
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "expirationTime": null,
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "userId": "abc-123",
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "expirationTime": null,
    "keys": {
      "p256dh": "...",
      "auth": "..."
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /push/user/:userId

Get all push subscriptions for a specific user.

**Response:**

```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "userId": "abc-123",
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "expirationTime": null,
      "keys": {
        "p256dh": "...",
        "auth": "..."
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /push/send/users

Send push notifications to multiple users.

**Request Body:**

```json
{
  "userIds": ["user-1", "user-2", "user-3"],
  "notification": {
    "title": "New Message",
    "body": "You have received a new message",
    "data": {
      "type": "message",
      "messageId": "msg-123"
    },
    "icon": "/icon.png",
    "badge": "/badge.png",
    "image": "/image.jpg",
    "tag": "message",
    "url": "/messages",
    "actions": ["view", "dismiss"]
  }
}
```

**Response:**

```json
{
  "status": "success",
  "data": [
    {
      "recipientId": "user-1",
      "recipientType": "user",
      "success": true,
      "subscriptionResults": [
        {
          "subscriptionId": "sub-123",
          "success": true
        }
      ]
    },
    {
      "recipientId": "user-2",
      "recipientType": "user",
      "success": false,
      "error": "No push subscriptions found for user"
    }
  ]
}
```

### POST /push/send/guests

Send push notifications to multiple guests.

**Request Body:**

```json
{
  "guestIds": ["guest-1", "guest-2"],
  "notification": {
    "title": "Welcome!",
    "body": "Welcome to our platform",
    "data": {
      "type": "welcome"
    }
  }
}
```

### POST /push/send/mixed

Send push notifications to both users and guests in a single request.

**Request Body:**

```json
{
  "userIds": ["user-1", "user-2"],
  "guestIds": ["guest-1"],
  "notification": {
    "title": "System Update",
    "body": "System will be down for maintenance",
    "data": {
      "type": "maintenance",
      "duration": "2 hours"
    }
  }
}
```

## Usage

### Import the module

```typescript
import { PushManagerModule } from 'src/common/push-manager';

@Module({
  imports: [PushManagerModule],
  // ...
})
export class YourModule {}
```

### Inject the services

```typescript
import {
  PushManagerService,
  PushNotificationService,
} from 'src/common/push-manager';

@Injectable()
export class YourService {
  constructor(
    private readonly pushManagerService: PushManagerService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async registerSubscription(data: CreatePushSubscriptionDto) {
    return this.pushManagerService.register(data);
  }

  async getUserSubscriptions(userId: string) {
    return this.pushManagerService.getAllForUser(userId);
  }

  async sendNotificationToUsers(
    userIds: string[],
    notification: SendNotificationDto,
  ) {
    return this.pushNotificationService.sendToUsers(userIds, notification);
  }

  async sendNotificationToGuests(
    guestIds: string[],
    notification: SendNotificationDto,
  ) {
    return this.pushNotificationService.sendToGuests(guestIds, notification);
  }

  async sendNotificationToMixed(
    userIds: string[],
    guestIds: string[],
    notification: SendNotificationDto,
  ) {
    return this.pushNotificationService.sendToMixedRecipients(
      userIds,
      guestIds,
      notification,
    );
  }
}
```

## Database Schema

The module creates a `push_subscriptions` table with the following structure:

- `id` (UUID, Primary Key)
- `user_id` (String)
- `endpoint` (String)
- `expiration_time` (DateTime, Nullable)
- `keys` (JSON)
- `created_at` (DateTime)
- `updated_at` (DateTime)

## Architecture

The module follows clean architecture principles:

- **Domain Layer**: Entities and repository interfaces
- **Application Layer**: Services and use cases
- **Infrastructure Layer**: Repository implementations
- **Interface Layer**: Controllers and DTOs

## Validation

All inputs are validated using `class-validator` decorators:

- `userId`: Required string
- `endpoint`: Required string
- `expirationTime`: Optional ISO date string
- `keys`: Required object with `p256dh` and `auth` properties
