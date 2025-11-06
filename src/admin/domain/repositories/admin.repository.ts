import { Admin } from '../entities/admin.entity';

export abstract class AdminRepository {
  abstract save(admin: Admin): Promise<Admin>;
  abstract findById(id: string): Promise<Admin | null>;
  abstract findAll(): Promise<Admin[]>;
  abstract removeById(id: string): Promise<Admin | null>;

  abstract findByIds(ids: string[]): Promise<Admin[]>;
  abstract update(id: string, update: Partial<Admin>): Promise<Admin>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
  abstract findByUserId(userId: string): Promise<Admin | null>;
}