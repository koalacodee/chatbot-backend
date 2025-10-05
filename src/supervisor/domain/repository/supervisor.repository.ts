import { Supervisor } from '../entities/supervisor.entity';

export interface SupervisorSummary {
  name: string;
  profilePicture: string;
  username: string;
  id: string;
}

export abstract class SupervisorRepository {
  abstract save(supervisor: Supervisor): Promise<Supervisor>;

  abstract findById(id: string): Promise<Supervisor | null>;

  abstract findByUserId(userId: string): Promise<Supervisor | null>;

  abstract findAll(): Promise<Supervisor[]>;

  abstract delete(id: string): Promise<void>;

  abstract exists(id: string): Promise<boolean>;

  abstract update(id: string, supervisor: Supervisor): Promise<void>;

  abstract count(): Promise<number>;

  abstract findManyByDepartmentId(departmentId: string): Promise<Supervisor[]>;

  abstract search(query: string): Promise<Supervisor[]>;

  abstract canDelete(id: string): Promise<boolean>;

  abstract getSupervisorSummaries(
    departmentIds?: string[],
  ): Promise<SupervisorSummary[]>;
}
