import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class CalculateAgentPerformanceUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const result = await this.prisma.$queryRawUnsafe<{
      user_id: string;
      username: string;
      role: string;
      answered: number;
      satisfied: number;
      dissatisfied: number;
      satisfaction_rate: number;
    }>(`
      WITH answer_stats AS (
        SELECT
          u.id AS user_id,
          u.name AS username,
          u.role,
          COUNT(a.id) AS answered,
          COUNT(*) FILTER (WHERE a.rating = 'satisfied') AS satisfied,
          COUNT(*) FILTER (WHERE a.rating = 'dissatisfied') AS dissatisfied
        FROM users u
        LEFT JOIN support_ticket_answers a
          ON u.id = a.answerer_id
        GROUP BY u.id, u.name, u.role
      ),
      with_satisfaction AS (
        SELECT
          user_id,
          username,
          role,
          answered,
          satisfied,
          dissatisfied,
          CASE 
            WHEN (satisfied + dissatisfied) > 0 
              THEN (satisfied::float / (satisfied + dissatisfied)) * 100
            ELSE 0
          END AS satisfaction_rate
        FROM answer_stats
      )
      SELECT *
      FROM with_satisfaction
      WHERE answered > 0
      ORDER BY answered DESC;
      `);
    return result;
  }
}
