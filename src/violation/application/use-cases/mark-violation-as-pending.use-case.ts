import { Injectable, NotFoundException } from '@nestjs/common';
import { ViolationRepository } from '../../domain/repositories/violation.repository';
import {
  ViolationIdDto,
  ViolationStatusOutputDto,
} from '../dto/update-violation-status.dto';

@Injectable()
export class MarkViolationAsPendingUseCase {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async execute(input: ViolationIdDto): Promise<ViolationStatusOutputDto> {
    // Find the violation
    const violation = await this.violationRepository.findById(
      input.violationId,
    );

    if (!violation) {
      throw new NotFoundException({
        details: [{ field: 'violationId', message: 'Violation not found' }],
      });
    }

    // Update status to pending
    violation.isPaid = false;
    const updatedAt = new Date();
    violation.updatedAt = updatedAt;

    // Save the updated violation
    await this.violationRepository.save(violation);

    // Return the result
    return {
      id: violation.id,
      isPaid: false,
      updatedAt: updatedAt.toISOString(),
    };
  }
}
