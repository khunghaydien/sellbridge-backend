import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserTable1759314275522 implements MigrationInterface {
    name = 'CreateUserTable1759314275522'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(60) NOT NULL, "password" text NOT NULL, "username" character varying(255) NOT NULL, "phone" character varying(255), "last_login_at" integer, "status" character varying NOT NULL DEFAULT 'active', "role" character varying NOT NULL DEFAULT 'shop_owner', "created_at" integer NOT NULL, "updated_at" integer NOT NULL, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_8e1f623798118e629b46a9e6299" UNIQUE ("phone"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")); COMMENT ON COLUMN "user"."status" IS 'active, inactive'; COMMENT ON COLUMN "user"."role" IS 'shop_owner, admin, user'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
