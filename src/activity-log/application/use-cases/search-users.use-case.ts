import { Injectable } from '@nestjs/common';
import { User } from 'src/shared/entities/user.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';

export interface SearchUsersInputDto {
  searchQuery: string;
}

@Injectable()
export class SearchUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: SearchUsersInputDto): Promise<User[]> {
    return this.userRepository.search(input.searchQuery);
  }
}
