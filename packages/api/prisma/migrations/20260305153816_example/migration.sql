-- CreateTable
CREATE TABLE "examples" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "field1" BOOLEAN NOT NULL DEFAULT false,
    "field2" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "examples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "examples_date_key" ON "examples"("date");
