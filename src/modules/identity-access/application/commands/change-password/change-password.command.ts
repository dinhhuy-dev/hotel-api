export class ChangePasswordCommand {
  constructor(
    public readonly accountId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {}
}
