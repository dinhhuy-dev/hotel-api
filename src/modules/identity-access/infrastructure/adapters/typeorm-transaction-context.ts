import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

@Injectable()
export class TypeOrmTransactionContext {
  private readonly storage = new AsyncLocalStorage<EntityManager>();

  run<T>(manager: EntityManager, work: () => Promise<T>): Promise<T> {
    return this.storage.run(manager, work);
  }

  getManager(): EntityManager | undefined {
    return this.storage.getStore();
  }

  getRepository<T extends ObjectLiteral>(
    target: EntityTarget<T>,
    fallback: Repository<T>,
  ): Repository<T> {
    return this.storage.getStore()?.getRepository(target) ?? fallback;
  }
}
