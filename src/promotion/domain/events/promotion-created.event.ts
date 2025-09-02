import { AudienceType } from '../entities/promotion.entity';

export class PromotionCreatedEvent {
  constructor(
    public readonly title: string,
    public readonly itemId: string,
    public readonly userId: string,
    public readonly occurredAt: Date,
    public readonly audience: AudienceType,
  ) {}
}
