-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NEW', 'REVIEWED', 'RESPONDED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "contact_form_submissions" (
    "submission_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "company_name" VARCHAR(255),
    "phone_number" VARCHAR(50),
    "subject" VARCHAR(500) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_form_submissions_pkey" PRIMARY KEY ("submission_id")
);

-- CreateIndex
CREATE INDEX "idx_contact_submissions_created_at" ON "contact_form_submissions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_contact_submissions_status" ON "contact_form_submissions"("status");

-- CreateIndex
CREATE INDEX "idx_contact_submissions_email" ON "contact_form_submissions"("email");
