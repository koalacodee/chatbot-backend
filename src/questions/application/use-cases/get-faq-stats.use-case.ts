import { Injectable } from '@nestjs/common';
import {
  FaqStats,
  QuestionRepository,
} from 'src/questions/domain/repositories/question.repository';

interface GetFaqStatsInput {
  limit?: number;
}

@Injectable()
export class GetFaqStatsUseCase {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async execute({ limit }: GetFaqStatsInput): Promise<FaqStats> {
    return this.questionRepo.faqStats(limit);
  }
}
