import { Injectable, NotFoundException } from '@nestjs/common';
import { ViolationRepository } from '../../domain/repositories/violation.repository';
import { ViolationIdDto } from '../dto/update-violation-status.dto';

@Injectable()
export class DeleteViolationUseCase {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async execute(input: ViolationIdDto): Promise<{ success: boolean }> {
    // Check if violation exists
    const exists = await this.violationRepository.exists(input.violationId);
    
    if (!exists) {
      throw new NotFoundException('Violation not found');
    }

    // Delete the violation
    await this.violationRepository.removeById(input.violationId);
    
    return { success: true };
  }
}
