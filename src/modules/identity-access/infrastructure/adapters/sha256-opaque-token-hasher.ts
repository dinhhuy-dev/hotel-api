import { Injectable } from '@nestjs/common';
import { OpaqueTokenHasherPort } from '../../application/ports/outbound/opaque-token-hasher.port';
import { createHash } from 'node:crypto';

@Injectable()
export class Sha256OpaqueTokenHasher implements OpaqueTokenHasherPort {
  hash(token: string): string {
    return createHash('sha256').update(token, 'utf-8').digest('hex');
  }
}
