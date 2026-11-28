import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkOrder1795867128307 implements MigrationInterface {
    name = 'CreateWorkOrder1795867128307'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "work_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "serviceRequestId" uuid NOT NULL, "technicianId" uuid NOT NULL, "assignedById" uuid NOT NULL, "scheduledAt" TIMESTAMP, "startedAt" TIMESTAMP, "submittedAt" TIMESTAMP, "completedAt" TIMESTAMP, "summary" text, "approvedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_c9feb673c707f65faf4597d28a" UNIQUE ("serviceRequestId"), CONSTRAINT "PK_29f6c1884082ee6f535aed93660" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD CONSTRAINT "FK_c9feb673c707f65faf4597d28a0" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD CONSTRAINT "FK_95589f252d90ff307600981a4d0" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD CONSTRAINT "FK_0958aa0ea6f75154e59e7b2e273" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD CONSTRAINT "FK_f8d01593609ad56380ecd5fbfe2" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work_orders" DROP CONSTRAINT "FK_f8d01593609ad56380ecd5fbfe2"`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP CONSTRAINT "FK_0958aa0ea6f75154e59e7b2e273"`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP CONSTRAINT "FK_95589f252d90ff307600981a4d0"`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP CONSTRAINT "FK_c9feb673c707f65faf4597d28a0"`);
        await queryRunner.query(`DROP TABLE "work_orders"`);
    }

}
