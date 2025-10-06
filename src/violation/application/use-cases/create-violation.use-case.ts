import { Injectable, NotFoundException } from '@nestjs/common';
import { Violation } from '../../domain/entities/violation.entity';
import { ViolationRepository } from '../../domain/repositories/violation.repository';
import {
  CreateViolationInputDto,
  CreateViolationOutputDto,
} from '../dto/create-violation.dto';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { VehicleRepository } from 'src/vehicle/domain/repositories/vehicle.repository';
import { ViolationRuleRepository } from '../../domain/repositories/violation-rule.repository';
import { UUID } from 'src/shared/value-objects/uuid.vo';

@Injectable()
export class CreateViolationUseCase {
  constructor(
    private readonly violationRepository: ViolationRepository,
    private readonly userRepository: UserRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly violationRuleRepository: ViolationRuleRepository,
  ) {}

  async execute(
    input: CreateViolationInputDto,
  ): Promise<CreateViolationOutputDto> {
    // Validate driver exists and is assigned to the specified vehicle
    const [driver, vehicle, rule] = await Promise.all([
      this.userRepository.findById(input.driverId),
      this.vehicleRepository.findById(input.vehicleId),
      this.violationRuleRepository.findById(input.ruleId),
    ]);

    if (!driver) {
      throw new NotFoundException({
        details: [{ field: 'driverId', message: 'Driver not found' }],
      });
    }

    if (!vehicle) {
      throw new NotFoundException({
        details: [{ field: 'vehicleId', message: 'Vehicle not found' }],
      });
    }

    if (!rule) {
      throw new NotFoundException({
        details: [{ field: 'ruleId', message: 'Violation rule not found' }],
      });
    }

    // Check if driver is assigned to the vehicle
    const isDriverAssigned = vehicle.driver.id === driver.id;

    if (!isDriverAssigned) {
      throw new NotFoundException({
        details: [
          {
            field: 'driverId',
            message: 'Driver is not assigned to the specified vehicle',
          },
        ],
      });
    }

    // Create the violation
    const violation = Violation.create({
      id: UUID.create().value,
      driver,
      vehicle,
      rule,
      description: input.description,
      amount: input.amount,
      isPaid: false,
      triggerEventId: input.triggerEventId,
      createdAt: input.date ? new Date(input.date) : new Date(),
      updatedAt: new Date(),
    });

    // Save the violation
    const savedViolation = await this.violationRepository.save(violation);

    // Return the DTO
    return {
      id: savedViolation.id,
      driverId: savedViolation.driver.id,
      vehicleId: savedViolation.vehicle.id.toString(),
      ruleId: savedViolation.rule.id,
      description: savedViolation.description,
      amount: savedViolation.amount,
      isPaid: savedViolation.isPaid,
      triggerEventId: savedViolation.triggerEventId,
      createdAt: savedViolation.createdAt.toISOString(),
      updatedAt: savedViolation.updatedAt.toISOString(),
    };
  }
}
