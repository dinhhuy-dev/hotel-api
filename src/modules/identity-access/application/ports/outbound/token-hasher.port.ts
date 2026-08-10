export interface TokenHasherPort {
  hash(token: string): Promise<string>;

  compare(token: string, tokenHash: string): Promise<boolean>;
}
