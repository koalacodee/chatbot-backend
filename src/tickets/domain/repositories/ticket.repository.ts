import { Ticket } from '../entities/ticket.entity';

export abstract class TicketRepository {
  abstract save(point: Ticket): Promise<Ticket>;
  abstract saveMany(points: Ticket[]): Promise<Ticket[]>;
  abstract findById(id: string): Promise<Ticket | null>;
  abstract findByIds(ids: string[]): Promise<Ticket[]>;
  abstract removeById(id: string): Promise<Ticket | null>;
  abstract removeByIds(ids: string[]): Promise<Ticket[]>;
  abstract count(): Promise<number>;
  abstract exists(id: string): Promise<boolean>;
  abstract findAll(offset?: number, limit?: number): Promise<Ticket[]>;
}
