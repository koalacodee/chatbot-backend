import { User } from '../entities/user.entity';

export interface UserQuery {
  includeEntity: boolean;
}

export abstract class UserRepository {
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract existsById(id: string): Promise<boolean>;
  abstract findByEmail(email: string, query?: UserQuery): Promise<User>;
  abstract findById(id: string, query?: UserQuery): Promise<User>;
  abstract findBySupervisorId(id: string, query?: UserQuery): Promise<User>;
  abstract findByUsername(
    username: string,
    query?: UserQuery,
  ): Promise<User | null>;
  abstract findByEmployeeId(
    employeeId: string,
    query?: UserQuery,
  ): Promise<User | null>;
  abstract save(user: User): Promise<User>;
  abstract search(query: string): Promise<User[]>;
}
