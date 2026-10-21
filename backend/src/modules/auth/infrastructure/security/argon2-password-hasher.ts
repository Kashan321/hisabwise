import argon2 from 'argon2';
import { PasswordHasherPort } from '../../application/ports/password-hasher.port';

export class Argon2PasswordHasher implements PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
