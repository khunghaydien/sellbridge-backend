import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFacebookTokenToUser1759320000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'facebook_access_token',
        type: 'text',
        isNullable: true,
        comment: 'Encrypted Facebook access token for API calls',
      }),
    );

    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'facebook_token_expires_at',
        type: 'bigint',
        isNullable: true,
        comment: 'Facebook access token expiration timestamp',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'facebook_token_expires_at');
    await queryRunner.dropColumn('user', 'facebook_access_token');
  }
}

