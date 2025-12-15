import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../../common/drizzle/drizzle.service';
import {
  FaqStats,
  QuestionQueryDto,
  QuestionRepository,
  ViewdFaqDto,
} from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import {
  Department,
  DepartmentVisibility,
} from 'src/department/domain/entities/department.entity';
import {
  questions,
  departments,
  questionInteractions,
  questionViews,
} from '../../../common/drizzle/schema';
import {
  eq,
  inArray,
  and,
  or,
  sql,
  count,
  desc,
  asc,
  isNull,
  isNotNull,
} from 'drizzle-orm';
import { UUID } from 'src/shared/value-objects/uuid.vo';

@Injectable()
export class DrizzleQuestionRepository extends QuestionRepository {
  constructor(private readonly drizzleService: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private toDomain(
    q: typeof questions.$inferSelect,
    department?: typeof departments.$inferSelect,
  ): Question {
    return Question.create({
      id: q.id,
      text: q.text,
      departmentId: q.departmentId,
      knowledgeChunkId: q.knowledgeChunkId || undefined,
      answer: q.answer || undefined,
      creatorAdminId: q.creatorAdminId || undefined,
      creatorEmployeeId: q.creatorEmployeeId,
      creatorSupervisorId: q.creatorSupervisorId || undefined,
      department: department
        ? Department.create({
            id: department.id,
            name: department.name,
            visibility:
              DepartmentVisibility[
                department.visibility.toUpperCase() as keyof typeof DepartmentVisibility
              ],
            parentId: department.parentId || undefined,
          })
        : undefined,
      satisfaction: q.satisfaction,
      dissatisfaction: q.dissatisfaction,
      views: q.views,
      availableLangs: q.availableLangs as any,
    });
  }

  async save(question: Question): Promise<Question> {
    const data = question.toJSON();
    const insertData: typeof questions.$inferInsert = {
      id: data.id,
      text: data.text,
      departmentId: data.departmentId,
      knowledgeChunkId: data.knowledgeChunkId || null,
      answer: data.answer || null,
      creatorAdminId: data.creatorAdminId || null,
      creatorEmployeeId: data.creatorEmployeeId,
      creatorSupervisorId: data.creatorSupervisorId || null,
      satisfaction: data.satisfaction || 0,
      dissatisfaction: data.dissatisfaction || 0,
      views: data.views || 0,
      availableLangs: data.availableLangs || ['RAY'],
      updatedAt: new Date().toISOString(),
    };

    const [saved] = await this.db
      .insert(questions)
      .values(insertData)
      .onConflictDoUpdate({
        target: questions.id,
        set: {
          text: insertData.text,
          answer: insertData.answer,
          departmentId: insertData.departmentId,
          knowledgeChunkId: insertData.knowledgeChunkId,
          satisfaction: insertData.satisfaction,
          dissatisfaction: insertData.dissatisfaction,
          views: insertData.views,
          availableLangs: insertData.availableLangs,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning();

    return this.toDomain(saved);
  }

  async findById(
    id: string,
    queryDto?: QuestionQueryDto,
  ): Promise<Question | null> {
    const query = this.db.select().from(questions);
    if (queryDto?.includeDepartment) {
      const [q] = await query
        .leftJoin(departments, eq(questions.departmentId, departments.id))
        .where(eq(questions.id, id))
        .limit(1);
      if (!q) return null;
      return this.toDomain(q.questions, q.departments);
    } else {
      const [q] = await query.where(eq(questions.id, id)).limit(1);
      if (!q) return null;
      return this.toDomain(q);
    }
  }

  async findAll(queryDto?: QuestionQueryDto): Promise<Question[]> {
    const query = this.db.select().from(questions);

    if (queryDto?.includeDepartment) {
      const rows = await query.leftJoin(
        departments,
        eq(questions.departmentId, departments.id),
      );

      return rows.map((q) => this.toDomain(q.questions, q.departments));
    } else {
      const rows = await query;
      return rows.map((q) => this.toDomain(q));
    }
  }

  async removeById(id: string): Promise<Question | null> {
    const [deleted] = await this.db
      .delete(questions)
      .where(eq(questions.id, id))
      .returning();
    return deleted ? this.toDomain(deleted) : null;
  }

  async findByIds(
    ids: string[],
    queryDto?: QuestionQueryDto,
  ): Promise<Question[]> {
    if (ids.length === 0) return [];

    const query = this.db.select().from(questions);

    if (queryDto?.includeDepartment) {
      const rows = await query
        .leftJoin(departments, eq(questions.departmentId, departments.id))
        .where(inArray(questions.id, ids));

      return rows.map((q) => this.toDomain(q.questions, q.departments));
    } else {
      const rows = await query.where(inArray(questions.id, ids));
      return rows.map((q) => this.toDomain(q));
    }
  }

  async update(
    id: string,
    update: Partial<Question>,
    queryDto?: QuestionQueryDto,
  ): Promise<Question> {
    const data: typeof questions.$inferInsert =
      {} as typeof questions.$inferInsert;
    if (update.text) data.text = update.text;
    if (update.departmentId) data.departmentId = update.departmentId.value;
    if (update.knowledgeChunkId)
      data.knowledgeChunkId = update.knowledgeChunkId.value;
    if (update.satisfaction !== undefined)
      data.satisfaction = update.satisfaction;
    if (update.dissatisfaction !== undefined)
      data.dissatisfaction = update.dissatisfaction;
    if (update.views !== undefined) data.views = update.views;
    if (update.answer !== undefined) data.answer = update.answer;
    if (update.availableLangs) data.availableLangs = update.availableLangs;

    const [updated] = await this.db
      .update(questions)
      .set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(questions.id, id))
      .returning();

    return this.toDomain(updated);
  }

  async exists(id: string): Promise<boolean> {
    const [result] = await this.db
      .select({ count: count() })
      .from(questions)
      .where(eq(questions.id, id));

    return (result?.count ?? 0) > 0;
  }

  async count(queryDto?: QuestionQueryDto): Promise<number> {
    const [result] = await this.db.select({ count: count() }).from(questions);
    return result?.count ?? 0;
  }

  async findByCriteria(
    criteria: Partial<Question>,
    queryDto?: QuestionQueryDto,
  ): Promise<Question[]> {
    const conditions = [];
    if (criteria.text) conditions.push(eq(questions.text, criteria.text));
    if (criteria.departmentId)
      conditions.push(eq(questions.departmentId, criteria.departmentId.value));
    if (criteria.knowledgeChunkId)
      conditions.push(
        eq(questions.knowledgeChunkId, criteria.knowledgeChunkId.value),
      );

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = this.db.select().from(questions);

    if (queryDto?.includeDepartment) {
      const rows = await query
        .leftJoin(departments, eq(questions.departmentId, departments.id))
        .where(whereClause);

      return rows.map((q) => this.toDomain(q.questions, q.departments));
    } else {
      const rows = await query.where(whereClause);
      return rows.map((q) => this.toDomain(q));
    }
  }

  async findByDepartmentId(
    departmentId: string,
    queryDto?: QuestionQueryDto,
  ): Promise<Question[]> {
    const query = this.db.select().from(questions);

    if (queryDto?.includeDepartment) {
      const rows = await query
        .leftJoin(departments, eq(questions.departmentId, departments.id))
        .where(eq(questions.departmentId, departmentId));

      return rows.map((q) => this.toDomain(q.questions, q.departments));
    } else {
      const rows = await query.where(eq(questions.departmentId, departmentId));
      return rows.map((q) => this.toDomain(q));
    }
  }

  async groupQuestionsByDepartment(): Promise<any[]> {
    const pgClient = this.drizzleService.getPgClient();
    const result = await pgClient.query(`
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
        ORDER BY q.text
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
      GROUP BY d.id, d.name, d.parent_id
      ORDER BY d.name;
    `);

    return result.rows;
  }

  async faqStats(limit: number = 5): Promise<FaqStats> {
    const pgClient = this.drizzleService.getPgClient();
    const result = await pgClient.query<FaqStats>(`
      WITH interaction_counts AS (
        SELECT
          qi.question_id,
          COUNT(*) FILTER (WHERE qi.type = 'view')    AS view_count,
          COUNT(*) FILTER (WHERE qi.type = 'satisfaction')    AS like_count,
          COUNT(*) FILTER (WHERE qi.type = 'dissatisfaction') AS dislike_count
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
        (SELECT total_views FROM total_views) AS "totalViews",
        (SELECT json_agg(row_to_json(c)) FROM category_views c) AS "categoryViews",
        (SELECT json_agg(row_to_json(t)) FROM top_faqs t) AS "topFaqs",
        (SELECT faq_satisfaction_rate FROM satisfaction) AS "faqSatisfactionRate";
    `);

    return result.rows[0] as FaqStats;
  }

  async groupByDepartment(options: {
    departmentIds?: string[];
  }): Promise<any[]> {
    const deptIds = options.departmentIds || [];
    const isUnrestricted =
      !options.departmentIds || options.departmentIds.length === 0;

    const pgClient = this.drizzleService.getPgClient();

    if (isUnrestricted) {
      const result = await pgClient.query(`
        WITH question_with_parent AS (
          SELECT
            q.id               AS question_id,
            q.text             AS question_text,
            q.views            AS question_views,
            q.satisfaction     AS question_satisfaction,
            q.dissatisfaction  AS question_dissatisfaction,
            q.created_at       AS created_at,
            q.updated_at       AS updated_at,
            q.answer           AS answer,
            q.available_langs  AS available_langs,
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
              'answer', qwp.answer,
              'availableLangs', qwp.available_langs
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
      return result.rows;
    } else {
      const result = await pgClient.query(
        `
        WITH question_with_parent AS (
          SELECT
            q.id               AS question_id,
            q.text             AS question_text,
            q.views            AS question_views,
            q.satisfaction     AS question_satisfaction,
            q.dissatisfaction  AS question_dissatisfaction,
            q.created_at       AS created_at,
            q.updated_at       AS updated_at,
            q.answer           AS answer,
            q.available_langs  AS available_langs,
            d.id               AS department_id,
            d.name             AS department_name,
            COALESCE(d.parent_id, d.id) AS parent_department_id
          FROM questions q
          JOIN departments d ON q.department_id = d.id
          WHERE d.id = ANY($1::uuid[]) OR d.parent_id = ANY($1::uuid[])
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
              'answer', qwp.answer,
              'availableLangs', qwp.available_langs
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
      `,
        [deptIds],
      );
      return result.rows;
    }
  }

  async viewFaqs(options?: {
    limit?: number;
    page?: number;
    departmentId?: string;
    guestId: string;
    viewPrivate?: boolean;
  }): Promise<ViewdFaqDto[]> {
    if (!options?.guestId) {
      throw new Error('guestId is required');
    }

    const {
      limit = 10,
      page = 1,
      departmentId,
      guestId,
      viewPrivate,
    } = options;

    const pgClient = this.drizzleService.getPgClient();
    const result = await pgClient.query<ViewdFaqDto>(
      `
      WITH faqs_cte AS (
        SELECT 
          q.id,
          q.text,
          q.answer,
          q.department_id,
          q.created_at,
          CASE 
            WHEN qi.id IS NOT NULL THEN TRUE 
            ELSE FALSE 
          END AS "isRated",
          CASE 
            WHEN qv.id IS NOT NULL THEN TRUE
            ELSE FALSE
          END AS "isViewed"
        FROM questions q
        LEFT JOIN question_interactions qi
          ON qi.question_id = q.id AND qi.guest_id = $1::uuid
        LEFT JOIN question_views qv
          ON qv.question_id = q.id AND qv.guest_id = $1::uuid
        JOIN departments d ON q.department_id = d.id
        WHERE ($2::uuid IS NULL OR q.department_id = $2::uuid)
        AND ($5::boolean = TRUE OR d.visibility = 'public')
      )
      SELECT *
      FROM faqs_cte
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4;
      `,
      [
        guestId,
        departmentId || null,
        limit,
        (page - 1) * limit,
        viewPrivate || false,
      ],
    );

    return result.rows;
  }

  async recordRating({
    guestId,
    faqId,
    satisfactionType,
  }: {
    guestId: string;
    faqId: string;
    satisfactionType: 'SATISFACTION' | 'DISSATISFACTION';
  }): Promise<void> {
    const pgClient = this.drizzleService.getPgClient();

    await pgClient.query('BEGIN');

    try {
      // Get previous reaction
      const previousReaction = await pgClient.query(
        `
        SELECT * FROM question_interactions
        WHERE question_id = $1 AND guest_id = $2
        `,
        [faqId, guestId],
      );

      const interactionType =
        satisfactionType === 'SATISFACTION'
          ? 'satisfaction'
          : 'dissatisfaction';

      // Upsert interaction
      await pgClient.query(
        `
        INSERT INTO question_interactions (id, question_id, guest_id, type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (question_id, guest_id)
        DO UPDATE SET type = $4, updated_at = CURRENT_TIMESTAMP
        `,
        [UUID.create().toString(), faqId, guestId, interactionType],
      );

      // Calculate satisfaction changes
      let satisfactionChange = 0;
      let dissatisfactionChange = 0;

      if (previousReaction.rows.length === 0) {
        // First time rating
        if (satisfactionType === 'SATISFACTION') satisfactionChange = 1;
        if (satisfactionType === 'DISSATISFACTION') dissatisfactionChange = 1;
      } else if (previousReaction.rows[0].type !== interactionType) {
        // Changed rating
        if (satisfactionType === 'SATISFACTION') {
          satisfactionChange = 1;
          dissatisfactionChange = -1;
        } else {
          satisfactionChange = -1;
          dissatisfactionChange = 1;
        }
      }

      // Update question stats
      if (satisfactionChange !== 0 || dissatisfactionChange !== 0) {
        await pgClient.query(
          `
          UPDATE questions
          SET satisfaction = satisfaction + $1,
              dissatisfaction = dissatisfaction + $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          `,
          [satisfactionChange, dissatisfactionChange, faqId],
        );
      }

      await pgClient.query('COMMIT');
    } catch (error) {
      await pgClient.query('ROLLBACK');
      throw error;
    }
  }

  async recordView({
    guestId,
    faqId,
  }: {
    guestId: string;
    faqId: string;
  }): Promise<void> {
    const pgClient = this.drizzleService.getPgClient();

    await pgClient.query('BEGIN');

    try {
      // Check if view exists
      const previousView = await pgClient.query(
        `
        SELECT * FROM question_views
        WHERE question_id = $1 AND guest_id = $2
        `,
        [faqId, guestId],
      );

      if (previousView.rows.length === 0) {
        // Create view record
        await pgClient.query(
          `
          INSERT INTO question_views (id, question_id, guest_id, created_at, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `,
          [UUID.create().toString(), faqId, guestId],
        );

        // Increment view count
        await pgClient.query(
          `
          UPDATE questions
          SET views = views + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          `,
          [faqId],
        );
      }

      await pgClient.query('COMMIT');
    } catch (error) {
      await pgClient.query('ROLLBACK');
      throw error;
    }
  }

  async findByDepartmentIds(
    departmentIds: string[],
    queryDto?: QuestionQueryDto,
  ): Promise<Question[]> {
    if (departmentIds.length === 0) return [];

    const qs = await this.db
      .select()
      .from(questions)
      .where(inArray(questions.departmentId, departmentIds));

    if (queryDto?.includeDepartment) {
      const depts = await this.db
        .select()
        .from(departments)
        .where(inArray(departments.id, departmentIds));

      const deptMap = new Map(depts.map((d) => [d.id, d]));
      return qs.map((q) => this.toDomain(q, deptMap.get(q.departmentId)));
    }

    return qs.map((q) => this.toDomain(q));
  }
}
