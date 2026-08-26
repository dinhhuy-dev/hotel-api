import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoomCatalogEntities1787105999529 implements MigrationInterface {
  name = 'AddRoomCatalogEntities1787105999529';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "facilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" character varying(500), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2e6c685b2e1195e6d6394a22bc7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_facilities_name_lower" ON "facilities" (LOWER("name"))',
    );
    await queryRunner.query(
      `CREATE TABLE "room_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(20) NOT NULL, "name" character varying(100) NOT NULL, "description" character varying(1000), "max_occupancy" integer NOT NULL, "bed_configuration" character varying(200), "display_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ck_room_types_display_order" CHECK ("display_order" >= 0), CONSTRAINT "ck_room_types_max_occupancy" CHECK ("max_occupancy" BETWEEN 1 AND 20), CONSTRAINT "PK_b6e1d0a9b67d4b9fbff9c35ab69" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_room_types_code" ON "room_types"  ("code") `);
    await queryRunner.query(
      `CREATE TABLE "room_type_facilities" ("room_type_id" uuid NOT NULL, "facility_id" uuid NOT NULL, CONSTRAINT "PK_b7d118e8f8a12a3d4f503bb5ba9" PRIMARY KEY ("room_type_id", "facility_id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."operational_status_enum" AS ENUM('READY', 'DIRTY', 'CLEANING', 'OUT_OF_SERVICE', 'RETIRED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "room_number" character varying(20) NOT NULL, "floor" character varying(10) NOT NULL, "room_type_id" uuid NOT NULL, "operational_status" "public"."operational_status_enum" NOT NULL DEFAULT 'OUT_OF_SERVICE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_rooms_room_number" ON "rooms"  ("room_number") `,
    );
    await queryRunner.query(
      `ALTER TABLE "room_type_facilities" ADD CONSTRAINT "FK_b23e735cc52e8bac1d163f46e0e" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "room_type_facilities" ADD CONSTRAINT "FK_40ea518a83bb83bdff1bc8243e7" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ADD CONSTRAINT "FK_8a380bdc519b8701daf0ec62da0" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_8a380bdc519b8701daf0ec62da0"`);
    await queryRunner.query(
      `ALTER TABLE "room_type_facilities" DROP CONSTRAINT "FK_40ea518a83bb83bdff1bc8243e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "room_type_facilities" DROP CONSTRAINT "FK_b23e735cc52e8bac1d163f46e0e"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_rooms_room_number"`);
    await queryRunner.query(`DROP TABLE "rooms"`);
    await queryRunner.query(`DROP TYPE "public"."operational_status_enum"`);
    await queryRunner.query(`DROP TABLE "room_type_facilities"`);
    await queryRunner.query(`DROP INDEX "public"."uq_room_types_code"`);
    await queryRunner.query(`DROP TABLE "room_types"`);
    await queryRunner.query('DROP INDEX "public"."uq_facilities_name_lower"');
    await queryRunner.query(`DROP TABLE "facilities"`);
  }
}
