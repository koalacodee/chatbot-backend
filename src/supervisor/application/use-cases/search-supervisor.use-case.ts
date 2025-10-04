import { Injectable } from '@nestjs/common';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { GetUsersProfilePicturesUseCase } from 'src/profile/application/use-cases/get-users-profile-pictures.use-case';

interface SearchSupervisorInput {
  search: string;
}

@Injectable()
export class SearchSupervisorUseCase {
  constructor(
    private readonly supervisorRepository: SupervisorRepository,
    private readonly getUsersProfilePicturesUseCase: GetUsersProfilePicturesUseCase,
  ) {}

  async execute(input: SearchSupervisorInput) {
    const supervisors = await this.supervisorRepository.search(input.search);

    // Get all user IDs from supervisors
    const userIds = supervisors.map((supervisor) =>
      supervisor.userId.toString(),
    );

    // Fetch profile pictures for all users
    const { profilePictures } =
      await this.getUsersProfilePicturesUseCase.execute({ userIds });

    // Attach profile pictures to supervisors
    const supervisorsWithProfilePictures = supervisors.map((supervisor) => {
      const profilePicture = profilePictures.get(supervisor.userId.toString());
      return {
        ...supervisor.toJSON(),
        user: supervisor.user
          ? {
              ...supervisor.user.toJSON(),
              profilePicture: profilePicture
                ? profilePicture.toJSON().id
                : null,
            }
          : null,
      };
    });

    return supervisorsWithProfilePictures;
  }
}
