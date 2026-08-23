import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoomRates1787490222419 implements MigrationInterface {
  name = 'AddRoomRates1787490222419';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);
    await queryRunner.query(
      `CREATE TABLE "room_rates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "room_type_id" uuid NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "price_per_night" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ck_room_rates_positive_price" CHECK ("price_per_night" > 0), CONSTRAINT "ck_room_rates_valid_range" CHECK ("start_date" < "end_date"), CONSTRAINT "ex_room_rates_no_overlap" EXCLUDE USING gist ("room_type_id" WITH =, daterange("start_date", "end_date", '[)') WITH &&), CONSTRAINT "PK_ba68cbdf564e4f344a05b3f214a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_room_rates_room_type_dates" ON "room_rates"  ("room_type_id", "start_date", "end_date") `,
    );
    await queryRunner.query(
      `ALTER TABLE "room_rates" ADD CONSTRAINT "FK_c3f378c66f5099e51ca2bbf958e" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room_rates" DROP CONSTRAINT "FK_c3f378c66f5099e51ca2bbf958e"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_room_rates_room_type_dates"`);
    await queryRunner.query(`DROP TABLE "room_rates"`);
  }
}
