export interface OpaqueTokenHasherPort {
  hash(token: string): string;
}
