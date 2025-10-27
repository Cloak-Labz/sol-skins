-- Sol Skins Buyback System Database Initialization
-- This script adds ONLY the new buyback tables and columns
-- It does NOT modify or recreate existing tables/data

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS buyback_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID,
    user_wallet VARCHAR(88) NOT NULL,
    nft_mint VARCHAR(88) NOT NULL,
    amount_paid NUMERIC(18, 9) NOT NULL,
    tx_signature VARCHAR(88) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT buyback_records_nft_mint_unique UNIQUE (nft_mint)
);

CREATE INDEX IF NOT EXISTS idx_buyback_records_user_wallet ON buyback_records (user_wallet);

CREATE INDEX IF NOT EXISTS idx_buyback_records_nft_mint ON buyback_records (nft_mint);

CREATE INDEX IF NOT EXISTS idx_buyback_records_tx_signature ON buyback_records (tx_signature);

CREATE INDEX IF NOT EXISTS idx_buyback_records_created_at ON buyback_records (created_at DESC);

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_skins') THEN
        ALTER TABLE user_skins ADD COLUMN IF NOT EXISTS buyback_tx_signature VARCHAR(88);

CREATE INDEX IF NOT EXISTS idx_user_skins_buyback_tx ON user_skins (buyback_tx_signature)
WHERE
    buyback_tx_signature IS NOT NULL;

END IF;

END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'boxes') THEN
        ALTER TABLE boxes ADD COLUMN IF NOT EXISTS hidden_settings_uri TEXT;

END IF;

END $$;