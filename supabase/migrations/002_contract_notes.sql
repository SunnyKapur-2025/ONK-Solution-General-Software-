-- Contract notes uploaded by user
CREATE TABLE contract_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  broker_id UUID REFERENCES brokers(id),
  broker_name TEXT NOT NULL,
  contract_note_no TEXT NOT NULL,
  gst_invoice_no TEXT,
  trade_date DATE NOT NULL,
  client_name TEXT,
  client_pan TEXT,
  client_gstin TEXT,
  client_code TEXT,
  raw_text TEXT,
  parsed_data JSONB,
  parse_status TEXT DEFAULT 'pending', -- pending, success, failed, manual
  parse_error TEXT,
  tally_export_status TEXT DEFAULT 'pending', -- pending, exported, synced
  tally_exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, broker_id, contract_note_no, trade_date)
);

-- Individual trades extracted from contract notes
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_note_id UUID REFERENCES contract_notes(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,
  exchange TEXT NOT NULL,         -- NSE, BSE, MCX, NCDX
  segment TEXT NOT NULL,          -- CM (cash), FO (futures/options), CDS (currency)
  product_type TEXT NOT NULL,     -- DELIVERY, INTRADAY, MTF, FUTURES, OPTIONS
  instrument_type TEXT NOT NULL,  -- EQ, FUT, CE, PE, CURRENCY
  security_name TEXT NOT NULL,
  symbol TEXT,
  isin TEXT,
  expiry_date DATE,               -- for F&O
  strike_price NUMERIC,           -- for options
  option_type TEXT,               -- CE or PE
  trade_type TEXT NOT NULL,       -- BUY, SELL
  quantity NUMERIC NOT NULL,
  gross_rate NUMERIC NOT NULL,
  brokerage_per_unit NUMERIC DEFAULT 0,
  net_rate NUMERIC NOT NULL,
  gross_value NUMERIC GENERATED ALWAYS AS (quantity * gross_rate) STORED,
  net_value NUMERIC NOT NULL,     -- net total before levies (as per contract note)
  order_no TEXT,
  trade_no TEXT,
  trade_time TIME,
  settlement_date DATE,
  settlement_no TEXT,
  is_manual BOOLEAN DEFAULT false,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Charges per contract note (segment/product-wise)
CREATE TABLE contract_note_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_note_id UUID REFERENCES contract_notes(id) ON DELETE CASCADE,
  exchange TEXT,
  segment TEXT,
  product TEXT,
  gross_obligation NUMERIC DEFAULT 0,
  stt NUMERIC DEFAULT 0,
  exchange_transaction_charges NUMERIC DEFAULT 0,
  sebi_fees NUMERIC DEFAULT 0,
  stamp_duty NUMERIC DEFAULT 0,
  other_charges NUMERIC DEFAULT 0,
  brokerage NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  sgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  taxable_value NUMERIC DEFAULT 0,  -- brokerage amount on which GST computed
  net_obligation NUMERIC DEFAULT 0  -- final net payable/receivable
);

-- Journal entries generated from trades
CREATE TABLE stock_journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_note_id UUID REFERENCES contract_notes(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  entry_date DATE NOT NULL,
  voucher_type TEXT DEFAULT 'Journal',
  narration TEXT,
  is_validated BOOLEAN DEFAULT false,
  validation_errors JSONB DEFAULT '[]',
  tally_xml TEXT,                  -- cached Tally XML for this entry
  tally_sync_status TEXT DEFAULT 'pending',
  tally_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Journal entry lines (double-entry legs)
CREATE TABLE stock_journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES stock_journal_entries(id) ON DELETE CASCADE,
  ledger_name TEXT NOT NULL,       -- exact ledger name as in Tally
  ledger_group TEXT,               -- Tally group: "Stock-in-Trade", "Indirect Expenses", etc.
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  is_party BOOLEAN DEFAULT false,  -- broker ledger = party
  narration TEXT
);

-- Holdings computed from trades (materialized for performance)
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id),
  isin TEXT,
  symbol TEXT,
  security_name TEXT NOT NULL,
  exchange TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  avg_cost NUMERIC NOT NULL DEFAULT 0,   -- FIFO weighted average
  total_cost NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, isin, exchange)
);

-- Realized P&L per trade (computed on each sell)
CREATE TABLE realized_pnl (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES trades(id),
  tenant_id UUID REFERENCES tenants(id),
  isin TEXT,
  symbol TEXT,
  security_name TEXT NOT NULL,
  trade_date DATE NOT NULL,
  broker_name TEXT,
  sell_quantity NUMERIC NOT NULL,
  sell_value NUMERIC NOT NULL,
  cost_of_acquisition NUMERIC NOT NULL,  -- FIFO cost
  gross_profit NUMERIC NOT NULL,         -- sell_value - cost
  charges NUMERIC DEFAULT 0,            -- brokerage + taxes on this sell
  net_profit NUMERIC NOT NULL,           -- gross_profit - charges
  holding_period_days INTEGER,
  gain_type TEXT,                        -- STCG, LTCG, SPECULATIVE, FO_BUSINESS
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_trades_tenant_date ON trades(tenant_id, trade_date);
CREATE INDEX idx_trades_isin ON trades(isin);
CREATE INDEX idx_trades_contract_note ON trades(contract_note_id);
CREATE INDEX idx_contract_notes_tenant ON contract_notes(tenant_id);
CREATE INDEX idx_holdings_tenant ON holdings(tenant_id);
CREATE INDEX idx_realized_pnl_tenant_date ON realized_pnl(tenant_id, trade_date);
