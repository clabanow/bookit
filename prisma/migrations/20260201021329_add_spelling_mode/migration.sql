-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'SPELLING');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "answer" TEXT,
ADD COLUMN     "hint" TEXT,
ADD COLUMN     "questionType" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE';
