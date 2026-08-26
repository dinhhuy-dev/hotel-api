import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingEntities1787491000000 implements MigrationInterface {
  name = 'AddBookingEntities1787491000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."reservation_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservation_payment_status_enum" AS ENUM('UNPAID', 'PAID', 'REFUNDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservation_cancellation_reason_enum" AS ENUM('CUSTOMER_REQUEST', 'STAFF_REQUEST', 'PAYMENT_TIMEOUT', 'NO_SHOW')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customer_id" uuid NOT NULL, "contact_name" character varying(100) NOT NULL, "contact_phone" character varying(16) NOT NULL, "check_in_date" date NOT NULL, "check_out_date" date NOT NULL, "guest_count" integer NOT NULL, "status" "public"."reservation_status_enum" NOT NULL DEFAULT 'PENDING', "total_amount" integer NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "payment_status" "public"."reservation_payment_status_enum" NOT NULL DEFAULT 'UNPAID', "charge_request_id" uuid, "charge_reference" character varying(100), "refund_request_id" uuid, "refund_reference" character varying(100), "idempotency_key" uuid NOT NULL, "cancellation_reason" "public"."reservation_cancellation_reason_enum", "checked_in_at" TIMESTAMP WITH TIME ZONE, "checked_out_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ck_reservations_valid_range" CHECK ("check_in_date" < "check_out_date"), CONSTRAINT "ck_reservations_positive_guest_count" CHECK ("guest_count" > 0), CONSTRAINT "ck_reservations_positive_total_amount" CHECK ("total_amount" > 0), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_reservations_idempotency_key" ON "reservations" ("idempotency_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reservations_customer_created" ON "reservations" ("customer_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reservations_status_stay_dates" ON "reservations" ("status", "check_in_date", "check_out_date")`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservation_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reservation_id" uuid NOT NULL, "room_type_id" uuid NOT NULL, "quantity" integer NOT NULL, "total_price" integer NOT NULL, CONSTRAINT "ck_reservation_items_quantity" CHECK ("quantity" BETWEEN 1 AND 5), CONSTRAINT "ck_reservation_items_positive_total_price" CHECK ("total_price" > 0), CONSTRAINT "PK_bfc06fb7312bf99dd93bbe73844" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_reservation_items_reservation_room_type" ON "reservation_items" ("reservation_id", "room_type_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "room_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reservation_item_id" uuid NOT NULL, "room_id" uuid NOT NULL, "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL, "released_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_e206074eb6d6150b06342013ed0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_room_assignments_active_room" ON "room_assignments" ("room_id") WHERE "released_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_items" ADD CONSTRAINT "FK_77fd31f8972b8cd9165c47443e7" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "room_assignments" ADD CONSTRAINT "FK_d214c45686a530777f74dc940fd" FOREIGN KEY ("reservation_item_id") REFERENCES "reservation_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room_assignments" DROP CONSTRAINT "FK_d214c45686a530777f74dc940fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_items" DROP CONSTRAINT "FK_77fd31f8972b8cd9165c47443e7"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_room_assignments_active_room"`);
    await queryRunner.query(`DROP TABLE "room_assignments"`);
    await queryRunner.query(`DROP INDEX "public"."uq_reservation_items_reservation_room_type"`);
    await queryRunner.query(`DROP TABLE "reservation_items"`);
    await queryRunner.query(`DROP INDEX "public"."idx_reservations_status_stay_dates"`);
    await queryRunner.query(`DROP INDEX "public"."idx_reservations_customer_created"`);
    await queryRunner.query(`DROP INDEX "public"."uq_reservations_idempotency_key"`);
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(`DROP TYPE "public"."reservation_cancellation_reason_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reservation_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reservation_status_enum"`);
  }
}
