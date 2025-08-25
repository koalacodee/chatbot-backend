import { IsNotEmpty, IsString } from 'class-validator';

export class RejectEmployeeRequestDto {
  @IsNotEmpty()
  @IsString()
  rejectionReason: string;
}
