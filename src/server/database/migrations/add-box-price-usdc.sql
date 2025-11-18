-- Add boxPriceUsdc column to case_openings table
ALTER TABLE "case_openings" 
ADD COLUMN IF NOT EXISTS "boxPriceUsdc" DECIMAL(10, 2) NULL;

