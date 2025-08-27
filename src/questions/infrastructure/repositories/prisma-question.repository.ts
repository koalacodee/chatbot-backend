import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  FaqStats,
  QuestionQueryDto,
  QuestionRepository,
} from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
@Injectable()
export class PrismaQuestionRepository extends QuestionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(q: any): Question {
    return Question.create({
      id: q.id,
      text: q.text,
      departmentId: q.departmentId,
      knowledgeChunkId: q.knowledgeChunkId,
      answer: q.answer,
      creatorAdminId: q.creatorAdminId ?? undefined,
      creatorEmployeeId: q.creatorEmployeeId ?? undefined,
      creatorSupervisorId: q.creatorSupervisorId ?? undefined,
      department: q.department,
      satisfaction: q.satisfaction,
      dissatisfaction: q.dissatisfaction,
      views: q.views,
    });
  }

  async save(question: Question): Promise<Question> {
    const { department, ...data } = question.toJSON();
    const upsert = await this.prisma.question.upsert({
      where: { id: data.id },
      update: data,
      create: {
        department: { connect: { id: data.departmentId } },
        creatorAdmin: data.creatorAdminId
          ? { connect: { id: data.creatorAdminId } }
          : undefined,
        creatorEmployee: data.creatorEmployeeId
          ? { connect: { id: data.creatorEmployeeId } }
          : undefined,
        creatorSupervisor: data.creatorSupervisorId
          ? { connect: { id: data.creatorSupervisorId } }
          : undefined,
        knowledgeChunk: question.knowledgeChunkId
          ? { connect: { id: data.knowledgeChunkId } }
          : undefined,
        text: data.text,
        satisfaction: data.satisfaction,
        dissatisfaction: data.dissatisfaction,
        views: data.views,
        answer: data.answer,
      },
    });
    return this.toDomain(upsert);
  }

  async findById(
    id: string,
    query?: QuestionQueryDto,
  ): Promise<Question | null> {
    const q = await this.prisma.question.findUnique({
      where: { id },
      include: {
        department: query?.includeDepartment
          ? { include: { parent: true } }
          : false,
      },
    });
    return q ? this.toDomain(q) : null;
  }

  async findAll(query: QuestionQueryDto): Promise<Question[]> {
    const qs = await this.prisma.question.findMany({
      include: {
        department: query.includeDepartment
          ? { include: { parent: true } }
          : false,
      },
    });
    return qs.map((q) => this.toDomain(q));
  }

  async removeById(id: string): Promise<Question | null> {
    await this.prisma.question.delete({ where: { id } });
    return null;
  }

  async findByIds(ids: string[], query: QuestionQueryDto): Promise<Question[]> {
    const qs = await this.prisma.question.findMany({
      where: { id: { in: ids } },
      include: {
        department: query.includeDepartment
          ? { include: { parent: true } }
          : false,
      },
    });
    return qs.map(this.toDomain);
  }

  async update(id: string, update: Partial<Question>): Promise<Question> {
    const data: any = {};
    if (update.text) data.text = update.text;
    if (update.departmentId) data.departmentId = update.departmentId.value;
    if (update.knowledgeChunkId)
      data.knowledgeChunkId = update.knowledgeChunkId.value;
    if (update.satisfaction) data.satisfaction = update.satisfaction;
    if (update.dissatisfaction) data.dissatisfaction = update.dissatisfaction;
    if (update.views) data.views = update.views;
    if (update.answer) data.answer = update.answer;
    const updated = await this.prisma.question.update({ where: { id }, data });
    return this.toDomain(updated);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.question.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.question.count();
  }

  async findByCriteria(
    criteria: Partial<Question>,
    query: QuestionQueryDto,
  ): Promise<Question[]> {
    const where: any = {};
    if (criteria.text) where.text = criteria.text;
    if (criteria.departmentId) where.departmentId = criteria.departmentId.value;
    if (criteria.knowledgeChunkId)
      where.knowledgeChunkId = criteria.knowledgeChunkId.value;
    const qs = await this.prisma.question.findMany({
      where,
      include: {
        department: query.includeDepartment
          ? { include: { parent: true } }
          : false,
      },
    });
    return qs.map(this.toDomain);
  }

  async findByDepartmentId(
    departmentId: string,
    query: QuestionQueryDto,
  ): Promise<Question[]> {
    const questions = await this.prisma.question.findMany({
      where: { departmentId },
      include: {
        department: query.includeDepartment
          ? { include: { parent: true } }
          : false,
      },
    });

    return questions.map(this.toDomain);
  }

  async groupQuestionsByDepartment(): Promise<any[]> {
    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      WITH sorted_questions AS (
        SELECT
          q.id AS question_id,
          q.text AS question_text,
          q.answer,
          q.department_id,
          d.name AS department_name,
          d.parent_id,
          q.created_at
        FROM questions q
        JOIN departments d ON q.department_id = d.id
        ORDER BY q.text -- sort questions alphabetically
      )
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        d.parent_id,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sq.question_id,
              'text', sq.question_text,
              'answer', sq.answer,
              'createdAt', sq.created_at
            )
              ORDER BY sq.question_text
          ) FILTER (WHERE sq.question_id IS NOT NULL),
          '[]'
        ) AS questions
      FROM departments d
      LEFT JOIN sorted_questions sq ON sq.department_id = d.id
      GROUP BY d.id, d.name
      ORDER BY d.name;
      `);
    return result;
  }

  async faqStats(limit: number = 5): Promise<FaqStats> {
    return this.prisma.$queryRaw<FaqStats>`
      WITH interaction_counts AS (
        SELECT
          qi.question_id,
          COUNT(*) FILTER (WHERE qi.type = 'view')    AS view_count,
          COUNT(*) FILTER (WHERE qi.type = 'like')    AS like_count,
          COUNT(*) FILTER (WHERE qi.type = 'dislike') AS dislike_count
        FROM question_interactions qi
        GROUP BY qi.question_id
      ),

      faq_stats AS (
        SELECT
          q.id,
          q.text,
          q.answer,
          q.department_id,
          COALESCE(ic.view_count, 0)    AS view_count,
          COALESCE(ic.like_count, 0)    AS like_count,
          COALESCE(ic.dislike_count, 0) AS dislike_count
        FROM questions q
        LEFT JOIN interaction_counts ic ON q.id = ic.question_id
      ),

      total_views AS (
        SELECT SUM(view_count) AS total_views
        FROM faq_stats
      ),

      category_views AS (
        SELECT
          d.id   AS department_id,
          d.name AS department_name,
          SUM(f.view_count) AS total_views
        FROM faq_stats f
        JOIN departments d ON f.department_id = d.id
        GROUP BY d.id, d.name
        ORDER BY total_views DESC
      ),

      top_faqs AS (
        SELECT
          f.id,
          f.text,
          f.answer,
          f.view_count,
          d.name AS department_name
        FROM faq_stats f
        JOIN departments d ON f.department_id = d.id
        ORDER BY f.view_count DESC
        LIMIT ${limit}
      ),

      satisfaction AS (
        SELECT
          CASE 
            WHEN (SUM(like_count) + SUM(dislike_count)) = 0 
            THEN NULL
            ELSE (SUM(like_count)::float / (SUM(like_count) + SUM(dislike_count))::float) * 100
          END AS faq_satisfaction_rate
        FROM faq_stats
      )

      SELECT
        (SELECT total_views FROM total_views) AS totalViews,
        (SELECT json_agg(row_to_json(c)) FROM category_views c) AS categoryViews,
        (SELECT json_agg(row_to_json(t)) FROM top_faqs t) AS topFaqs,
        (SELECT faq_satisfaction_rate FROM satisfaction) AS faqSatisfactionRate;
    `;
  }

  groupByDepartment(): Promise<any[]> {
    return this.prisma.$queryRawUnsafe(`
      WITH question_with_parent AS (
        SELECT
          q.id               AS question_id,
          q.text             AS question_text,
          q.views            AS question_views,
          q.satisfaction     AS question_satisfaction,
          q.dissatisfaction  AS question_dissatisfaction,
          q.created_at  AS created_at,
          q.updated_at  AS updated_at,
          q.answer  AS answer,
          d.id               AS department_id,
          d.name             AS department_name,
          COALESCE(d.parent_id, d.id) AS parent_department_id
        FROM questions q
        JOIN departments d ON q.department_id = d.id
      )
      SELECT
        pd.id   AS "departmentId",
        pd.name AS "departmentName",
        ARRAY_AGG(
          JSONB_BUILD_OBJECT(
            'id', qwp.question_id,
            'text', qwp.question_text,
            'views', qwp.question_views,
            'satisfaction', qwp.question_satisfaction,
            'dissatisfaction', qwp.question_dissatisfaction,
            'created_at', qwp.created_at,
            'updated_at', qwp.updated_at,
            'answer', qwp.answer
          )
          || CASE 
              WHEN qwp.department_id != pd.id 
              THEN JSONB_BUILD_OBJECT(
                      'departmentId', qwp.department_id,
                      'departmentName', qwp.department_name
                    )
              ELSE '{}'::jsonb
            END
        ) AS questions
      FROM question_with_parent qwp
      JOIN departments pd 
        ON qwp.parent_department_id = pd.id
      WHERE pd.parent_id IS NULL
      GROUP BY pd.id, pd.name;
    `);
  }
}
