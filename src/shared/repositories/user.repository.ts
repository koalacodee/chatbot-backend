import { User } from '../entities/user.entity';

export abstract class UserRepository {
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract existsById(id: string): Promise<boolean>;
  abstract findByEmail(email: string): Promise<User>;
  abstract findById(id: string): Promise<User>;
  abstract findBySupervisorId(id: string): Promise<User>;
  abstract findByUsername(username: string): Promise<User | null>;
  abstract findByEmployeeId(employeeId: string): Promise<User | null>;
  abstract save(user: User): Promise<User>;
}
