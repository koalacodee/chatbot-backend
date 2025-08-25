import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { VehicleLicenseRepository } from 'src/vehicle-license/domain/repositories/vehicle-license.repository';

@Injectable()
export class UpdateLicenseStatusJob {
  private readonly logger: Logger = new Logger(UpdateLicenseStatusJob.name);

  constructor(private readonly vehicleLicenseRepo: VehicleLicenseRepository) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    const updated = await this.vehicleLicenseRepo.updateLicenseStatuses();
    this.logger.log(
      `Updated ${updated} vehicle license${updated === 1 ? '' : 's'}`,
    );
  }
}
