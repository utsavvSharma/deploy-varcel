-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "convertedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "monthly_sales_rankings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "totalSales" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_sales_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_sales_rankings_month_year_idx" ON "monthly_sales_rankings"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_sales_rankings_userId_month_year_key" ON "monthly_sales_rankings"("userId", "month", "year");
