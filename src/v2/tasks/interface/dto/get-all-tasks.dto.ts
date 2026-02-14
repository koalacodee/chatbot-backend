import { Expose, Type } from 'class-transformer';
import {
  ValidateNested,
} from 'class-validator';
import { TaskResponseDto } from './create-task.dto';
import { CursorDto } from './cursor.dto';

export class GetAllTasksRequestDto extends CursorDto { }

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class AttachmentResponseDto {
  @Expose()
  id: string;

  @Expose()
  type: string;

  @Expose()
  filename: string;

  @Expose()
  originalName: string;

  @Expose()
  expirationDate?: Date;

  @Expose()
  targetId?: string;

  @Expose()
  userId?: string;

  @Expose()
  size: number;

  @Expose()
  signedUrl: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

export class TaskSubmissionResponseDto {
  @Expose()
  id: string;

  @Expose()
  taskId?: string;

  @Expose()
  delegationSubmissionId?: string;

  @Expose()
  performerId: string;

  @Expose()
  performerType: string;

  @Expose()
  performerName?: string;

  @Expose()
  notes?: string;

  @Expose()
  feedback?: string;

  @Expose()
  status: string;

  @Expose()
  submittedAt: Date;

  @Expose()
  reviewedAt?: Date;

  @Expose()
  reviewedByAdminId?: string;

  @Expose()
  reviewedBySupervisorId?: string;
}

export class CursorMetaResponseDto {
  @Expose()
  nextCursor?: string;

  @Expose()
  prevCursor?: string;

  @Expose()
  hasNextPage: boolean;

  @Expose()
  hasPrevPage: boolean;
}

export class GetAllTasksDataResponseDto {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskResponseDto)
  tasks: TaskResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskSubmissionResponseDto)
  submissions: TaskSubmissionResponseDto[];
}

export class GetAllTasksResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => CursorMetaResponseDto)
  meta: CursorMetaResponseDto;

  @Expose()
  @ValidateNested()
  @Type(() => GetAllTasksDataResponseDto)
  data: GetAllTasksDataResponseDto;
}
