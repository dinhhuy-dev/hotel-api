export interface TransactionRunnerPort {
  run<T>(work: () => Promise<T>): Promise<T>;
}
