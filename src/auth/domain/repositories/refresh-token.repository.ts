import { RefreshToken } from '../entities/refresh-token.entity';

export abstract class RefreshTokenRepository {
  abstract save(refreshToken: RefreshToken): Promise<void>;

  abstract findByToken(token: string): Promise<RefreshToken>;

  abstract deleteByToken(token: string): Promise<void>;

  abstract deleteAllForTarget(userId: string): Promise<void>;

  abstract revokeToken(token: string): Promise<void>;
}
