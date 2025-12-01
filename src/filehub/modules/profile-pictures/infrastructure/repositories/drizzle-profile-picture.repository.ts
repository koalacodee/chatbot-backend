import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { ProfilePictureRepository } from '../../domain/repositories/profile-picture.repository';
import { ProfilePicture } from '../../domain/entities/profile.picture.entity';
import { profilePictures } from 'src/common/drizzle/schema';
import { eq } from 'drizzle-orm';
import { UUID } from 'src/shared/value-objects/uuid.vo';

@Injectable()
export class DrizzleProfilePictureRepository extends ProfilePictureRepository {
  constructor(private readonly drizzleService: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private toDomain(record: any): ProfilePicture {
    return ProfilePicture.create({
      id: UUID.create(record.id),
      userId: UUID.create(record.userId),
      filename: record.filename,
      createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
    });
  }

  async save(profilePicture: ProfilePicture): Promise<ProfilePicture> {
    const data = {
      id: profilePicture.id.value,
      userId: profilePicture.userId.value,
      filename: profilePicture.filename,
      createdAt: profilePicture.createdAt.toISOString(),
      updatedAt: profilePicture.updatedAt.toISOString(),
    };

    await this.db
      .insert(profilePictures)
      .values(data)
      .onConflictDoUpdate({
        target: profilePictures.id,
        set: {
          filename: data.filename,
          userId: data.userId,
          updatedAt: new Date().toISOString(),
        },
      });

    return this.findById(profilePicture.id.value);
  }

  async findById(id: string): Promise<ProfilePicture | null> {
    const record = await this.db
      .select()
      .from(profilePictures)
      .where(eq(profilePictures.id, id))
      .limit(1);

    if (record.length === 0) {
      return null;
    }

    return this.toDomain(record[0]);
  }

  async findByUserId(userId: string): Promise<ProfilePicture | null> {
    const record = await this.db
      .select()
      .from(profilePictures)
      .where(eq(profilePictures.userId, userId))
      .limit(1);

    if (record.length === 0) {
      return null;
    }

    return this.toDomain(record[0]);
  }

  async removeById(id: string): Promise<ProfilePicture | null> {
    const profilePicture = await this.findById(id);
    if (!profilePicture) {
      return null;
    }

    await this.db.delete(profilePictures).where(eq(profilePictures.id, id));

    return profilePicture;
  }

  async removeByUserId(userId: string): Promise<ProfilePicture | null> {
    const profilePicture = await this.findByUserId(userId);
    if (!profilePicture) {
      return null;
    }

    await this.db
      .delete(profilePictures)
      .where(eq(profilePictures.userId, userId));

    return profilePicture;
  }

  async update(
    id: string,
    update: Partial<Pick<ProfilePicture, 'filename'>>,
  ): Promise<ProfilePicture> {
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (update.filename !== undefined) {
      updateData.filename = update.filename;
    }

    await this.db
      .update(profilePictures)
      .set(updateData)
      .where(eq(profilePictures.id, id));

    return this.findById(id);
  }
}
