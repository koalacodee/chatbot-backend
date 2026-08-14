import { User } from 'src/shared/entities/user.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';

/**
 * SearchUsersUseCase is the one use-case in this module that reaches for UserRepository
 * rather than ActivityLogRepository, and it only ever calls `search`. The remaining
 * methods are present because the abstract class requires them; reaching one from a test
 * means the test is exercising something it did not intend to.
 */
export class FakeUserRepository extends UserRepository {
  readonly users: User[] = [];

  /** Query strings passed to `search`, in order. */
  readonly searched: string[] = [];

  async search(query: string): Promise<User[]> {
    this.searched.push(query);
    return this.users;
  }

  private unused(method: string): never {
    throw new Error(`FakeUserRepository.${method} was not expected to be called`);
  }

  async existsByEmail(): Promise<boolean> {
    this.unused('existsByEmail');
  }

  async existsById(): Promise<boolean> {
    this.unused('existsById');
  }

  async findByEmail(): Promise<User> {
    this.unused('findByEmail');
  }

  async findById(): Promise<User> {
    this.unused('findById');
  }

  async findBySupervisorId(): Promise<User> {
    this.unused('findBySupervisorId');
  }

  async findByUsername(): Promise<User> {
    this.unused('findByUsername');
  }

  async findByEmployeeId(): Promise<User> {
    this.unused('findByEmployeeId');
  }

  async save(): Promise<User> {
    this.unused('save');
  }

  async delete(): Promise<void> {
    this.unused('delete');
  }
}
