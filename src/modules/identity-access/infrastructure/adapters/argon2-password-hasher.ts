import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { PasswordHasherPort } from '../../application/ports/outbound/password-hasher.port';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasherPort {
  compare(password: string, passwordHash: string): Promise<boolean> {
    return argon2.verify(passwordHash, password);
  }
  hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  }
}
