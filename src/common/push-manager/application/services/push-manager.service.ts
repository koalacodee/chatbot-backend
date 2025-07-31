import { Injectable } from '@nestjs/common';
import { PushSubscriptionRepository } from '../../domain/repositories/push-subscription.repository';
import { PushSubscription } from '../../domain/entities/push-subscription.entity';
import { CreatePushSubscriptionDto } from '../../interface/dto/create-push-subscription.dto';

@Injectable()
export class PushManagerService {
  constructor(
    private readonly pushSubscriptionRepository: PushSubscriptionRepository,
  ) {}

  async register(
    subscriptionData: CreatePushSubscriptionDto,
  ): Promise<PushSubscription> {
    const subscription = PushSubscription.create({
      userId: subscriptionData.userId,
      endpoint: subscriptionData.endpoint,
      expirationTime: subscriptionData.expirationTime
        ? new Date(subscriptionData.expirationTime)
        : null,
      keys: subscriptionData.keys,
    });

    return this.pushSubscriptionRepository.create(subscription);
  }

  async getAllForUser(userId: string): Promise<PushSubscription[]> {
    return this.pushSubscriptionRepository.findByUserId(userId);
  }

  async getById(id: string): Promise<PushSubscription | null> {
    return this.pushSubscriptionRepository.findById(id);
  }

  async update(subscription: PushSubscription): Promise<PushSubscription> {
    return this.pushSubscriptionRepository.update(subscription);
  }

  async delete(id: string): Promise<void> {
    return this.pushSubscriptionRepository.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    return this.pushSubscriptionRepository.deleteByUserId(userId);
  }

  async cleanupExpired(): Promise<void> {
    return this.pushSubscriptionRepository.deleteExpired();
  }
}
