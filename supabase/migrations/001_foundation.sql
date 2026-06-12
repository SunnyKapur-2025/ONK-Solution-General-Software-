-- Multi-tenant foundation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  pan TEXT,
  gstin TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'accountant', -- owner, accountant, staff
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Brokers master list
CREATE TABLE brokers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL UNIQUE,
  password_hint TEXT DEFAULT 'PAN Number of the account holder',
  pan TEXT,
  gstin TEXT,
  sac_code TEXT DEFAULT '997152',
  parser_key TEXT NOT NULL UNIQUE -- e.g. 'aditya-birla', 'angel-one', 'zerodha'
);

-- Seed brokers
INSERT INTO brokers (name, short_name, password_hint, parser_key) VALUES
  ('Aditya Birla Money Limited', 'Aditya Birla', 'PAN Number (e.g. ABCDE1234F)', 'aditya-birla'),
  ('Angel One Limited', 'Angel One', 'PAN Number (e.g. ABCDE1234F)', 'angel-one'),
  ('Yes Securities (India) Limited', 'Yes Securities', 'PAN Number (e.g. ABCDE1234F)', 'yes-securities'),
  ('Kotak Securities Limited', 'Kotak Securities', 'PAN Number (e.g. ABCDE1234F)', 'kotak'),
  ('Zerodha Broking Limited', 'Zerodha', 'PAN Number (e.g. ABCDE1234F)', 'zerodha'),
  ('ICICI Securities Limited', 'ICICI Direct', 'PAN Number (e.g. ABCDE1234F)', 'icici'),
  ('HDFC Securities Limited', 'HDFC Securities', 'PAN Number (e.g. ABCDE1234F)', 'hdfc'),
  ('Motilal Oswal Financial Services', 'Motilal Oswal', 'PAN Number (e.g. ABCDE1234F)', 'motilal-oswal'),
  ('Sharekhan Limited', 'Sharekhan', 'PAN Number (e.g. ABCDE1234F)', 'sharekhan'),
  ('5Paisa Capital Limited', '5Paisa', 'PAN Number (e.g. ABCDE1234F)', '5paisa');
