import { Injectable } from '@nestjs/common';
import { IdGeneratorPort } from '../../application/ports/outbound/id-generator.port';
import { randomUUID } from 'node:crypto';

@Injectable()
export class UuidIdGenerator implements IdGeneratorPort {
  generate(): string {
    return randomUUID();
  }
}
