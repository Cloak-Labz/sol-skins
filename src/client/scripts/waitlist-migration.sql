-- Migration SQL para criar a tabela waitlist_interest
-- Execute este SQL no seu banco de dados PostgreSQL

CREATE TABLE IF NOT EXISTS waitlist_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(44) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  signature TEXT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS IDX_waitlist_interest_wallet ON waitlist_interest(wallet_address);
CREATE INDEX IF NOT EXISTS IDX_waitlist_interest_email ON waitlist_interest(email);

-- Verificar se a tabela foi criada
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'waitlist_interest'
ORDER BY ordinal_position;

