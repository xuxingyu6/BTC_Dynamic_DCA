-- 投资记录升级：支持加速买入（Acceleration Buy）
ALTER TABLE "investment_records" ADD COLUMN "transactionType" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "investment_records" ADD COLUMN "riskLevel" INTEGER;
ALTER TABLE "investment_records" ADD COLUMN "triggeredIndicators" INTEGER;
ALTER TABLE "investment_records" ADD COLUMN "remainingReserve" DOUBLE PRECISION;
