import { Injectable } from '@nestjs/common';
import {
  DrizzleService,
  DrizzleTransaction,
} from '../../../common/drizzle/drizzle.service';
import {
  DepartmentQueryDto,
  DepartmentRepository,
  EmployeeIdOrUserId,
  SupervisorIdOrUserId,
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
  employees,
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
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
type DrizzleDepartmentVisibility =
  (typeof departments.$inferSelect)["visibility"];

export function mapToDepartmentVisibility(
  visibility: DrizzleDepartmentVisibility,
): DepartmentVisibility {
  switch (visibility) {
    case "public":
      return DepartmentVisibility.PUBLIC;
    case "private":
      return DepartmentVisibility.PRIVATE;
  }
}

export function mapToDrizzleDepartmentVisibility(
  visibility: DepartmentVisibility,
): DrizzleDepartmentVisibility {
  switch (visibility) {
    case DepartmentVisibility.PUBLIC:
      return "public";
    case DepartmentVisibility.PRIVATE:
      return "private";
  }
}
@Injectable()
export class DrizzleDepartmentRepository extends DepartmentRepository {
  private readonly parent = alias(departments, "parent");
  private readonly subDepartments = alias(departments, "children");
  constructor(
    private drizzle:
      | {
        drizzleService: DrizzleService;
        tx?: never;
      }
      | {
        drizzleService?: never;
        tx: DrizzleTransaction;
      },
  ) {
    super();
  }

  static fromTransaction(tx: DrizzleTransaction): DrizzleDepartmentRepository {
    return new DrizzleDepartmentRepository({ tx });
  }

  private get db() {
    return this.drizzle.drizzleService.client ?? this.drizzle.tx;
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
      parentId: department.parentId?.toString() || null,
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
    const [dept] = await this.db.query.departments.findMany({
      with: {
        parent: Boolean(queryDto?.includeParent) ? true : undefined,
        departments: Boolean(queryDto?.includeSubDepartments)
          ? true
          : undefined,
        questions: Boolean(queryDto?.includeQuestions) ? true : undefined,
        knowledgeChunks: Boolean(queryDto?.includeKnowledgeChunks)
          ? true
          : undefined,
      },
      where: eq(departments.id, id),
      limit: 1,
    });

    if (!dept) return null;

    return this.toDomain(dept, {
      parent: dept.parent,
      subDepartments: dept.departments,
      questions: dept.questions,
      knowledgeChunks: dept.knowledgeChunks,
    });
  }

  async findByIds(
    ids: string[],
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]> {
    if (ids.length === 0) return [];

    const depts = await this.db.query.departments.findMany({
      with: {
        parent: Boolean(queryDto?.includeParent) ? true : undefined,
        departments: Boolean(queryDto?.includeSubDepartments)
          ? true
          : undefined,
        questions: Boolean(queryDto?.includeQuestions) ? true : undefined,
        knowledgeChunks: Boolean(queryDto?.includeKnowledgeChunks)
          ? true
          : undefined,
      },
      where: inArray(departments.id, ids),
    });
    return depts.map((dept) =>
      this.toDomain(dept, {
        parent: dept.parent,
        subDepartments: dept.departments,
        questions: dept.questions,
        knowledgeChunks: dept.knowledgeChunks,
      }),
    );
  }

  async findAll(queryDto?: DepartmentQueryDto): Promise<Department[]> {
    const depts = await this.db.query.departments.findMany({
      with: {
        parent: Boolean(queryDto?.includeParent) ? true : undefined,
        departments: Boolean(queryDto?.includeSubDepartments)
          ? true
          : undefined,
        questions: Boolean(queryDto?.includeQuestions) ? true : undefined,
        knowledgeChunks: Boolean(queryDto?.includeKnowledgeChunks)
          ? true
          : undefined,
      },
    });
    return depts.map((dept) =>
      this.toDomain(dept, {
        parent: dept.parent,
        subDepartments: dept.departments,
        questions: dept.questions,
        knowledgeChunks: dept.knowledgeChunks,
      }),
    );
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

    const whereClause =
      conditions.length > 0
        ? conditions.length > 1
          ? and(...conditions)
          : conditions[0]
        : undefined;

    const depts = await this.db.query.departments.findMany({
      with: {
        parent: Boolean(queryDto?.includeParent) ? true : undefined,
        questions: Boolean(queryDto?.includeQuestions) ? true : undefined,
        knowledgeChunks: Boolean(queryDto?.includeKnowledgeChunks)
          ? true
          : undefined,
      },
      where: whereClause,
    });
    return depts.map((dept) =>
      this.toDomain(dept, {
        parent: dept.parent,
        questions: dept.questions,
        knowledgeChunks: dept.knowledgeChunks,
      }),
    );
  }

  async findMainDepartmentById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null> {
    const depts = await this.db.query.departments.findMany({
      with: {
        parent: Boolean(queryDto?.includeParent) ? true : undefined,
        departments: Boolean(queryDto?.includeSubDepartments)
          ? true
          : undefined,
        questions: Boolean(queryDto?.includeQuestions) ? true : undefined,
        knowledgeChunks: Boolean(queryDto?.includeKnowledgeChunks)
          ? true
          : undefined,
      },
      where: eq(departments.id, id),
      limit: 1,
    });
    const dept = depts[0];
    if (!dept) return null;
    return this.toDomain(dept, {
      parent: dept.parent,
      subDepartments: dept.departments,
      questions: dept.questions,
      knowledgeChunks: dept.knowledgeChunks,
    });
  }

  async findSubDepartmentById(
    id: string,
    queryDto?: Omit<DepartmentQueryDto, 'includeSubDepartments'>,
  ): Promise<Department | null> {
    const [dept] = await this.db.query.departments.findMany({
      with: {
        parent: Boolean(queryDto?.includeParent) ? true : undefined,
        questions: Boolean(queryDto?.includeQuestions) ? true : undefined,
        knowledgeChunks: Boolean(queryDto?.includeKnowledgeChunks)
          ? true
          : undefined,
      },
      where: and(eq(departments.id, id), isNotNull(departments.parentId)),
      limit: 1,
    });

    if (!dept) return null;

    return this.toDomain(dept, {
      parent: dept.parent,
      questions: dept.questions,
      knowledgeChunks: dept.knowledgeChunks,
    });
  }

  async findAllDepartments(
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]> {
    const depts = await this.db.query.departments.findMany({
      with: {
        parent: Boolean(queryDto?.includeParent) ? true : undefined,
        departments: Boolean(queryDto?.includeSubDepartments)
          ? true
          : undefined,
        questions: Boolean(queryDto?.includeQuestions) ? true : undefined,
        knowledgeChunks: Boolean(queryDto?.includeKnowledgeChunks)
          ? true
          : undefined,
      },
      where: isNull(departments.parentId),
    });

    return depts.map((dept) =>
      this.toDomain(dept, {
        parent: dept.parent,
        subDepartments: dept.departments,
        questions: dept.questions,
        knowledgeChunks: dept.knowledgeChunks,
      }),
    );
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
      .where(eq(departmentToSupervisor.departmentId, departmentId));
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

    const depts = await this.db.query.departments.findMany({
      with: {
        parent: Boolean(queryDto?.includeParent) ? true : undefined,
        questions: Boolean(queryDto?.includeQuestions) ? true : undefined,
        knowledgeChunks: Boolean(queryDto?.includeKnowledgeChunks)
          ? true
          : undefined,
      },
      where: inArray(departments.parentId, parentDepartmentIds),
    });

    return depts.map((dept) =>
      this.toDomain(dept, {
        parent: dept.parent,
        questions: dept.questions,
        knowledgeChunks: dept.knowledgeChunks,
      }),
    );
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

    const depts = await this.db.query.departments.findMany({
      with: {
        parent: Boolean(queryDto?.includeParent) ? true : undefined,
        questions: Boolean(queryDto?.includeQuestions) ? true : undefined,
        knowledgeChunks: Boolean(queryDto?.includeKnowledgeChunks)
          ? true
          : undefined,
      },
      where: and(...conditions),
    });

    return depts.map((dept) =>
      this.toDomain(dept, {
        parent: dept.parent,
        questions: dept.questions,
        knowledgeChunks: dept.knowledgeChunks,
      }),
    );
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

    const pgClient = this.db;
    const result = await pgClient.execute(query);

    return (result.rows as Array<{ id: string; name: string }>) || [];
  }

  async supervisorHasAccessToDepartment(
    supervisorIdOrUserId: SupervisorIdOrUserId,
    departmentId: string,
  ): Promise<
    | {
      hasAccess: true;
      department: Department;
    }
    | {
      hasAccess: false;
      department?: never;
    }
  > {
    const supervisorId = await this._getSupervisorId(supervisorIdOrUserId);
    if (!supervisorId) return { hasAccess: false };
    const supervisorDepartments = await this._getSupervisorDepartments(
      supervisorId,
      true,
    );

    const department = supervisorDepartments.find((d) => d.id.toString() === departmentId);
    if (!department) return { hasAccess: false };
    return { hasAccess: true, department };
  }

  private async _getSupervisorId(
    supervisorIdOrUserId: SupervisorIdOrUserId,
  ): Promise<string | null> {
    return supervisorIdOrUserId.supervisorUserId
      ? await this.db
        .select({ id: supervisors.id })
        .from(supervisors)
        .where(eq(supervisors.userId, supervisorIdOrUserId.supervisorUserId))
        .limit(1)
        .then((result) => result[0]?.id)
      : (supervisorIdOrUserId.supervisorId ?? null);
  }

  async supervisorHasAccessToDepartments(
    supervisorIdOrUserId: SupervisorIdOrUserId,
    departmentIds: string[],
  ): Promise<boolean> {
    const supervisorId = await this._getSupervisorId(supervisorIdOrUserId);
    if (!supervisorId) return false;
    const supervisorDepartmentIds = await this._getSupervisorDepartments(
      supervisorId,
      false,
    ).then((departments) => new Set(departments.map((d) => d.id)));
    if (departmentIds.length === 0) return true;
    return departmentIds.every((id) => supervisorDepartmentIds.has(id));
  }

  async getSupervisorDepartments<T extends boolean>(options: {
    supervisorIdOrUserId: SupervisorIdOrUserId;
    fullDepartment: T;
    onlySubDepartments?: boolean;
  }): Promise<T extends true ? Department[] : { id: string }[]> {
    const supervisorId = await this._getSupervisorId(
      options.supervisorIdOrUserId,
    );
    if (!supervisorId) return [];
    return (await this._getSupervisorDepartments(
      supervisorId,
      options.fullDepartment,
      options.onlySubDepartments,
    )) as T extends true ? Department[] : { id: string }[];
  }

  async _getSupervisorDepartments<T extends boolean>(
    supervisorId: string,
    fullDepartment: T = true as T,
    onlySubDepartments?: boolean,
  ): Promise<T extends true ? Department[] : { id: string }[]> {
    const mainDepartments: Department[] | { id: string }[] = fullDepartment
      ? await this.db
        .select({
          id: departments.id,
          name: departments.name,
          visibility: departments.visibility,
          createdAt: departments.createdAt,
          updatedAt: departments.updatedAt,
          parentId: departments.parentId,
        })
        .from(departmentToSupervisor)
        .innerJoin(
          departments,
          eq(departmentToSupervisor.departmentId, departments.id),
        )
        .where(
          and(
            eq(departmentToSupervisor.supervisorId, supervisorId),
            isNull(departments.parentId),
          ),
        )
        .then((mainDepartments) =>
          mainDepartments.map((d) =>
            this.mapToDepartment({
              department: d,
            }),
          ),
        )
      : await this.db
        .select({ id: departmentToSupervisor.departmentId })
        .from(departmentToSupervisor)
        .where(eq(departmentToSupervisor.supervisorId, supervisorId));

    const subDepartments: Department[] | { id: string }[] = fullDepartment
      ? await this.db
        .select()
        .from(departments)
        .where(
          inArray(
            departments.parentId,
            mainDepartments.map((d) => d.id),
          ),
        )
        .then((subDepartments) =>
          subDepartments.map((d) =>
            this.mapToDepartment({
              department: d,
            }),
          ),
        )
      : await this.db
        .select({ id: departments.id })
        .from(departments)
        .where(
          inArray(
            departments.parentId,
            mainDepartments.map((d) => d.id),
          ),
        );

    return (
      fullDepartment
        ? !onlySubDepartments
          ? [...mainDepartments, ...subDepartments]
          : subDepartments
        : !onlySubDepartments
          ? [
            ...mainDepartments.map((d) => ({ id: d.id })),
            ...subDepartments.map((d) => ({ id: d.id })),
          ]
          : mainDepartments.map((d) => ({ id: d.id }))
    ) as T extends true ? Department[] : { id: string }[];
  }

  private mapToDepartment(row: {
    department: typeof departments.$inferSelect;
    subDepartments?: (typeof departments.$inferSelect)[];
    parent?: typeof departments.$inferSelect;
  }): Department {
    return Department.create({
      id: row.department.id,
      name: row.department.name,
      visibility: mapToDepartmentVisibility(row.department.visibility),
      parentId: row.department.parentId ?? undefined,
      subDepartments: row.subDepartments?.map((subDepartment) =>
        Department.create({
          id: subDepartment.id,
          name: subDepartment.name,
          visibility: mapToDepartmentVisibility(subDepartment.visibility),
          parentId: subDepartment.parentId ?? undefined,
        }),
      ),
      parent: row.parent
        ? Department.create({
          id: row.parent.id,
          name: row.parent.name,
          visibility: mapToDepartmentVisibility(row.parent.visibility),
          parentId: row.parent.parentId ?? undefined,
        })
        : undefined,
    });
  }

  async employeeHasAccessToSubDepartment(
    employeeIdOrUserId: EmployeeIdOrUserId,
    subDepartmentId: string,
  ): Promise<
    | {
      hasAccess: true;
      department: Department;
    }
    | {
      hasAccess: false;
      department?: never;
    }
  > {
    const employeeId = await this._getEmployeeId(employeeIdOrUserId);
    if (!employeeId) return { hasAccess: false };
    const employeeSubDepartments = await this._getEmployeeSubDepartments(
      employeeId,
      true,
    );
    const department = employeeSubDepartments.find(
      (d) => d.id.toString() === subDepartmentId,
    );
    if (!department) return { hasAccess: false };
    return { hasAccess: true, department };
  }

  async employeeHasAccessToSubDepartments(
    employeeIdOrUserId: EmployeeIdOrUserId,
    subDepartmentIds: string[],
  ): Promise<boolean> {
    const employeeId = await this._getEmployeeId(employeeIdOrUserId);
    if (!employeeId) return false;
    const subDepartments = await this._getEmployeeSubDepartments(
      employeeId,
      false,
    );
    const subDepartmentIdsSet = new Set(subDepartmentIds);
    return subDepartments.every((d) => subDepartmentIdsSet.has(d.id));
  }

  async getEmployeeSubDepartments<T extends boolean>(
    employeeIdOrUserId: EmployeeIdOrUserId,
    fullSubDepartment: T = true as T,
  ): Promise<T extends true ? Department[] : { id: string }[]> {
    const employeeId = await this._getEmployeeId(employeeIdOrUserId);
    if (!employeeId) return [];
    return (await this._getEmployeeSubDepartments(
      employeeId,
      fullSubDepartment,
    )) as T extends true ? Department[] : { id: string }[];
  }

  private async _getEmployeeId(
    employeeIdOrUserId: EmployeeIdOrUserId,
  ): Promise<string | null> {
    return employeeIdOrUserId.employeeUserId
      ? await this.db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, employeeIdOrUserId.employeeUserId))
        .limit(1)
        .then((result) => result[0]?.id)
      : (employeeIdOrUserId.employeeId ?? null);
  }

  private async _getEmployeeSubDepartments<T extends boolean>(
    employeeId: string,
    fullSubDepartment: T = true as T,
  ): Promise<T extends true ? Department[] : { id: string }[]> {
    const result: Department[] | { id: string }[] = fullSubDepartment
      ? await this.db
        .select({
          id: employeeSubDepartments.departmentId,
          name: departments.name,
          visibility: departments.visibility,
          parentId: departments.parentId,
          createdAt: departments.createdAt,
          updatedAt: departments.updatedAt,
        })
        .from(employeeSubDepartments)
        .innerJoin(
          departments,
          eq(employeeSubDepartments.departmentId, departments.id),
        )
        .where(eq(employeeSubDepartments.employeeId, employeeId))
        .then((subDepartments) =>
          subDepartments.map((d) =>
            this.mapToDepartment({
              department: d,
            }),
          ),
        )
      : await this.db
        .select({ id: employeeSubDepartments.departmentId })
        .from(employeeSubDepartments)
        .where(eq(employeeSubDepartments.employeeId, employeeId));
    return result as T extends true ? Department[] : { id: string }[];
  }
}
