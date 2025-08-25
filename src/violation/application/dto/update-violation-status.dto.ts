import { IsString } from 'class-validator';

export class ViolationIdDto {
  @IsString()
  violationId: string;
}

export class MarkViolationAsPaidInputDto extends ViolationIdDto {}
export class MarkViolationAsPendingInputDto extends ViolationIdDto {}

export interface ViolationStatusOutputDto {
  id: string;
  isPaid: boolean;
  updatedAt: string;
}
