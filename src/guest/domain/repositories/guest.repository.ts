import { Guest } from '../entities/guest.entity';

export abstract class GuestRepository {
  abstract save(guest: Guest): Promise<Guest>;
  abstract findById(id: string): Promise<Guest | null>;
  abstract findByEmail(email: string): Promise<Guest | null>;
  abstract findByPhone(phone: string): Promise<Guest | null>;
  abstract findAll(offset?: number, limit?: number): Promise<Guest[]>;
  abstract removeById(id: string): Promise<Guest | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract existsByPhone(email: string): Promise<boolean>;
  abstract count(): Promise<number>;
}
