import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { hash, verify } from 'argon2';

export class Password {
  private constructor(private readonly hashed: string) {}

  static fromHash(hashed: string): Password {
    return new Password(hashed);
  }

  static async fromPlain(plain: string): Promise<Password> {
    const hashed = await hash(plain);
    return this.fromHash(hashed);
  }

  public getHash(): string {
    return this.hashed;
  }

  public toString() {
    return this.hashed;
  }

  public async verify(plain: string): Promise<true> {
    const isCorrect = await verify(this.hashed, plain);

    if (!isCorrect) {
      throw new UnauthorizedException({
        details: [{ field: 'password', message: 'Password is incorrect' }],
      });
    }

    return true;
  }
}
