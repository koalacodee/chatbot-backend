export class PushSubscriptionResponseDto {
  id: string;
  userId: string;
  endpoint: string;
  expirationTime: string | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
  updatedAt: string;
}
