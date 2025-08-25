import { Injectable } from '@nestjs/common';
import { ViolationRepository } from '../../domain/repositories/violation.repository';
import {
  GetViolationsInputDto,
  GetViolationsOutputDto,
} from '../dto/get-violations.dto';

@Injectable()
export class GetViolationsUseCase {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async execute(input: GetViolationsInputDto): Promise<GetViolationsOutputDto> {
    // Apply pagination defaults
    const page = input.page || 1;
    const limit = input.limit || 10;
    const offset = (page - 1) * limit;

    // Get paginated results
    const [violations, total] = await Promise.all([
      this.violationRepository.findWithFilters(
        {
          driverId: input.driverId ?? undefined,
          vehicleId: input.vehicleId ?? undefined,
          status: input.status ?? undefined,
        },
        offset,
        limit,
      ),
      this.violationRepository.count({
        driverId: input.driverId ?? undefined,
        vehicleId: input.vehicleId ?? undefined,
        status: input.status ?? undefined,
      }),
    ]);

    // Map to DTO
    return {
      data: violations.map((violation) => ({
        id: violation.id,
        driver: violation.driver,
        vehicle: violation.vehicle,
        rule: violation.rule,
        description: violation.description,
        amount: violation.amount,
        isPaid: violation.isPaid,
        triggerEventId: violation.triggerEventId,
        createdAt: violation.createdAt.toISOString(),
        updatedAt: violation.updatedAt.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
