import { MigrationInterface, QueryRunner } from 'typeorm';

export class $npmConfigName1786345311464 implements MigrationInterface {
  name = ' $npmConfigName1786345311464';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."account_role_enum" AS ENUM('ADMINISTRATOR', 'HOTEL_MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING_STAFF', 'MAINTENANCE_STAFF', 'CUSTOMER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."account_status_enum" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "accounts" ("id" uuid NOT NULL, "email" character varying(320) NOT NULL, "password_hash" text NOT NULL, "role" "public"."account_role_enum" NOT NULL, "status" "public"."account_status_enum" NOT NULL, "email_verified_at" TIMESTAMP WITH TIME ZONE, "refresh_token_hash" character varying(128), "refresh_token_expires_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_accounts_refresh_token_hash" ON "accounts"  ("refresh_token_hash") WHERE "refresh_token_hash" IS NOT NULL`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_accounts_email" ON "accounts"  ("email") `);
    await queryRunner.query(
      `CREATE TYPE "public"."account_tokens_type_enum" AS ENUM('EMAIL_VERIFICATION')`,
    );
    await queryRunner.query(
      `CREATE TABLE "account_tokens" ("id" uuid NOT NULL, "type" "public"."account_tokens_type_enum" NOT NULL, "token_hash" character varying(128) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "account_id" uuid NOT NULL, CONSTRAINT "PK_5e3640c493cc6206a44b885e6a9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_account_tokens_token_hash" ON "account_tokens"  ("token_hash") `,
    );
    await queryRunner.query(
      `ALTER TABLE "account_tokens" ADD CONSTRAINT "FK_870787de4c0e110e30ba3df237b" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "account_tokens" DROP CONSTRAINT "FK_870787de4c0e110e30ba3df237b"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_account_tokens_token_hash"`);
    await queryRunner.query(`DROP TABLE "account_tokens"`);
    await queryRunner.query(`DROP TYPE "public"."account_tokens_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."uq_accounts_email"`);
    await queryRunner.query(`DROP INDEX "public"."uq_accounts_refresh_token_hash"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP TYPE "public"."account_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."account_role_enum"`);
  }
}
