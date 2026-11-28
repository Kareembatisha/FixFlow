import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStatusHistory1795865757842 implements MigrationInterface {
    name = 'CreateStatusHistory1795865757842'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."status_history_oldstatus_enum" AS ENUM('new', 'reviewed', 'assigned', 'in_progress', 'pending_review', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."status_history_newstatus_enum" AS ENUM('new', 'reviewed', 'assigned', 'in_progress', 'pending_review', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "status_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entityType" character varying(50) NOT NULL, "entityId" uuid NOT NULL, "oldStatus" "public"."status_history_oldstatus_enum", "newStatus" "public"."status_history_newstatus_enum" NOT NULL, "changedById" uuid NOT NULL, "reason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_271a5228edb4eeb41bc01d58fac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_813927bd540397fcabb9552033" ON "status_history"  ("entityType", "entityId") `);
        await queryRunner.query(`ALTER TABLE "status_history" ADD CONSTRAINT "FK_7de8bdfa74d2b54e3fe690ef8db" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "status_history" DROP CONSTRAINT "FK_7de8bdfa74d2b54e3fe690ef8db"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_813927bd540397fcabb9552033"`);
        await queryRunner.query(`DROP TABLE "status_history"`);
        await queryRunner.query(`DROP TYPE "public"."status_history_newstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."status_history_oldstatus_enum"`);
    }

}
