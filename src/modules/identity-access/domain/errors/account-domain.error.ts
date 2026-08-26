export abstract class AccountDomainError extends Error {
  protected constructor(message: string) {
    super(message);

    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
