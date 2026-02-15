import { Inject, Injectable } from '@nestjs/common';
import {
  DatabaseInstance,
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
  SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
type DrizzleDepartmentVisibility =
  (typeof departments.$inferSelect)['visibility'];

export function mapToDepartmentVisibility(
  visibility: DrizzleDepartmentVisibility,
): DepartmentVisibility {
  switch (visibility) {
    case 'public':
      return DepartmentVisibility.PUBLIC;
    case 'private':
      return DepartmentVisibility.PRIVATE;
  }
}

export function mapToDrizzleDepartmentVisibility(
  visibility: DepartmentVisibility,
): DrizzleDepartmentVisibility {
  switch (visibility) {
    case DepartmentVisibility.PUBLIC:
      return 'public';
    case DepartmentVisibility.PRIVATE:
      return 'private';
  }
}

@Injectable()
export class DrizzleDepartmentRepository implements DepartmentRepository {
  private readonly parent = alias(departments, 'parent');
  private readonly subDepartments = alias(departments, 'children');
  private readonly db: DatabaseInstance | DrizzleTransaction;
  constructor(drizzleService: DrizzleService) {
    this.db = drizzleService.client;
  }

  async save(department: Department): Promise<Department> {
    const departmentData: typeof departments.$inferInsert = {
      id: department.id.toString(),
      name: department.name,
      parentId: department.parentId?.toString() ?? null,
      visibility: mapToDrizzleDepartmentVisibility(department.visibility),
      isExposedToTvContent: department.isExposedToTvContent ?? false,
      updatedAt: new Date(),
    };

    const result = await this.db
      .insert(departments)
      .values(departmentData)
      .onConflictDoUpdate({
        target: departments.id,
        set: {
          name: departmentData.name,
          parentId: departmentData.parentId?.toString() ?? null,
          visibility: departmentData.visibility,
          isExposedToTvContent: departmentData.isExposedToTvContent,
          updatedAt: departmentData.updatedAt,
        },
      })
      .returning();

    return this.mapToDepartment({ department: result[0] });
  }

  async findById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null> {
    const result = await this.fetchDepartments({
      where: eq(departments.id, id),
      queryDto,
      limit: 1,
    });

    if (result.length === 0) {
      return null;
    }

    return this.mapToDepartment(result[0]);
  }

  async findByIds(
    ids: string[],
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]> {
    if (ids.length === 0) {
      return [];
    }

    const result = await this.fetchDepartments({
      where: inArray(departments.id, ids),
      queryDto,
    });

    return result.map((row) => this.mapToDepartment(row));
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
          mapToDrizzleDepartmentVisibility(criteria.visibility),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const depts = await this.db.select().from(departments).where(whereClause);

    return depts.map((dept) => this.mapToDepartment({ department: dept }));
  }

  async findAll(queryDto?: DepartmentQueryDto): Promise<Department[]> {
    const result = await this.fetchDepartments({ queryDto });
    return result.map((row) => this.mapToDepartment(row));
  }

  async findAllDepartments(
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]> {
    return this.findAll(queryDto);
  }

  async findMainDepartmentById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null> {
    const result = await this.fetchDepartments({
      where: and(eq(departments.id, id), isNull(departments.parentId)),
      queryDto,
      limit: 1,
    });

    return result.length > 0 ? this.mapToDepartment(result[0]) : null;
  }

  async findSubDepartmentById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null> {
    const result = await this.fetchDepartments({
      where: and(eq(departments.id, id), isNotNull(departments.parentId)),
      queryDto,
      limit: 1,
    });

    return result.length > 0 ? this.mapToDepartment(result[0]) : null;
  }

  async removeById(id: string): Promise<void> {
    await this.db.delete(departments).where(eq(departments.id, id));
  }

  async removeByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.db.delete(departments).where(inArray(departments.id, ids));
  }

  async removeMainDepartmentById(id: string): Promise<void> {
    return this.removeById(id);
  }

  async removeSubDepartmentById(id: string): Promise<void> {
    return this.removeById(id);
  }

  async update(
    id: string,
    update: Partial<Department>,
  ): Promise<Department | null> {
    const updateData: Partial<typeof departments.$inferInsert> = {};

    if (update.name !== undefined) {
      updateData.name = update.name;
    }

    if (update.visibility !== undefined) {
      updateData.visibility = mapToDrizzleDepartmentVisibility(
        update.visibility,
      );
    }

    if (update.parentId !== undefined) {
      updateData.parentId = update.parentId.toString() ?? null;
    }

    if (update.isExposedToTvContent !== undefined) {
      updateData.isExposedToTvContent = update.isExposedToTvContent;
    }

    updateData.updatedAt = new Date();

    const result = await this.db
      .update(departments)
      .set(updateData)
      .where(eq(departments.id, id))
      .returning();

    if (result.length === 0) {
      return null;
    }

    return this.mapToDepartment({ department: result[0] });
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
    if (update.isExposedToTvContent !== undefined) {
      data.isExposedToTvContent = update.isExposedToTvContent;
    }

    const [updated] = await this.db
      .update(departments)
      .set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(departments.id, id))
      .returning();

    return this.findById(updated.id, query) as Promise<Department>;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.fetchDepartments({
      where: eq(departments.id, id),
      limit: 1,
    });
    return result.length > 0;
  }

  async count(): Promise<number> {
    const result = await this.db
      .select({ count: count(departments.id) })
      .from(departments);

    return result[0]?.count ?? 0;
  }

  async findAllSubDepartments(
    queryDto?: Omit<DepartmentQueryDto, 'includeSubDepartments'>,
    departmentId?: string,
  ): Promise<Department[]> {
    const conditions = [isNotNull(departments.parentId)];

    if (departmentId) {
      conditions.push(eq(departments.parentId, departmentId));
    }

    const result = await this.fetchDepartments({
      where: and(...conditions),
      queryDto,
    });
    return result.map((row) => this.mapToDepartment(row));
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

    // Check FAQs
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
    const result = await this.db
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), isNull(departments.parentId)))
      .limit(1);

    return result.length > 0;
  }

  async isSubDepartment(id: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), isNotNull(departments.parentId)))
      .limit(1);

    return result.length > 0;
  }

  async viewMainDepartments(options?: {
    limit?: number;
    page?: number;
  }): Promise<Department[]> {
    const result = await this.fetchDepartments({
      where: and(
        isNull(departments.parentId),
        eq(
          departments.visibility,
          mapToDrizzleDepartmentVisibility(DepartmentVisibility.PUBLIC),
        ),
      ),
      limit: options?.limit,
      page: options?.page,
    });

    return result.map(this.mapToDepartment);
  }

  async viewSubDepartments(options?: {
    limit?: number;
    page?: number;
    departmentId?: string;
  }): Promise<Department[]> {
    const conditions = [
      isNotNull(departments.parentId),
      eq(
        departments.visibility,
        mapToDrizzleDepartmentVisibility(DepartmentVisibility.PUBLIC),
      ),
    ];

    if (options?.departmentId) {
      conditions.push(eq(departments.parentId, options.departmentId));
    }

    const result = await this.fetchDepartments({
      where: and(...conditions),
      limit: options?.limit,
      page: options?.page,
    });

    return result.map(this.mapToDepartment);
  }

  async findSubDepartmentByParentId(parentId: string): Promise<Department[]> {
    const result = await this.fetchDepartments({
      where: eq(departments.parentId, parentId),
    });

    return result.map(this.mapToDepartment);
  }

  async findAllByDepartmentIds(
    departmentIds: string[],
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]> {
    if (departmentIds.length === 0) {
      return [];
    }

    const result = await this.fetchDepartments({
      where: inArray(departments.id, departmentIds),
      queryDto,
    });

    return result.map(this.mapToDepartment);
  }

  async findAllSubDepartmentsByParentIds(
    parentDepartmentIds: string[],
    queryDto?: Omit<DepartmentQueryDto, 'includeSubDepartments'>,
  ): Promise<Department[]> {
    if (parentDepartmentIds.length === 0) {
      return [];
    }

    const result = await this.fetchDepartments({
      where: and(
        isNotNull(departments.parentId),
        inArray(departments.parentId, parentDepartmentIds),
      ),
      queryDto,
    });

    return result.map(this.mapToDepartment);
  }

  async validateDepartmentAccess(
    departmentId: string,
    userDepartmentIds: string[],
  ): Promise<boolean> {
    if (userDepartmentIds.length === 0) {
      return false;
    }

    const result = await this.fetchDepartments({
      where: and(
        eq(departments.id, departmentId),
        inArray(departments.id, userDepartmentIds),
      ),
      limit: 1,
    });

    return result.length > 0;
  }

  async updateDepartmentVisibilityByParentId(
    parentId: string,
    visibility: DepartmentVisibility,
  ): Promise<void> {
    await this.db
      .update(departments)
      .set({
        visibility: mapToDrizzleDepartmentVisibility(visibility),
        updatedAt: new Date(),
      })
      .where(eq(departments.parentId, parentId));
  }

  async findDelegableSubDepartments(
    supervisorDepartmentIds: string[],
    queryDto?: Omit<DepartmentQueryDto, 'includeSubDepartments'>,
    searchQuery?: string,
  ): Promise<Department[]> {
    if (supervisorDepartmentIds.length === 0) {
      return [];
    }

    const conditions = [
      isNotNull(departments.parentId),
      inArray(departments.parentId, supervisorDepartmentIds),
    ];

    if (searchQuery) {
      const searchTerm = `%${searchQuery}%`;
      conditions.push(ilike(departments.name, searchTerm));
    }

    const result = await this.fetchDepartments({
      where: and(...conditions),
      queryDto,
    });

    return result.map(this.mapToDepartment);
  }

  async validateSubDepartments(
    parentDepartmentIds: string[],
    subDepartmentIds: string[],
  ): Promise<Array<{ id: string; name: string }>> {
    if (subDepartmentIds.length === 0) {
      return [];
    }

    const result = await this.db
      .select({
        id: departments.id,
        name: departments.name,
      })
      .from(departments)
      .where(
        and(
          inArray(departments.id, subDepartmentIds),
          isNotNull(departments.parentId),
          inArray(departments.parentId, parentDepartmentIds),
        ),
      );

    return result.map((row) => ({
      id: row.id,
      name: row.name,
    }));
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

    const department = supervisorDepartments.find(
      (d) => d.id.toString() === departmentId,
    );
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
    onlyExposedToTvContent?: boolean;
  }): Promise<T extends true ? Department[] : { id: string }[]> {
    const supervisorId = await this._getSupervisorId(
      options.supervisorIdOrUserId,
    );
    if (!supervisorId) return [];
    return (await this._getSupervisorDepartments(
      supervisorId,
      options.fullDepartment,
      options.onlySubDepartments,
      options.onlyExposedToTvContent,
    )) as T extends true ? Department[] : { id: string }[];
  }

  async _getSupervisorDepartments<T extends boolean>(
    supervisorId: string,
    fullDepartment: T = true as T,
    onlySubDepartments?: boolean,
    onlyExposedToTvContent?: boolean,
  ): Promise<T extends true ? Department[] : { id: string }[]> {
    const mainWhereConditions = [
      eq(departmentToSupervisor.supervisorId, supervisorId),
      isNull(departments.parentId),
    ];
    if (onlyExposedToTvContent) {
      mainWhereConditions.push(eq(departments.isExposedToTvContent, true));
    }
    const mainDepartments: Department[] | { id: string }[] = fullDepartment
      ? await this.db
          .select({
            id: departments.id,
            name: departments.name,
            visibility: departments.visibility,
            isExposedToTvContent: departments.isExposedToTvContent,
            createdAt: departments.createdAt,
            updatedAt: departments.updatedAt,
            parentId: departments.parentId,
          })
          .from(departmentToSupervisor)
          .innerJoin(
            departments,
            eq(departmentToSupervisor.departmentId, departments.id),
          )
          .where(and(...mainWhereConditions))
          .then((mainDepartments) =>
            mainDepartments.map((d) =>
              this.mapToDepartment({
                department: d,
              }),
            ),
          )
      : onlyExposedToTvContent
        ? await this.db
            .select({ id: departmentToSupervisor.departmentId })
            .from(departmentToSupervisor)
            .innerJoin(
              departments,
              eq(departmentToSupervisor.departmentId, departments.id),
            )
            .where(
              and(
                eq(departmentToSupervisor.supervisorId, supervisorId),
                eq(departments.isExposedToTvContent, true),
              ),
            )
        : await this.db
            .select({ id: departmentToSupervisor.departmentId })
            .from(departmentToSupervisor)
            .where(eq(departmentToSupervisor.supervisorId, supervisorId));

    const subDeptParentIds = mainDepartments.map((d: Department | { id: string }) =>
      d.id.toString(),
    );
    const subDeptWhereConditions =
      subDeptParentIds.length > 0
        ? [
            inArray(departments.parentId, subDeptParentIds),
            ...(onlyExposedToTvContent
              ? [eq(departments.isExposedToTvContent, true)]
              : []),
          ]
        : [];
    const subDepartments: Department[] | { id: string }[] = fullDepartment
      ? subDeptParentIds.length === 0
        ? []
        : await this.db
            .select()
            .from(departments)
            .where(and(...subDeptWhereConditions))
            .then((rows) =>
              rows.map((d) =>
                this.mapToDepartment({
                  department: d,
                }),
              ),
            )
      : subDeptParentIds.length === 0
        ? []
        : await this.db
            .select({ id: departments.id })
            .from(departments)
            .where(
              subDeptWhereConditions.length > 0
                ? and(...subDeptWhereConditions)
                : sql`false`,
            );

    return (
      fullDepartment
        ? !onlySubDepartments
          ? [...mainDepartments, ...subDepartments]
          : subDepartments
        : !onlySubDepartments
          ? [
              ...mainDepartments.map((d: Department | { id: string }) => ({
                id: d.id.toString(),
              })),
              ...subDepartments.map((d: Department | { id: string }) => ({
                id: d.id.toString(),
              })),
            ]
          : mainDepartments.map((d: Department | { id: string }) => ({
              id: d.id.toString(),
            }))
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
      isExposedToTvContent:
        (row.department as { isExposedToTvContent?: boolean })
          ?.isExposedToTvContent ?? false,
      subDepartments: row.subDepartments?.map((subDepartment) =>
        Department.create({
          id: subDepartment.id,
          name: subDepartment.name,
          visibility: mapToDepartmentVisibility(subDepartment.visibility),
          parentId: subDepartment.parentId ?? undefined,
          isExposedToTvContent:
            (subDepartment as { isExposedToTvContent?: boolean })
              ?.isExposedToTvContent ?? false,
        }),
      ),
      parent: row.parent
        ? Department.create({
            id: row.parent.id,
            name: row.parent.name,
            visibility: mapToDepartmentVisibility(row.parent.visibility),
            parentId: row.parent.parentId ?? undefined,
            isExposedToTvContent:
              (row.parent as { isExposedToTvContent?: boolean })
                ?.isExposedToTvContent ?? false,
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
    options?: { onlyExposedToTvContent?: boolean },
  ): Promise<T extends true ? Department[] : { id: string }[]> {
    const employeeId = await this._getEmployeeId(employeeIdOrUserId);
    if (!employeeId) return [];
    return (await this._getEmployeeSubDepartments(
      employeeId,
      fullSubDepartment,
      options?.onlyExposedToTvContent,
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
    onlyExposedToTvContent?: boolean,
  ): Promise<T extends true ? Department[] : { id: string }[]> {
    const employeeWhere = eq(employeeSubDepartments.employeeId, employeeId);
    const tvWhere = onlyExposedToTvContent
      ? eq(departments.isExposedToTvContent, true)
      : undefined;
    const fullWhere =
      tvWhere !== undefined ? and(employeeWhere, tvWhere) : employeeWhere;

    const result: Department[] | { id: string }[] = fullSubDepartment
      ? await this.db
          .select({
            id: employeeSubDepartments.departmentId,
            name: departments.name,
            visibility: departments.visibility,
            isExposedToTvContent: departments.isExposedToTvContent,
            parentId: departments.parentId,
            createdAt: departments.createdAt,
            updatedAt: departments.updatedAt,
          })
          .from(employeeSubDepartments)
          .innerJoin(
            departments,
            eq(employeeSubDepartments.departmentId, departments.id),
          )
          .where(fullWhere)
          .then((subDepartments) =>
            subDepartments.map((d) =>
              this.mapToDepartment({
                department: d,
              }),
            ),
          )
      : onlyExposedToTvContent
        ? await this.db
            .select({ id: employeeSubDepartments.departmentId })
            .from(employeeSubDepartments)
            .innerJoin(
              departments,
              eq(employeeSubDepartments.departmentId, departments.id),
            )
            .where(fullWhere)
        : await this.db
            .select({ id: employeeSubDepartments.departmentId })
            .from(employeeSubDepartments)
            .where(employeeWhere);
    return result as T extends true ? Department[] : { id: string }[];
  }

  private departmentQueryWithParent() {
    return this.db
      .select({
        department: departments,
        parent: this.parent,
      })
      .from(departments)
      .leftJoin(this.parent, eq(departments.parentId, this.parent.id));
  }

  private departmentQueryWithSubDepartments() {
    return this.db
      .select({
        department: departments,
        subDepartments: this.subDepartments,
      })
      .from(departments)
      .leftJoin(
        this.subDepartments,
        eq(this.subDepartments.parentId, departments.id),
      );
  }

  private departmentQueryWithParentAndSubDepartments() {
    return this.db
      .select({
        department: departments,
        parent: this.parent,
        subDepartments: this.subDepartments,
      })
      .from(departments)
      .leftJoin(this.parent, eq(departments.parentId, this.parent.id))
      .leftJoin(
        this.subDepartments,
        eq(this.subDepartments.parentId, departments.id),
      );
  }

  private buildEffectiveWhere(
    baseWhere: SQL | undefined,
    queryDto?: DepartmentQueryDto,
  ): SQL | undefined {
    const tvWhere = queryDto?.onlyExposedToTvContent
      ? eq(departments.isExposedToTvContent, true)
      : undefined;
    if (baseWhere && tvWhere) return and(baseWhere, tvWhere);
    return tvWhere ?? baseWhere;
  }

  private async fetchDepartments(options?: {
    where?: SQL;
    limit?: number;
    page?: number;
    queryDto?: DepartmentQueryDto;
  }): Promise<
    {
      department: typeof departments.$inferSelect;
      parent?: typeof departments.$inferSelect;
      subDepartments?: (typeof departments.$inferSelect)[];
    }[]
  > {
    const effectiveWhere = this.buildEffectiveWhere(
      options?.where,
      options?.queryDto,
    );
    if (
      options?.queryDto?.includeParent &&
      options?.queryDto?.includeSubDepartments
    ) {
      const query =
        this.departmentQueryWithParentAndSubDepartments().$dynamic();
      if (effectiveWhere) {
        query.where(effectiveWhere);
      }
      if (options?.limit) {
        query.limit(options.limit);
      }
      if (options?.page) {
        query.offset((options.page - 1) * (options.limit ?? 10));
      }
      const result = await query;

      const departmentsMap: Record<
        string,
        {
          department: typeof departments.$inferSelect;
          parent?: typeof departments.$inferSelect;
          subDepartments?: (typeof departments.$inferSelect)[];
        }
      > = {};

      result.forEach((row) => {
        departmentsMap[row.department.id] ??= {
          department: row.department,
        };

        departmentsMap[row.department.id].parent ??= row.parent ?? undefined;
        departmentsMap[row.department.id].subDepartments ??= [];
        if (row.subDepartments) {
          departmentsMap?.[row.department.id]?.subDepartments?.push(
            row.subDepartments,
          );
        }
      });

      return Object.values(departmentsMap);
    } else if (options?.queryDto?.includeParent) {
      const query = this.departmentQueryWithParent().$dynamic();
      if (effectiveWhere) {
        query.where(effectiveWhere);
      }
      if (options?.limit) {
        query.limit(options.limit);
      }
      if (options?.page) {
        query.offset((options.page - 1) * (options.limit ?? 10));
      }
      const result = await query;

      return result.map((row) => ({
        department: row.department,
        parent: row.parent ?? undefined,
      }));
    } else if (options?.queryDto?.includeSubDepartments) {
      const query = this.departmentQueryWithSubDepartments().$dynamic();
      if (effectiveWhere) {
        query.where(effectiveWhere);
      }
      if (options?.limit) {
        query.limit(options.limit);
      }
      if (options?.page) {
        query.offset((options.page - 1) * (options.limit ?? 10));
      }
      const result = await query;
      const departmentsMap: Record<
        string,
        {
          department: typeof departments.$inferSelect;
          subDepartments?: (typeof departments.$inferSelect)[];
        }
      > = {};
      result.forEach((row) => {
        departmentsMap[row.department.id] ??= {
          department: row.department,
        };

        departmentsMap[row.department.id].subDepartments ??= [];
        if (row.subDepartments) {
          departmentsMap?.[row.department.id]?.subDepartments?.push(
            row.subDepartments,
          );
        }
      });

      return Object.values(departmentsMap);
    } else {
      const query = this.db.select().from(departments).$dynamic();

      if (effectiveWhere) {
        query.where(effectiveWhere);
      }
      if (options?.limit) {
        query.limit(options.limit);
      }
      if (options?.page) {
        query.offset((options.page - 1) * (options.limit ?? 10));
      }
      const result = await query;

      return result.map((row) => ({
        department: row,
      }));
    }
  }
}
