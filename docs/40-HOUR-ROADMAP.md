# 40-Hour Build Roadmap
## ONK Solutions — Contract Notes & Tally Integration System
### Designed & Developed by Sunny Kapoor, ONK Solutions

---

## Phase 1 — Foundation & PDF Parser (Hours 1–8)
**Goal:** First contract note uploaded, text extracted, trades visible on screen

### Hour 1–2: Project Setup
- [ ] `npm install` — install all dependencies
- [ ] Create `.env.local` from `.env.example`
- [ ] Run `next dev` — confirm app starts on localhost:3000
- [ ] Set up Supabase project → run migrations 001 and 002
- [ ] Confirm database tables created

### Hour 3–4: PDF Upload Flow (Aditya Birla)
- [ ] Test upload page at `/contract-notes/upload`
- [ ] Upload Aditya Birla PDF without password → confirm PASSWORD_REQUIRED error
- [ ] Re-upload with PAN as password → confirm text extracted
- [ ] Check browser console / API response for parsed JSON

### Hour 5–6: Parser Validation
- [ ] Inspect `parsed.trades` array in API response
- [ ] Verify trade count matches contract note
- [ ] Verify security name, quantity, gross rate, brokerage per unit
- [ ] Fix any regex issues in `aditya-birla.ts` parser

### Hour 7–8: Charges Validation
- [ ] Verify STT, Exchange Charges, SEBI Fees, CGST, SGST extracted correctly
- [ ] Cross-check net obligation with contract note total
- [ ] Fix off-by-paisa rounding if any

**Milestone 1 checkpoint:** Upload Aditya Birla PDF → see correct trades + charges in JSON

---

## Phase 2 — Journal Entry Engine (Hours 9–16)
**Goal:** Correct double-entry journal entries generated, balanced, visible on screen

### Hour 9–10: Generate Journal Entries
- [ ] Call `/api/contract-notes/generate-journal` with parsed data
- [ ] View `entries` array in response
- [ ] Verify entry for each trade + one charges entry

### Hour 11–12: Equity Delivery SELL Verification
- [ ] Check Dr/Cr sides are correct (Broker Dr, Stock Cr, Capital Gain Cr)
- [ ] Verify `isBalanced: true` for each entry
- [ ] If no cost basis → verify warning message appears

### Hour 13–14: Holdings Seeding
- [ ] Add UI to seed existing holdings cost basis (for FIFO computation)
- [ ] Test SELL entry with seeded cost → verify capital gain computed correctly
- [ ] Test with both profit and loss scenarios

### Hour 15–16: Validation & Alerts
- [ ] All `validationErrors` shown in UI with red highlight
- [ ] Balanced entries shown in green
- [ ] Narration text verified to be correct and meaningful

**Milestone 2 checkpoint:** Sell 172 Tata Motors → journal entry balances, shows STCG or loss

---

## Phase 3 — Tally XML Export (Hours 17–22)
**Goal:** XML file downloaded, imported into TallyPrime successfully

### Hour 17–18: XML Generation
- [ ] Generate ledger masters XML → download and inspect
- [ ] Generate vouchers XML → download and inspect
- [ ] Verify XML structure: TALLYMESSAGE > VOUCHER > ALLLEDGERENTRIES.LIST

### Hour 19–20: Tally Import Test
- [ ] Open TallyPrime → create test company
- [ ] Import ledger masters XML first
- [ ] Import vouchers XML
- [ ] Verify journals appear in Tally day book
- [ ] Verify debit/credit sides match

### Hour 21–22: Fix Import Errors
- [ ] Address any LINEERROR messages from Tally
- [ ] Fix ledger group names to match Tally's standard groups
- [ ] Ensure broker ledger gets bill-by-bill allocation

**Milestone 3 checkpoint:** Import XML into Tally → no errors, journals visible in Day Book

---

## Phase 4 — Tally Live Sync (Hours 23–26)
**Goal:** One-click push from browser to running TallyPrime

### Hour 23–24: Enable Tally HTTP Server
- [ ] Enable Tally HTTP server on port 9000
- [ ] Click "Check Connection" on `/tally-sync` page → shows green
- [ ] Push ledger masters XML → verify in Tally

### Hour 25–26: Push Vouchers Live
- [ ] Push vouchers XML → verify in Tally Day Book
- [ ] Test error handling when Tally is closed → verify user-friendly error message
- [ ] Mark entries as synced in database

**Milestone 4 checkpoint:** Upload PDF → generate journals → push to Tally in 3 clicks

---

## Phase 5 — P&L & Holdings (Hours 27–32)
**Goal:** Accurate P&L report and holdings with filters

### Hour 27–28: Holdings Calculation
- [ ] On each BUY: update holdings table (FIFO lot added)
- [ ] On each SELL: reduce holdings via FIFO, compute realized P&L
- [ ] Display holdings at `/holdings` with quantity, avg cost

### Hour 29–30: P&L Report
- [ ] Display at `/pnl` with FY filter and broker filter
- [ ] Show STCG, LTCG, Speculative, F&O separately
- [ ] Show total charges (brokerage + STT + GST)

### Hour 31–32: Filters & Export
- [ ] Date range filter on P&L
- [ ] Broker-wise filter
- [ ] Export P&L as CSV

**Milestone 5 checkpoint:** P&L shows correct numbers matching manual calculation

---

## Phase 6 — Additional Brokers (Hours 33–38)
**Goal:** At least 2 more brokers fully parsing

### Hour 33–34: Angel One Parser
- [ ] Receive Angel One sample PDF
- [ ] Study format, write `angel-one.ts` parser
- [ ] Test with sample

### Hour 35–36: Second Broker (Yes Securities / Zerodha / Kotak)
- [ ] Repeat for next broker

### Hour 37–38: Manual Entry Form
- [ ] Build manual entry form for non-accountants
- [ ] Fields: Broker, Date, Exchange, Security, B/S, Qty, Rate, Brokerage, STT, etc.
- [ ] Generates same journal entry as PDF parser
- [ ] Validation on all fields

**Milestone 6 checkpoint:** 3+ brokers parsed, manual entry works for non-accountants

---

## Phase 7 — Polish & Deploy (Hours 39–40)
**Goal:** Deployable, tested, production-ready

### Hour 39: Testing
- [ ] Test all happy paths end-to-end
- [ ] Test wrong password → correct error shown
- [ ] Test unbalanced entry → alert shown
- [ ] Test Tally offline → user-friendly error

### Hour 40: Deploy
- [ ] `npm run build` — no TypeScript errors
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Set environment variables in Vercel dashboard
- [ ] Final smoke test on production URL

---

## Success Criteria (Must all be green before launch)
- [ ] Upload any Aditya Birla contract note → correct trades extracted
- [ ] Journal entries balance (Dr = Cr) for every entry
- [ ] Import XML to Tally → no errors, journals visible
- [ ] Live push to Tally works when TallyPrime is running
- [ ] P&L numbers match manual calculation
- [ ] Wrong PDF password shows clear error with hint
- [ ] All pages load without errors

---

## Known Limitations at Launch (v1.0)
- Only Aditya Birla parser is fully implemented. Others need sample PDFs.
- LTCG holding period (1 year) is assumed; actual purchase date must be in holdings.
- F&O settlement P&L requires Mark-to-Market entries (future phase).
- Tally live sync requires TallyPrime on same local network as the server.
