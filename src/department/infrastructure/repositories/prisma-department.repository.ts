import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
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

@Injectable()
export class PrismaDepartmentRepository extends DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(dept: any): Department {
    return Department.create({
      id: dept.id,
      name: dept.name,
      visibility: dept.visibility,
      parent: dept.parent ? Department.create(dept.parent) : undefined,
      questions:
        dept.questions?.map((q: any) =>
          Question.create({
            id: q.id,
            text: q.text,
            departmentId: q.departmentId,
            knowledgeChunkId: q.knowledgeChunkId,
            creatorEmployeeId: q.creatorEmployeeId,
            creatorAdminId: q.creatorAdminId,
            creatorSupervisorId: q.creatorSupervisorId,
            satisfaction: q.satisfaction,
            dissatisfaction: q.dissatisfaction,
            views: q.views,
          }),
        ) || [],
      knowledgeChunks:
        dept.knowledgeChunks?.map((kc: any) =>
          KnowledgeChunk.create({
            id: kc.id,
            content: kc.content,
            point: undefined,
            department: undefined as unknown as Department,
          }),
        ) || [],
      subDepartments:
        dept.subDepartments?.map((sd: any) =>
          Department.create({
            id: sd.id,
            name: sd.name,
            visibility: sd.visibility as DepartmentVisibility,
            questions: sd.questions,
            knowledgeChunks: sd.knowledgeChunks,
          }),
        ) || [],
    });
  }

  async save(
    department: Department,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department> {
    const data = {
      id: department.id.toString(),
      name: department.name,
      visibility: department.visibility,
      parent: department.parent
        ? { connect: { id: department.parent.id.toString() } }
        : undefined,
    };
    const upsert = await this.prisma.department.upsert({
      where: { id: data.id },
      update: data,
      create: data,
      include: {
        questions: queryDto?.includeQuestions ?? false,
        knowledgeChunks: queryDto?.includeKnowledgeChunks ?? false,
        subDepartments: queryDto?.includeSubDepartments
          ? { include: { questions: true, knowledgeChunks: true } }
          : false,
        parent: queryDto?.includeParent ?? false,
      },
    });
    return this.toDomain(upsert);
  }

  async findById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null> {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        questions: queryDto?.includeQuestions ?? false,
        knowledgeChunks: queryDto?.includeKnowledgeChunks ?? false,
        subDepartments: queryDto?.includeSubDepartments
          ? { include: { questions: true, knowledgeChunks: true } }
          : false,
        parent: queryDto?.includeParent ?? false,
      },
    });
    return dept ? this.toDomain(dept) : null;
  }

  async findByIds(
    ids: string[],
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]> {
    const depts = await this.prisma.department.findMany({
      where: { id: { in: ids } },
      include: {
        questions: queryDto?.includeQuestions ?? false,
        knowledgeChunks: queryDto?.includeKnowledgeChunks ?? false,
        subDepartments: queryDto?.includeSubDepartments
          ? { include: { questions: true, knowledgeChunks: true } }
          : false,
      },
    });
    return depts.map(this.toDomain);
  }

  async findAll(queryDto?: DepartmentQueryDto): Promise<Department[]> {
    const depts = await this.prisma.department.findMany({
      include: {
        questions: queryDto?.includeQuestions ?? false,
        knowledgeChunks: queryDto?.includeKnowledgeChunks ?? false,
        subDepartments: queryDto?.includeSubDepartments
          ? { include: { questions: true, knowledgeChunks: true } }
          : false,
      },
    });
    return depts.map(this.toDomain);
  }

  async removeById(id: string): Promise<Department | null> {
    const dept = await this.findById(id);
    if (!dept) return null;
    await this.prisma.department.delete({ where: { id } });
    return dept;
  }

  async removeMainDepartmentById(id: string): Promise<Department | null> {
    const dept = await this.findMainDepartmentById(id);
    if (!dept) return null;
    await this.prisma.department.delete({ where: { id } });
    return dept;
  }

  async removeSubDepartmentById(id: string): Promise<Department | null> {
    const dept = await this.findSubDepartmentById(id);
    if (!dept) return null;
    await this.prisma.department.delete({ where: { id } });
    return dept;
  }

  async removeByIds(ids: string[]): Promise<Department[]> {
    const depts = await this.findByIds(ids);
    await this.prisma.department.deleteMany({ where: { id: { in: ids } } });
    return depts;
  }

  async update(id: string, update: Partial<Department>): Promise<Department> {
    const data: any = {};
    if (update.name) data.name = update.name;
    if (update.visibility) data.visibility = update.visibility;
    const updated = await this.prisma.department.update({
      where: { id },
      data,
    });
    return this.toDomain(updated);
  }

  async updateMainDepartment(
    id: string,
    update: Partial<Department>,
  ): Promise<Department> {
    // Verify it's a main department
    const isMain = await this.isMainDepartment(id);
    if (!isMain) {
      throw new Error('Department is not a main department');
    }

    const data: any = {};
    if (update.name) data.name = update.name;
    if (update.visibility) data.visibility = update.visibility;
    const updated = await this.prisma.department.update({
      where: { id },
      data,
    });
    return this.toDomain(updated);
  }

  async updateSubDepartment(
    id: string,
    update: Partial<Department>,
    query?: DepartmentQueryDto,
  ): Promise<Department> {
    // Verify it's a sub-department
    const isSub = await this.isSubDepartment(id);
    if (!isSub) {
      throw new Error('Department is not a sub-department');
    }

    const data: any = {};
    if (update.name) data.name = update.name;
    if (update.parent)
      data.parent = { connect: { id: update.parent.id.toString() } };
    const updated = await this.prisma.department.update({
      where: { id },
      data,
      include: { parent: query?.includeParent ?? false },
    });
    return this.toDomain(updated);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.department.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.department.count();
  }

  async findByCriteria(
    criteria: Partial<Department>,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]> {
    const where: any = {};
    if (criteria.name) where.name = criteria.name;
    if (criteria.visibility) where.visibility = criteria.visibility;
    const depts = await this.prisma.department.findMany({
      where,
      include: {
        questions: queryDto?.includeQuestions ?? false,
        knowledgeChunks: queryDto?.includeKnowledgeChunks ?? false,
        subDepartments: queryDto?.includeSubDepartments
          ? { include: { questions: true, knowledgeChunks: true } }
          : false,
      },
    });
    return depts.map(this.toDomain);
  }

  async findAllSubDepartments(): Promise<Department[]> {
    const rows = await this.prisma.department.findMany({
      where: { parentId: { not: null } },
      include: { parent: true },
    });

    return rows.map(this.toDomain);
  }

  async findMainDepartmentById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null> {
    const dept = await this.prisma.department.findUnique({
      where: {
        id,
        parentId: null,
      },
      include: {
        questions: queryDto?.includeQuestions ?? false,
        knowledgeChunks: queryDto?.includeKnowledgeChunks ?? false,
        subDepartments: queryDto?.includeSubDepartments
          ? { include: { questions: true, knowledgeChunks: true } }
          : false,
      },
    });
    return dept ? this.toDomain(dept) : null;
  }

  async findSubDepartmentById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null> {
    const dept = await this.prisma.department.findUnique({
      where: {
        id,
        parentId: { not: null },
      },
      include: {
        questions: queryDto?.includeQuestions ?? false,
        knowledgeChunks: queryDto?.includeKnowledgeChunks ?? false,
        subDepartments: queryDto?.includeSubDepartments
          ? { include: { questions: true, knowledgeChunks: true } }
          : false,
      },
    });
    return dept ? this.toDomain(dept) : null;
  }

  async findAllDepartments(
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]> {
    const rows = await this.prisma.department.findMany({
      where: { parentId: null },
      include: {
        questions: queryDto.includeQuestions,
        knowledgeChunks: queryDto.includeKnowledgeChunks,
        subDepartments: queryDto.includeSubDepartments,
      },
    });

    return rows.map(this.toDomain);
  }

  async canDelete(departmentId: string): Promise<boolean> {
    // helper function to check if relation exists
    const hasRelation = async (promise: Promise<number>): Promise<boolean> =>
      (await promise) > 0;

    // sequential checks (stop at first relation found)
    if (
      await hasRelation(this.prisma.question.count({ where: { departmentId } }))
    )
      return false;

    if (
      await hasRelation(
        this.prisma.knowledgeChunk.count({ where: { departmentId } }),
      )
    )
      return false;

    if (
      await hasRelation(
        this.prisma.supervisor.count({
          where: { departments: { some: { id: departmentId } } },
        }),
      )
    )
      return false;

    if (
      await hasRelation(this.prisma.ticket.count({ where: { departmentId } }))
    )
      return false;

    if (
      await hasRelation(
        this.prisma.department.count({ where: { parentId: departmentId } }),
      )
    )
      return false;

    if (
      await hasRelation(
        this.prisma.supportTicket.count({ where: { departmentId } }),
      )
    )
      return false;

    if (
      await hasRelation(
        this.prisma.employee.count({
          where: { subDepartments: { some: { id: departmentId } } },
        }),
      )
    )
      return false;

    if (
      await hasRelation(
        this.prisma.task.count({
          where: {
            OR: [
              { targetDepartmentId: departmentId },
              { targetSubDepartmentId: departmentId },
            ],
          },
        }),
      )
    )
      return false;

    return true; // no relations found
  }

  async isMainDepartment(id: string): Promise<boolean> {
    const count = await this.prisma.department.count({
      where: { id, parentId: null },
    });
    return count > 0;
  }

  async isSubDepartment(id: string): Promise<boolean> {
    const count = await this.prisma.department.count({
      where: { id, parentId: { not: null } },
    });
    return count > 0;
  }
}
