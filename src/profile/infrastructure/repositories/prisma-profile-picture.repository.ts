import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ProfilePictureRepository } from '../../domain/repositories/profile-picture.repository';
import { ProfilePicture } from '../../domain/entities/profile-picture.entity';

@Injectable()
export class PrismaProfilePictureRepository extends ProfilePictureRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(profilePicture: ProfilePicture): Promise<ProfilePicture> {
    const data = profilePicture.toJSON();

    const saved = await this.prisma.profilePicture.upsert({
      where: { id: data.id },
      update: {
        filename: data.filename,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        updatedAt: data.updatedAt,
      },
      create: {
        id: data.id,
        userId: data.userId,
        filename: data.filename,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });

    return this.mapToDomain(saved);
  }

  async findById(id: string): Promise<ProfilePicture | null> {
    const profilePicture = await this.prisma.profilePicture.findUnique({
      where: { id },
    });

    return profilePicture ? this.mapToDomain(profilePicture) : null;
  }

  async findByUserId(userId: string): Promise<ProfilePicture | null> {
    const profilePicture = await this.prisma.profilePicture.findUnique({
      where: { userId },
    });

    return profilePicture ? this.mapToDomain(profilePicture) : null;
  }

  async findByUserIds(userIds: string[]): Promise<ProfilePicture[]> {
    const profilePictures = await this.prisma.profilePicture.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    return profilePictures.map((profilePicture) =>
      this.mapToDomain(profilePicture),
    );
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.profilePicture.count({
      where: { id },
    });
    return count > 0;
  }

  async removeById(id: string): Promise<ProfilePicture | null> {
    const profilePicture = await this.prisma.profilePicture.findUnique({
      where: { id },
    });

    if (!profilePicture) {
      return null;
    }

    await this.prisma.profilePicture.delete({
      where: { id },
    });

    return this.mapToDomain(profilePicture);
  }

  async removeByUserId(userId: string): Promise<ProfilePicture | null> {
    const profilePicture = await this.prisma.profilePicture.findUnique({
      where: { userId },
    });

    if (!profilePicture) {
      return null;
    }

    await this.prisma.profilePicture.delete({
      where: { userId },
    });

    return this.mapToDomain(profilePicture);
  }

  async update(
    id: string,
    update: Partial<
      Pick<ProfilePicture, 'filename' | 'originalName' | 'mimeType' | 'size'>
    >,
  ): Promise<ProfilePicture> {
    const updated = await this.prisma.profilePicture.update({
      where: { id },
      data: {
        filename: update.filename,
        originalName: update.originalName,
        mimeType: update.mimeType,
        size: update.size,
        updatedAt: new Date(),
      },
    });

    return this.mapToDomain(updated);
  }

  private mapToDomain(profilePicture: any): ProfilePicture {
    return ProfilePicture.create({
      id: profilePicture.id,
      userId: profilePicture.userId,
      filename: profilePicture.filename,
      originalName: profilePicture.originalName,
      mimeType: profilePicture.mimeType,
      size: profilePicture.size,
      createdAt: profilePicture.createdAt,
      updatedAt: profilePicture.updatedAt,
    });
  }
}
