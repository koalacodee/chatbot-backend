import { User } from '../entities/user.entity';

export abstract class UserRepository {
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract findByEmail(email: string): Promise<User>;
  abstract findById(id: string): Promise<User>;
  abstract create(user: User): Promise<User>;
}
