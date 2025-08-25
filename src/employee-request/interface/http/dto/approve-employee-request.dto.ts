import { IsNotEmpty, IsString } from 'class-validator';

export class ApproveEmployeeRequestDto {
  @IsNotEmpty()
  @IsString()
  supervisorId: string;
}
