import { Injectable } from '@nestjs/common';
import { TransactionRunnerPort } from '../../application/ports/outbound/transaction-runner.port';
import { DataSource } from 'typeorm';
import { TypeOrmTransactionContext } from './typeorm-transaction-context';

@Injectable()
export class TypeOrmTransactionRunner implements TransactionRunnerPort {
  constructor(
    private readonly dataSource: DataSource,
    private readonly context: TypeOrmTransactionContext,
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    const activeManager = this.context.getManager();

    if (activeManager) {
      return work();
    }

    return this.dataSource.transaction((manager) =>
      this.context.run(manager, work),
    );
  }
}
