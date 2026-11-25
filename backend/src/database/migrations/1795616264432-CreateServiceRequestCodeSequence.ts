import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServiceRequestCodeSequence1795616264432 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SEQUENCE public.service_request_code_seq
      START WITH 1
      INCREMENT BY 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP SEQUENCE IF EXISTS public.service_request_code_seq
    `);
  }
}
