import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserTimestampsToBigint1759315832177 implements MigrationInterface {
    name = 'UpdateUserTimestampsToBigint1759315832177'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "last_login_at"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "last_login_at" bigint`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "status" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "created_at" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "updated_at" bigint NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "updated_at" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "created_at" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "status" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "last_login_at"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "last_login_at" integer`);
    }

}
