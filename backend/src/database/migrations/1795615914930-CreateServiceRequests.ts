import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateServiceRequests1795615914930 implements MigrationInterface {
    name = 'CreateServiceRequests1795615914930'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."service_requests_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TYPE "public"."service_requests_status_enum" AS ENUM('new', 'reviewed', 'assigned', 'in_progress', 'pending_review', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "service_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(20) NOT NULL, "customerId" uuid NOT NULL, "serviceTypeId" uuid NOT NULL, "title" character varying(150) NOT NULL, "description" text NOT NULL, "address" character varying(255) NOT NULL, "contactPhone" character varying(20) NOT NULL, "priority" "public"."service_requests_priority_enum" NOT NULL DEFAULT 'medium', "status" "public"."service_requests_status_enum" NOT NULL DEFAULT 'new', "preferredDate" TIMESTAMP, "reviewedById" uuid, "reviewedAt" TIMESTAMP, "cancelReason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f62f13f9d08763478a5503c2594" UNIQUE ("code"), CONSTRAINT "PK_ee60bcd826b7e130bfbd97daf66" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_78032d9e91852fe794e05f15f6" ON "service_requests"  ("priority") `);
        await queryRunner.query(`CREATE INDEX "IDX_bd124baf2a2f9695bb8e0d1a5c" ON "service_requests"  ("customerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_87ad2a5e91d6054282253f81c7" ON "service_requests"  ("status", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "service_requests" ADD CONSTRAINT "FK_bd124baf2a2f9695bb8e0d1a5c6" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_requests" ADD CONSTRAINT "FK_784b685bb6c518c4dce1a31a9a6" FOREIGN KEY ("serviceTypeId") REFERENCES "service_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_requests" ADD CONSTRAINT "FK_14a5b00e91cea0047ffa127c2be" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_requests" DROP CONSTRAINT "FK_14a5b00e91cea0047ffa127c2be"`);
        await queryRunner.query(`ALTER TABLE "service_requests" DROP CONSTRAINT "FK_784b685bb6c518c4dce1a31a9a6"`);
        await queryRunner.query(`ALTER TABLE "service_requests" DROP CONSTRAINT "FK_bd124baf2a2f9695bb8e0d1a5c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_87ad2a5e91d6054282253f81c7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bd124baf2a2f9695bb8e0d1a5c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_78032d9e91852fe794e05f15f6"`);
        await queryRunner.query(`DROP TABLE "service_requests"`);
        await queryRunner.query(`DROP TYPE "public"."service_requests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."service_requests_priority_enum"`);
    }

}
