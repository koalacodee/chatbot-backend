import { PushSubscription } from '../entities/push-subscription.entity';

export abstract class PushSubscriptionRepository {
  abstract create(subscription: PushSubscription): Promise<PushSubscription>;
  abstract findByUserId(userId: string): Promise<PushSubscription[]>;
  abstract findById(id: string): Promise<PushSubscription | null>;
  abstract update(subscription: PushSubscription): Promise<PushSubscription>;
  abstract delete(id: string): Promise<void>;
  abstract deleteByUserId(userId: string): Promise<void>;
  abstract deleteExpired(): Promise<void>;
}
