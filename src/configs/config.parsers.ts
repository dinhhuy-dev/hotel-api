// src/config/config.parsers.ts

export function toNumber(value: string | undefined): number {
  return Number(value);
}

export function toBoolean(value: string | undefined): boolean {
  return value === 'true';
}

export function toStringList(value: string | undefined): string[] {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function toOptionalString(
  value: string | undefined,
): string | undefined {
  return value?.trim() || undefined;
}
