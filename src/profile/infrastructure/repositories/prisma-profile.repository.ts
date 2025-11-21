import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  ProfileRepository,
  UpdateProfileData,
} from '../../domain/repositories/profile.repository';
import { Password } from 'src/shared/value-objects/password.vo';

@Injectable()
export class PrismaProfileRepository extends ProfileRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
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
      updateData.updatedAt = new Date();

      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }
  }
}

