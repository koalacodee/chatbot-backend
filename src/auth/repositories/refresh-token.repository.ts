export abstract class RefreshTokenRepository {
  abstract create(data: {
    token: string;
    userId: string;
    expiresAt: Date;
  }): Promise<void>;
  
  abstract findByToken(token: string): Promise<any>;
  
  abstract deleteByToken(token: string): Promise<void>;
  
  abstract deleteAllForUser(userId: string): Promise<void>;
  
  abstract revokeToken(token: string): Promise<void>;
}