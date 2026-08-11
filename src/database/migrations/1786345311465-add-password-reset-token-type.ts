import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetTokenType1786345311465 implements MigrationInterface {
  name = 'AddPasswordResetTokenType1786345311465';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."account_tokens_type_enum" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."account_tokens_type_enum_old" AS ENUM('EMAIL_VERIFICATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_tokens" ALTER COLUMN "type" TYPE "public"."account_tokens_type_enum_old" USING "type"::text::"public"."account_tokens_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."account_tokens_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."account_tokens_type_enum_old" RENAME TO "account_tokens_type_enum"`,
    );
  }
}
