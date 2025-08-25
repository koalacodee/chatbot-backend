import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DriverRepository } from 'src/driver/domain/repositories/driver.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Driver } from 'src/driver/domain/entities/driver.entity';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';

export interface AddDriverBySupervisorDto {
  supervisorId: string;
  username: string;
  name: string;
  email: string;
  temporaryPassword: string;
  employeeId?: string;
  jobTitle?: string;
  licensingNumber: string;
  drivingLicenseExpiry: Date;
}

@Injectable()
export class AddDriverBySupervisorUseCase {
  constructor(
    private readonly driverRepository: DriverRepository,
    private readonly userRepository: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
  ) {}

  async execute(
    dto: AddDriverBySupervisorDto,
  ): Promise<{ driver: Driver; user: User }> {
    // Verify supervisor exists
    const supervisor = await this.supervisorRepository.findByUserId(
      dto.supervisorId,
    );
    if (!supervisor) {
      throw new NotFoundException('Supervisor not found');
    }

    // Check if username already exists
    const existingUserByUsername = await this.userRepository.findByUsername(
      dto.username,
    );
    if (existingUserByUsername) {
      throw new ConflictException('Username already exists');
    }

    // Check if email already exists
    const existingUserByEmail = await this.userRepository.findByEmail(
      dto.email,
    );
    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if licensing number already exists
    const existingDriverByLicense =
      await this.driverRepository.findByLicensingNumber(dto.licensingNumber);
    if (existingDriverByLicense) {
      throw new ConflictException('Licensing number already exists');
    }

    // Check if employee ID already exists (if provided)
    if (dto.employeeId) {
      const existingUserByEmployeeId =
        await this.userRepository.findByEmployeeId(dto.employeeId);
      if (existingUserByEmployeeId) {
        throw new ConflictException('Employee ID already exists');
      }
    }

    // Create new user
    const newUser = await User.create({
      name: dto.name,
      email: dto.email,
      username: dto.username,
      password: dto.temporaryPassword,
      role: Roles.DRIVER,
      employeeId: dto.employeeId,
      jobTitle: dto.jobTitle,
    });

    const savedUser = await this.userRepository.save(newUser);

    // Create new driver
    const newDriver = Driver.create({
      userId: savedUser.id,
      supervisorId: supervisor.id.toString(),
      licensingNumber: dto.licensingNumber,
      drivingLicenseExpiry: dto.drivingLicenseExpiry,
    });

    await this.driverRepository.save(newDriver);

    return { driver: newDriver, user: savedUser };
  }
}
