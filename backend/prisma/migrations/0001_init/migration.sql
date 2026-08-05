-- CreateTable
CREATE TABLE "investment_records" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "marketState" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investment_records_date_idx" ON "investment_records"("date");
