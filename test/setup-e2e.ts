import { config } from 'dotenv';

config({ quiet: true });

const databaseName = process.env['DB_DATABASE']?.trim();

if (!databaseName || !/(^|[_-])test$/i.test(databaseName)) {
  throw new Error(
    'E2E tests require DB_DATABASE to identify a dedicated database whose name ends with _test or -test.',
  );
}

process.env['NODE_ENV'] = 'test';
