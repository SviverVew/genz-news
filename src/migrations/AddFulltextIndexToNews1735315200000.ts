import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFulltextIndexToNews1735315200000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`news\` ADD FULLTEXT INDEX \`IDX_NEWS_TITLE_CONTENT\` (\`title\`, \`content\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`news\` DROP INDEX \`IDX_NEWS_TITLE_CONTENT\``);
    }

}