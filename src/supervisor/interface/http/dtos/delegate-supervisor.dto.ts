import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class DelegateSupervisorDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  fromSupervisorUserId: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  toSupervisorUserId: string;
}
