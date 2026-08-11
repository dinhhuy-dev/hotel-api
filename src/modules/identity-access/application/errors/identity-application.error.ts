export class IdentityApplicationError extends Error {
  constructor(message: string) {
    super(message);

    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class EmailAlreadyRegisteredError extends IdentityApplicationError {
  constructor() {
    super('Email address is already registered');
  }
}

export class InvalidCredentialsError extends IdentityApplicationError {
  constructor() {
    super('Email or password is not match.');
  }
}

export class InvalidRefreshTokenError extends IdentityApplicationError {
  constructor() {
    super('Refresh token is invalid or expired');
  }
}
