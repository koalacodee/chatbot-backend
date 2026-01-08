import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../../common/drizzle/drizzle.service';
import {
  DepartmentQueryDto,
  DepartmentRepository,
} from '../../domain/repositories/department.repository';
import {
  Department,
  DepartmentVisibility,
} from '../../domain/entities/department.entity';
import { Question } from '../../../questions/domain/entities/question.entity';
import { KnowledgeChunk } from '../../../knowledge-chunks/domain/entities/knowledge-chunk.entity';
import {
  departments,
  questions,
  knowledgeChunks,
  supervisors,
  departmentToSupervisor,
  tickets,
  supportTickets,
  employeeSubDepartments,
  tasks,
} from '../../../common/drizzle/schema';
import {
  eq,
  inArray,
  and,
  or,
  isNull,
  isNotNull,
  sql,
  ilike,
  count,
  desc,
} from 'drizzle-orm';

@Injectable()
export class DrizzleDepartmentRepository extends DepartmentRepository {
  constructor(private readonly drizzleService: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private toDomainVisibility(visibility: string): DepartmentVisibility {
    return visibility.toUpperCase() as DepartmentVisibility;
  }

  private fromDomainVisibility(
    visibility: DepartmentVisibility,
  ): 'public' | 'private' {
    return visibility.toLowerCase() as 'public' | 'private';
  }

  private toDomain(
    dept: typeof departments.$inferSelect,
    relations?: {
      questions?: (typeof questions.$inferSelect)[];
      knowledgeChunks?: (typeof knowledgeChunks.$inferSelect)[];
      subDepartments?: (typeof departments.$inferSelect)[];
      parent?: typeof departments.$inferSelect;
    },
  ): Department {
    return Department.create({
      id: dept.id,
      name: dept.name,
      visibility: this.toDomainVisibility(dept.visibility),
      parentId: dept.parentId || undefined,
      parent: relations?.parent
        ? Department.create({
          id: relations.parent.id,
          name: relations.parent.name,
          visibility: this.toDomainVisibility(relations.parent.visibility),
          parentId: relations.parent.parentId || undefined,
        })
        : undefined,
      questions: relations?.questions
        ? relations.questions.map((q) =>
          Question.create({
            id: q.id,
            text: q.text,
            departmentId: q.departmentId,
            knowledgeChunkId: q.knowledgeChunkId || undefined,
            creatorEmployeeId: q.creatorEmployeeId,
            creatorAdminId: q.creatorAdminId || undefined,
            creatorSupervisorId: q.creatorSupervisorId || undefined,
            satisfaction: q.satisfaction,
            dissatisfaction: q.dissatisfaction,
            views: q.views,
          }),
        )
        : [],
      knowledgeChunks: relations?.knowledgeChunks
        ? relations.knowledgeChunks.map((kc) =>
          KnowledgeChunk.create({
            id: kc.id,
            content: kc.content,
            departmentId: kc.departmentId,
            pointId: kc.pointId || undefined,
          }),
        )
        : [],
      subDepartments: relations?.subDepartments
        ? relations.subDepartments.map((sd) =>
          Department.create({
            id: sd.id,
            name: sd.name,
            visibility: this.toDomainVisibility(sd.visibility),
            parentId: sd.parentId || undefined,
          }),
        )
        : [],
    });
  }

  async save(
    department: Department,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department> {
    const data = {
      id: department.id.toString(),
      name: department.name,
      visibility: this.fromDomainVisibility(department.visibility),
      parentId: department.parentId.toString() || null,
      updatedAt: sql`CURRENT_TIMESTAMP` as any,
    };

    const [saved] = await this.db
      .insert(departments)
      .values(data)
      .onConflictDoUpdate({
        target: departments.id,
        set: {
          name: data.name,
          visibility: data.visibility,
          parentId: data.parentId,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning();

    return this.toDomain(saved);
  }

  async findById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null> {
    const [dept] = await this.db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    if (!dept) return null;

    return this.toDomain(dept);
  }

  async findByIds(
    ids: string[],
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]> {
    if (ids.length === 0) return [];

    const depts = await this.db
      .select()
      .from(departments)
      .where(inArray(departments.id, ids));

    return depts.map((dept) => this.toDomain(dept));
  }

  async findAll(queryDto?: DepartmentQueryDto): Promise<Department[]> {
    const depts = await this.db.select().from(departments);

    return depts.map((dept) => this.toDomain(dept));
  }

  async removeById(id: string): Promise<void> {
    await this.db.delete(departments).where(eq(departments.id, id));
  }

  async removeMainDepartmentById(id: string): Promise<void> {
    return this.removeById(id);
  }

  async removeSubDepartmentById(id: string): Promise<void> {
    return this.removeById(id);
  }

  async removeByIds(ids: string[]): Promise<void> {
    await this.db.delete(departments).where(inArray(departments.id, ids));
  }

  async update(id: string, update: Partial<Department>): Promise<Department> {
    const data: typeof departments.$inferInsert | undefined =
      {} as typeof departments.$inferInsert;
    if (update.name) data.name = update.name;
    if (update.visibility)
      data.visibility = this.fromDomainVisibility(update.visibility);

    const [updated] = await this.db
      .update(departments)
      .set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(departments.id, id))
      .returning();

    return this.toDomain(updated);
  }

  async updateMainDepartment(
    id: string,
    update: Partial<Department>,
  ): Promise<Department> {
    const isMain = await this.isMainDepartment(id);
    if (!isMain) {
      throw new Error('Department is not a main department');
    }

    return this.update(id, update);
  }

  async updateSubDepartment(
    id: string,
    update: Partial<Department>,
    query?: DepartmentQueryDto,
  ): Promise<Department> {
    const isSub = await this.isSubDepartment(id);
    if (!isSub) {
      throw new Error('Department is not a sub-department');
    }

    const data: any = {};
    if (update.name) data.name = update.name;
    if (update.parent) {
      data.parentId = update.parent.id.toString();
    }

    const [updated] = await this.db
      .update(departments)
      .set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(departments.id, id))
      .returning();

    return this.findById(updated.id, query) as Promise<Department>;
  }

  async exists(id: string): Promise<boolean> {
    const [result] = await this.db
      .select({ count: count() })
      .from(departments)
      .where(eq(departments.id, id));

    return (result?.count ?? 0) > 0;
  }

  async count(): Promise<number> {
    const [result] = await this.db.select({ count: count() }).from(departments);

    return result?.count ?? 0;
  }

  async findByCriteria(criteria: Partial<Department>): Promise<Department[]> {
    const conditions = [];
    if (criteria.name) {
      conditions.push(eq(departments.name, criteria.name));
    }
    if (criteria.visibility) {
      conditions.push(
        eq(
          departments.visibility,
          this.fromDomainVisibility(criteria.visibility),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const depts = await this.db.select().from(departments).where(whereClause);

    return depts.map((dept) => this.toDomain(dept));
  }

  async findAllSubDepartments(
    queryDto?: Omit<DepartmentQueryDto, 'includeSubDepartments'>,
    departmentId?: string,
  ): Promise<Department[]> {
    const conditions = [isNotNull(departments.parentId)];
    if (departmentId) {
      conditions.push(eq(departments.parentId, departmentId));
    }

    const rows = await this.db
      .select()
      .from(departments)
      .where(and(...conditions));

    return rows.map((row) => this.toDomain(row));
  }

  async findMainDepartmentById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null> {
    const [dept] = await this.db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    return dept ? this.toDomain(dept) : null;
  }

  async findSubDepartmentById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null> {
    const [dept] = await this.db
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), isNotNull(departments.parentId)))
      .limit(1);

    if (!dept) return null;

    return this.toDomain(dept);
  }

  async findAllDepartments(
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]> {
    const rows = await this.db
      .select()
      .from(departments)
      .where(isNull(departments.parentId));

    return rows.map((row) => this.toDomain(row));
  }

  async canDelete(
    departmentId: string,
    isSubDepartment: boolean = false,
  ): Promise<boolean> {
    if (isSubDepartment) {
      if (!(await this.findSubDepartmentById(departmentId))) return false;
    } else {
      if (!(await this.findMainDepartmentById(departmentId))) return false;
    }

    const hasRelation = async (promise: Promise<number>): Promise<boolean> =>
      (await promise) > 0;

    // Check questions
    const [questionCount] = await this.db
      .select({ count: count() })
      .from(questions)
      .where(eq(questions.departmentId, departmentId));
    if ((questionCount?.count ?? 0) > 0) return false;

    // Check knowledge chunks
    const [knowledgeChunkCount] = await this.db
      .select({ count: count() })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.departmentId, departmentId));
    if ((knowledgeChunkCount?.count ?? 0) > 0) return false;

    // Check supervisors
    const [supervisorCount] = await this.db
      .select({ count: count() })
      .from(departmentToSupervisor)
      .where(eq(departmentToSupervisor.a, departmentId));
    if ((supervisorCount?.count ?? 0) > 0) return false;

    // Check tickets
    const [ticketCount] = await this.db
      .select({ count: count() })
      .from(tickets)
      .where(eq(tickets.departmentId, departmentId));
    if ((ticketCount?.count ?? 0) > 0) return false;

    // Check sub-departments
    const [subDeptCount] = await this.db
      .select({ count: count() })
      .from(departments)
      .where(eq(departments.parentId, departmentId));
    if ((subDeptCount?.count ?? 0) > 0) return false;

    // Check support tickets
    const [supportTicketCount] = await this.db
      .select({ count: count() })
      .from(supportTickets)
      .where(eq(supportTickets.departmentId, departmentId));
    if ((supportTicketCount?.count ?? 0) > 0) return false;

    // Check employee sub-departments
    const [employeeSubDeptCount] = await this.db
      .select({ count: count() })
      .from(employeeSubDepartments)
      .where(eq(employeeSubDepartments.departmentId, departmentId));
    if ((employeeSubDeptCount?.count ?? 0) > 0) return false;

    // Check tasks
    const [taskCount] = await this.db
      .select({ count: count() })
      .from(tasks)
      .where(
        or(
          eq(tasks.targetDepartmentId, departmentId),
          eq(tasks.targetSubDepartmentId, departmentId),
        ),
      );
    if ((taskCount?.count ?? 0) > 0) return false;

    return true;
  }

  async isMainDepartment(id: string): Promise<boolean> {
    const [result] = await this.db
      .select({ count: count() })
      .from(departments)
      .where(and(eq(departments.id, id), isNull(departments.parentId)));

    return (result?.count ?? 0) > 0;
  }

  async isSubDepartment(id: string): Promise<boolean> {
    const [result] = await this.db
      .select({ count: count() })
      .from(departments)
      .where(and(eq(departments.id, id), isNotNull(departments.parentId)));

    return (result?.count ?? 0) > 0;
  }

  async viewMainDepartments(options?: {
    limit?: number;
    page?: number;
  }): Promise<Department[]> {
    const { limit = 10, page = 1 } = options || {};
    const skip = (page - 1) * limit;

    const depts = await this.db
      .select()
      .from(departments)
      .where(
        and(isNull(departments.parentId), eq(departments.visibility, 'public')),
      )
      .limit(limit)
      .offset(skip);

    return Promise.all(depts.map((dept) => this.toDomain(dept)));
  }

  async viewSubDepartments(options?: {
    limit?: number;
    page?: number;
    departmentId?: string;
  }): Promise<Department[]> {
    const { limit = 10, page = 1, departmentId } = options || {};
    const skip = (page - 1) * limit;

    const conditions = [isNotNull(departments.parentId)];
    if (departmentId) {
      conditions.push(eq(departments.parentId, departmentId));
    }

    // Check parent visibility
    const parentCondition = departmentId
      ? await this.db
        .select()
        .from(departments)
        .where(eq(departments.id, departmentId))
        .limit(1)
      : [];

    if (departmentId && parentCondition.length > 0) {
      const parent = parentCondition[0];
      if (parent.visibility !== 'public') {
        return [];
      }
    }

    const depts = await this.db
      .select()
      .from(departments)
      .where(and(...conditions))
      .limit(limit)
      .offset(skip);

    return Promise.all(depts.map((dept) => this.toDomain(dept)));
  }

  async findSubDepartmentByParentId(parentId: string): Promise<Department[]> {
    const depts = await this.db
      .select()
      .from(departments)
      .where(eq(departments.parentId, parentId));

    return Promise.all(depts.map((dept) => this.toDomain(dept)));
  }

  async findAllByDepartmentIds(
    departmentIds: string[],
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]> {
    if (departmentIds.length === 0) return [];

    return this.findByIds(departmentIds, queryDto);
  }

  async findAllSubDepartmentsByParentIds(
    parentDepartmentIds: string[],
    queryDto?: Omit<DepartmentQueryDto, 'includeSubDepartments'>,
  ): Promise<Department[]> {
    if (parentDepartmentIds.length === 0) return [];

    const depts = await this.db
      .select()
      .from(departments)
      .where(inArray(departments.parentId, parentDepartmentIds));

    const results = await Promise.all(
      depts.map((dept) => this.findById(dept.id, queryDto)),
    );

    return results.filter((d): d is Department => d !== null);
  }

  async validateDepartmentAccess(
    departmentId: string,
    userDepartmentIds: string[],
  ): Promise<boolean> {
    if (userDepartmentIds.includes(departmentId)) {
      return true;
    }

    const [department] = await this.db
      .select()
      .from(departments)
      .where(eq(departments.id, departmentId))
      .limit(1);

    if (!department) return false;

    if (
      department.parentId &&
      userDepartmentIds.includes(department.parentId)
    ) {
      return true;
    }

    return false;
  }

  async updateDepartmentVisibilityByParentId(
    parentId: string,
    visibility: Department['visibility'],
  ) {
    const result = await this.db
      .update(departments)
      .set({
        visibility: this.fromDomainVisibility(visibility),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(departments.parentId, parentId))
      .returning();

    return { count: result.length };
  }

  async findDelegableSubDepartments(
    supervisorDepartmentIds: string[],
    queryDto?: Omit<DepartmentQueryDto, 'includeSubDepartments'>,
    searchQuery?: string,
  ): Promise<Department[]> {
    const conditions = [
      inArray(departments.parentId, supervisorDepartmentIds),
      isNotNull(departments.parentId),
    ];

    if (searchQuery && searchQuery.trim()) {
      conditions.push(ilike(departments.name, `%${searchQuery.trim()}%`));
    }

    const depts = await this.db
      .select()
      .from(departments)
      .where(and(...conditions));

    const results = await Promise.all(
      depts.map((dept) => this.findById(dept.id, queryDto)),
    );

    return results.filter((d): d is Department => d !== null);
  }

  async validateSubDepartments(
    parentDepartmentIds: string[],
    subDepartmentIds: string[],
  ): Promise<Array<{ id: string; name: string }>> {
    const parentIdsArray = parentDepartmentIds.map((id) => `'${id}'`).join(',');
    const subIdsArray = subDepartmentIds.map((id) => `'${id}'`).join(',');

    const query = `
      WITH sub_department_validation AS (
        SELECT 
          sd.id,
          sd.name,
          sd.parent_id,
          CASE 
            WHEN sd.parent_id = ANY(ARRAY[${parentIdsArray}]::uuid[]) THEN TRUE
            ELSE FALSE
          END AS belongs_to_parent
        FROM departments sd
        WHERE sd.id = ANY(ARRAY[${subIdsArray}]::uuid[])
      )
      SELECT 
        id,
        name
      FROM sub_department_validation
      WHERE belongs_to_parent = FALSE;
    `;

    const pgClient = this.drizzleService.getPgClient();
    const result = await pgClient.query(query);

    return (result.rows as Array<{ id: string; name: string }>) || [];
  }
}
