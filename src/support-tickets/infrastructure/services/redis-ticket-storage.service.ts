import { Injectable } from '@nestjs/common';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { RedisService } from 'src/shared/infrastructure/redis/redis.service';

interface TemporaryTicketData {
  ticket: any;
  verificationToken: string;
  expiresAt: number;
}

@Injectable()
export class RedisTicketStorageService {
  private readonly PREFIX = 'pending-ticket:';
  private readonly EXPIRATION_SECONDS = 24 * 60 * 60; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  async storeTemporaryTicket(
    ticket: SupportTicket,
    verificationToken: string,
  ): Promise<void> {
    const data: TemporaryTicketData = {
      ticket: ticket.toJSON(),
      verificationToken,
      expiresAt: Date.now() + this.EXPIRATION_SECONDS * 1000,
    };

    await this.redisService.set(
      `${this.PREFIX}${verificationToken}`,
      JSON.stringify(data),
      this.EXPIRATION_SECONDS,
    );
  }

  async retrieveTemporaryTicket(
    verificationToken: string,
  ): Promise<TemporaryTicketData | null> {
    const key = `${this.PREFIX}${verificationToken}`;
    const data = await this.redisService.get(key);

    if (!data) return null;

    return JSON.parse(data);
  }

  async deleteTemporaryTicket(verificationToken: string): Promise<void> {
    const key = `${this.PREFIX}${verificationToken}`;
    await this.redisService.del(key);
  }

  async isTokenValid(verificationToken: string): Promise<boolean> {
    const data = await this.retrieveTemporaryTicket(verificationToken);
    if (!data) return false;

    return Date.now() < data.expiresAt;
  }
}
