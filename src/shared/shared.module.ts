import { Global, Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { RedisService } from './infrastructure/redis';
import { EmailModule } from './infrastructure/email/email.module';
import { PointRepository } from './repositories/point.repository';
import { QdrantPointRepository } from './infrastructure/repositories/qdrant-point.repository';
import { EmbeddingService } from './embedding/embedding-service.interface';
import { JinaAiEmbeddingService } from './infrastructure/ai/jina-ai.embedding-service';

@Global()
@Module({
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: PointRepository, useClass: QdrantPointRepository },
    {
      provide: EmbeddingService,
      useClass: JinaAiEmbeddingService,
    },
    RedisService,
  ],
  exports: [UserRepository, RedisService, PointRepository, EmbeddingService],
  imports: [EmailModule],
})
export class SharedModule {}
