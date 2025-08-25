import { PartialType } from '@nestjs/swagger';
import { AddSupervisorByAdminDto } from './add-supervisor-by-admin.dto';

export class UpdateSupervisorDto extends PartialType(AddSupervisorByAdminDto) {}
