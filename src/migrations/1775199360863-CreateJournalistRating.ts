import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateJournalistRating1775199360863 implements MigrationInterface {
    name = 'CreateJournalistRating1775199360863'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`useradvance\` DROP FOREIGN KEY \`useradvance_ibfk_1\``);
        await queryRunner.query(`ALTER TABLE \`news\` DROP FOREIGN KEY \`fk_news_user\``);
        await queryRunner.query(`ALTER TABLE \`comment\` DROP FOREIGN KEY \`comment_ibfk_1\``);
        await queryRunner.query(`ALTER TABLE \`comment\` DROP FOREIGN KEY \`comment_ibfk_2\``);
        await queryRunner.query(`ALTER TABLE \`comment\` DROP FOREIGN KEY \`comment_ibfk_3\``);
        await queryRunner.query(`DROP INDEX \`IDX_NEWS_TITLE_CONTENT\` ON \`news\``);
        await queryRunner.query(`DROP INDEX \`email\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`newsId\` ON \`comment\``);
        await queryRunner.query(`DROP INDEX \`parentCommentId\` ON \`comment\``);
        await queryRunner.query(`DROP INDEX \`userId\` ON \`comment\``);
        await queryRunner.query(`CREATE TABLE \`journalist_rating\` (\`ratingId\` int NOT NULL AUTO_INCREMENT, \`journalistId\` int NOT NULL, \`ratedById\` int NOT NULL, \`rating\` int NOT NULL, \`comment\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_e91364e34f41efb0e29d611ccf\` (\`ratedById\`, \`journalistId\`), PRIMARY KEY (\`ratingId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`news\` DROP COLUMN \`author\``);
        await queryRunner.query(`ALTER TABLE \`useradvance\` DROP COLUMN \`avatar\``);
        await queryRunner.query(`ALTER TABLE \`useradvance\` ADD \`avatar\` varchar(256) NULL`);
        await queryRunner.query(`ALTER TABLE \`useradvance\` DROP COLUMN \`fullName\``);
        await queryRunner.query(`ALTER TABLE \`useradvance\` ADD \`fullName\` varchar(128) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`useradvance\` DROP COLUMN \`phone\``);
        await queryRunner.query(`ALTER TABLE \`useradvance\` ADD \`phone\` varchar(30) NULL`);
        await queryRunner.query(`ALTER TABLE \`useradvance\` DROP COLUMN \`address\``);
        await queryRunner.query(`ALTER TABLE \`useradvance\` ADD \`address\` varchar(256) NULL`);
        await queryRunner.query(`ALTER TABLE \`news\` CHANGE \`status\` \`status\` enum ('Nháp', 'Xuất bản', 'Xóa') NOT NULL DEFAULT 'Nháp'`);
        await queryRunner.query(`ALTER TABLE \`news\` CHANGE \`viewCount\` \`viewCount\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`news\` CHANGE \`created_at\` \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`news\` CHANGE \`updated_at\` \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`news\` CHANGE \`userId\` \`userId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`email\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`email\` varchar(32) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`password\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`password\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`name\` varchar(128) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`role\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`role\` varchar(255) NOT NULL DEFAULT 'User'`);
        await queryRunner.query(`ALTER TABLE \`comment\` CHANGE \`isHidden\` \`isHidden\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`comment\` CHANGE \`created_at\` \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`comment\` CHANGE \`updated_at\` \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`CREATE FULLTEXT INDEX \`IDX_cf0b8b654854e7237aa55bc96b\` ON \`news\` (\`title\`, \`content\`)`);
        await queryRunner.query(`ALTER TABLE \`useradvance\` ADD CONSTRAINT \`FK_3ae423126403334b4599fa30c01\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`userId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`news\` ADD CONSTRAINT \`FK_9198b86c4c22bf6852c43f3b44e\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`userId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`journalist_rating\` ADD CONSTRAINT \`FK_42e28efc0483db8b22070302905\` FOREIGN KEY (\`journalistId\`) REFERENCES \`user\`(\`userId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`journalist_rating\` ADD CONSTRAINT \`FK_b9627cf1aafacf58aeb5d434955\` FOREIGN KEY (\`ratedById\`) REFERENCES \`user\`(\`userId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`comment\` ADD CONSTRAINT \`FK_725c4f36102e5e9599cfb2ce580\` FOREIGN KEY (\`newsId\`) REFERENCES \`news\`(\`newsId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`comment\` ADD CONSTRAINT \`FK_c0354a9a009d3bb45a08655ce3b\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`userId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`comment\` ADD CONSTRAINT \`FK_73aac6035a70c5f0313c939f237\` FOREIGN KEY (\`parentCommentId\`) REFERENCES \`comment\`(\`commentId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`comment\` DROP FOREIGN KEY \`FK_73aac6035a70c5f0313c939f237\``);
        await queryRunner.query(`ALTER TABLE \`comment\` DROP FOREIGN KEY \`FK_c0354a9a009d3bb45a08655ce3b\``);
        await queryRunner.query(`ALTER TABLE \`comment\` DROP FOREIGN KEY \`FK_725c4f36102e5e9599cfb2ce580\``);
        await queryRunner.query(`ALTER TABLE \`journalist_rating\` DROP FOREIGN KEY \`FK_b9627cf1aafacf58aeb5d434955\``);
        await queryRunner.query(`ALTER TABLE \`journalist_rating\` DROP FOREIGN KEY \`FK_42e28efc0483db8b22070302905\``);
        await queryRunner.query(`ALTER TABLE \`news\` DROP FOREIGN KEY \`FK_9198b86c4c22bf6852c43f3b44e\``);
        await queryRunner.query(`ALTER TABLE \`useradvance\` DROP FOREIGN KEY \`FK_3ae423126403334b4599fa30c01\``);
        await queryRunner.query(`DROP INDEX \`IDX_cf0b8b654854e7237aa55bc96b\` ON \`news\``);
        await queryRunner.query(`ALTER TABLE \`comment\` CHANGE \`updated_at\` \`updated_at\` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`comment\` CHANGE \`created_at\` \`created_at\` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`comment\` CHANGE \`isHidden\` \`isHidden\` tinyint NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`role\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`role\` enum CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" ('User', 'Admin', 'Moderator') NOT NULL DEFAULT 'User'`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`name\` varchar(100) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`password\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`password\` varchar(100) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`email\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`email\` varchar(50) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`news\` CHANGE \`userId\` \`userId\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`news\` CHANGE \`updated_at\` \`updated_at\` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`news\` CHANGE \`created_at\` \`created_at\` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`news\` CHANGE \`viewCount\` \`viewCount\` int NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`news\` CHANGE \`status\` \`status\` enum CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" ('Nháp', 'Xuất bản', 'Xóa') NULL DEFAULT 'Nháp'`);
        await queryRunner.query(`ALTER TABLE \`useradvance\` DROP COLUMN \`address\``);
        await queryRunner.query(`ALTER TABLE \`useradvance\` ADD \`address\` varchar(255) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`useradvance\` DROP COLUMN \`phone\``);
        await queryRunner.query(`ALTER TABLE \`useradvance\` ADD \`phone\` varchar(15) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`useradvance\` DROP COLUMN \`fullName\``);
        await queryRunner.query(`ALTER TABLE \`useradvance\` ADD \`fullName\` varchar(100) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`useradvance\` DROP COLUMN \`avatar\``);
        await queryRunner.query(`ALTER TABLE \`useradvance\` ADD \`avatar\` varchar(255) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`news\` ADD \`author\` varchar(125) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_e91364e34f41efb0e29d611ccf\` ON \`journalist_rating\``);
        await queryRunner.query(`DROP TABLE \`journalist_rating\``);
        await queryRunner.query(`CREATE INDEX \`userId\` ON \`comment\` (\`userId\`)`);
        await queryRunner.query(`CREATE INDEX \`parentCommentId\` ON \`comment\` (\`parentCommentId\`)`);
        await queryRunner.query(`CREATE INDEX \`newsId\` ON \`comment\` (\`newsId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`email\` ON \`user\` (\`email\`)`);
        await queryRunner.query(`CREATE FULLTEXT INDEX \`IDX_NEWS_TITLE_CONTENT\` ON \`news\` (\`title\`, \`content\`)`);
        await queryRunner.query(`ALTER TABLE \`comment\` ADD CONSTRAINT \`comment_ibfk_3\` FOREIGN KEY (\`parentCommentId\`) REFERENCES \`comment\`(\`commentId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`comment\` ADD CONSTRAINT \`comment_ibfk_2\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`userId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`comment\` ADD CONSTRAINT \`comment_ibfk_1\` FOREIGN KEY (\`newsId\`) REFERENCES \`news\`(\`newsId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`news\` ADD CONSTRAINT \`fk_news_user\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`userId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`useradvance\` ADD CONSTRAINT \`useradvance_ibfk_1\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`userId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
