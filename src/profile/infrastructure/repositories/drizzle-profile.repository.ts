import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import {
  ProfileRepository,
  UpdateProfileData,
} from '../../domain/repositories/profile.repository';
import { users } from 'src/common/drizzle/schema';
import { eq } from 'drizzle-orm';
import { Password } from 'src/shared/value-objects/password.vo';

@Injectable()
export class DrizzleProfileRepository extends ProfileRepository {
  constructor(private readonly drizzleService: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileData,
  ): Promise<void> {
    const updateData: Record<string, any> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.username !== undefined) {
      updateData.username = data.username;
    }

    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    if (data.password !== undefined) {
      // Hash the password using Password.fromPlain
      const hashedPassword = await Password.fromPlain(data.password);
      updateData.password = hashedPassword.toString();
    }

    // Only update if there's something to update
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date().toISOString();

      await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));
    }
  }
}

