# ONK Solutions — Product Concept Document

**Next-generation Indian accounting & business management SaaS for the service industry**

*Written from the perspective of someone who has run sales vouchers in Tally at 2 AM during year-end, reconciled GSTR-2B in Busy, and chased debtors through Zoho's reminder engine — daily, for five years.*

---

## 0. Thesis

Tally is the fastest data-entry engine ever built for Indian accounting and the worst-looking. Zoho is the most beautiful cloud accounting product in India and the slowest to key in 200 vouchers a day. Busy sits in between and is loved by traders nobody else serves well. **No one has built the product that is simultaneously as fast as Tally, as beautiful as Zoho, as practical as Busy — and genuinely India-first with industry pipelines that none of them ship.**

ONK Solutions is that product. It is opinionated on one point above all: **an accountant must be able to enter a voucher without ever touching the mouse, while the business owner must understand the dashboard without ever learning what a "voucher" is.** Both truths must hold at once, in the same product, on the same data.

---

## 1. Core UX Philosophy

### Dual-mode by design, not by toggle-bolt-on

Every ONK workspace runs in one of two modes, switchable per-user (not per-company) with a single shortcut `Ctrl+M` or a header pill:

**Simple Mode (default for owners, managers, operators)**
- Zoho-style guided forms. Big tappable category tiles: *New Sale*, *Record Expense*, *Money Received*, *Pay a Bill*.
- No accounting jargon. "Money Received" not "Receipt Voucher". "Owe to you" not "Sundry Debtors". The double-entry happens invisibly underneath — the system picks the contra accounts.
- Inline help, validation, and "what this means" tooltips.
- Mouse-first, mobile-friendly, forgiving.

**Power Mode (default for accountants, CAs, data-entry staff)**
- Tally-style keyboard-first. A blinking entry line, not a form. Tab/Enter to advance, no mouse needed end to end.
- The classic voucher mental model is fully intact: **Payment (F5), Receipt (F6), Contra (F4), Sales (F8), Purchase (F9), Journal (F7)**. Muscle memory from Tally transfers directly — we deliberately kept the same function-key map.
- Auto-complete ledger names as you type (`ABC` → "ABC Traders Pvt Ltd"), create-on-the-fly with `Alt+C`.
- No confirmation dialogs that break flow; everything is undoable from the Day Book instead.

**The same voucher** created in Power Mode is viewable and editable in Simple Mode and vice-versa — because there is exactly one underlying data model (a voucher with debit/credit lines). The mode is purely a *rendering and input* layer. This is the single most important architectural decision in the product: **one ledger, two faces.**

### Principles enforced in the UI
- Keyboard parity: every action reachable in Simple Mode by mouse has a Power Mode shortcut.
- No dead ends: every number is a link, every screen has a "back to source" path.
- Speed is a feature: target < 8 seconds to post a typical sales voucher in Power Mode, < 30 seconds guided in Simple Mode.

---

## 2. The Entry Experience

### 2.1 Sales — Fast Path (Power Mode)

Goal: post a credit sale to an existing party. Keystrokes:

1. `F8` → Sales voucher opens, cursor on Party field.
2. Type `abc` → autocomplete picks "ABC Traders". `Enter`.
3. Type item or ledger `consulting` → `Enter`. Type amount `50000` → `Enter`.
4. GST auto-applies from the party's state vs. company state (CGST+SGST intra, IGST inter — computed, not typed).
5. `Ctrl+A` to accept.

That is effectively **3 meaningful keystrokes of decision** (party, ledger, amount); everything else is defaulted and inferred. Tax, rounding, narration template, and contra (Debtors) are automatic.

### 2.2 Sales — Guided Path (Simple Mode)

1. Tile: **New Sale**.
2. Dropdown: *Who did you sell to?* (with "+ Add new customer" inline).
3. *What did you sell?* — pick from item/service list or type free text; rate auto-fills from the rate master.
4. *Amount* — GST preview shows live ("₹50,000 + ₹9,000 GST = ₹59,000").
5. Optional: attach the customer's PO PDF (drag-drop), set due date, mark recurring.
6. **Save & Send** — posts the voucher *and* emails/WhatsApps the invoice in one click.

### 2.3 Purchase
- Power: `F9`, party, expense/stock ledger, amount, GST inferred, `Ctrl+A`.
- Guided: **Pay a Bill / Record Purchase** → vendor → category → amount → **attach the supplier bill PDF (mandatory prompt, because GST requires it)** → save. Attachment lands in the Document Vault linked to the voucher.

### 2.4 Expense (quick, non-inventory)
- Guided tile **Record Expense**: category tiles (Rent, Fuel, Salary, Internet, Travel…), amount, paid-from (Cash/Bank/UPI), attach receipt photo from phone camera. Posts a Payment voucher under the hood.

### 2.5 Receipt (money in)
- Power: `F6`, party, amount, bank/cash ledger, `Ctrl+A`. Optionally bill-by-bill allocation against open invoices (`Alt+L` opens the outstanding list, tick the bills).
- Guided: **Money Received** → from whom → how much → into which account → "against which invoices?" shows open bills with checkboxes.

The bill-by-bill allocation is first-class everywhere — this is what makes the Party Ledger and aging accurate, and it is where Zoho's receipt UX is weakest.

---

## 3. The Dashboard

What the owner sees in 10 seconds, zero clicks, on login (Simple Mode landing):

**Top row — KPI cards (live, drill-able):**
1. **Cash & Bank Position** — total liquid balance across all accounts, with today's delta.
2. **Receivables** — total outstanding *to* you, with the overdue portion in red ("₹4.2L, ₹1.1L overdue").
3. **Payables** — total you owe, with due-this-week highlighted.
4. **This Month Sales vs Last Month** — number + up/down arrow + %.
5. **GST Liability (current period)** — net payable estimate so far this month.
6. **TDS to Deposit** — accumulated, with the 7th-of-month deadline countdown.

**Charts:**
- **Cash flow line** — inflow vs outflow, last 6 months.
- **Sales bar** — monthly, last 12 months, with a dotted target line.
- **Receivables aging donut** — 0–30 / 31–60 / 61–90 / 90+ buckets, each clickable into the party list for that bucket.
- **Top 5 debtors** horizontal bars (who owes you most).

**Widgets:**
- **Action queue** — "3 vouchers awaiting your approval", "5 recurring entries to confirm", "2 GST mismatches".
- **Upcoming** — recurring bills/EMIs due in next 7 days, statutory deadlines (GSTR-1, 3B, TDS, PF, ESI) as a calendar strip.
- **Recent activity** — last 10 vouchers (the Day Book in miniature).

Every card and every chart segment is a drill-down entry point (see §4). The dashboard is not a passive report — it is the front door to the data.

---

## 4. Drill-Down Reports

**Core promise inherited from Tally and extended: every number on every screen is clickable down to the editable voucher.** No report number is a dead end.

The canonical chain:

```
Balance Sheet
  → click "Sundry Debtors ₹4,20,000"
    → Group summary (list of debtor ledgers with balances)
      → click "ABC Traders ₹85,000"
        → Party Ledger (full chronological history: every sale, receipt, note)
          → click any line, e.g. "Sales 12-May ₹59,000"
            → the actual Sales Voucher, rendered
              → Edit (Power or Simple) → re-post → balances update everywhere instantly
```

The same drill works from **P&L → group → ledger → voucher**, from any **dashboard card**, from the **aging report**, from **GST returns** (GSTR-1 line → the invoices that compose it → the voucher), and from **TDS** (a 26AS-matched entry → the source bill).

Supporting reports, all drill-enabled:
- **Day Book** — every transaction across all voucher types in chronological order; filter by date/type/user; the single source of truth for "what happened today".
- **Party Ledger** — one customer/vendor's entire life in one view, with running balance and bill-by-bill outstanding.
- **Trial Balance, Group Summary, Stock Summary** — all clickable to the voucher.
- **Real-time recalculation** — like Tally, an edit reflects in every report the instant it's posted; no batch "finalize" step.

---

## 5. Bank Statement Import (no live feeds — deliberately)

Live bank feeds in India require account-aggregator/RBI-licensed plumbing that a young SaaS should not gate its launch on. So ONK ships the next-best, fully self-serve flow:

1. **Upload** the bank statement CSV/Excel/PDF (parser supports the major formats: HDFC, ICICI, SBI, Axis, Kotak column layouts auto-detected; a column-mapping wizard handles the rest and remembers per-bank).
2. **Auto-match** — system matches each statement line against existing vouchers by amount + date window + reference/UPI string + party heuristics.
3. **Three buckets shown:**
   - **Matched** (green) — confidence high, ready to confirm in bulk.
   - **Suggested** (amber) — probable match, one-click accept/reject.
   - **Unmatched** (red) — no voucher exists.
4. For each unmatched line, **one-click create** the correct voucher inline (Receipt for a credit, Payment for a debit), with smart party suggestion from the narration.
5. **Reconcile** — confirm. The bank ledger now ties to the statement closing balance, and a reconciliation status (cleared date) is stamped on each voucher — exactly Tally's BRS, but driven from the statement instead of manual ticking.

Learning loop: once you map "NEFT ABC TRD" → ABC Traders, future statements auto-match it.

---

## 6. Client Portal

Each customer of the ONK user gets an optional **read-only login** (magic-link or password):

- **Their invoices** — list with status (paid/unpaid/overdue), download PDF.
- **Outstanding summary** — total they owe, aging.
- **Payment history** — every receipt recorded against them.
- **Estimates/proformas awaiting their approval** — Approve/Reject with comment.
- **"Mark as paid"** — customer can declare a payment ("paid ₹50,000 via UPI ref XXXX on date"). This does **not** post to the ledger; it creates a **pending payment intimation** that lands in the ONK user's approval queue. The accountant verifies against the bank and confirms → only then a Receipt voucher posts. This kills the "they said they paid" phone-tag problem without letting customers write to your books.

Branded per company (logo, colours). Zero accounting exposure — the customer never sees a debit/credit.

---

## 7. Document Vault

GST law requires retaining purchase bills, e-way bills, contracts. ONK makes this digital and *attached at the point of entry*:

- **Attach to any voucher** — PDF/JPG/PNG: supplier invoice, delivery challan, contract, PO, payment proof. Drag-drop on web, camera capture on mobile.
- **Mandatory-attachment rules** — configurable: e.g., "no purchase above ₹X without a bill PDF" blocks posting until attached. Enforces compliance at source.
- **Vault view** — browse all documents by type, party, date, voucher; full-text search on file names and (where OCR'd) bill numbers.
- **Audit-ready export** — "give me all purchase bills for FY24-25" → zipped, indexed against the GSTR-2B reconciliation.
- Stored in object storage (S3-compatible), encrypted, with the voucher as the canonical link so a document is never orphaned.

---

## 8. Recurring Transactions

Set once, never re-key: rent, SaaS subscriptions, EMIs, retainer invoices, AMC bills.

- **Define a template**: voucher type, party, ledgers, amount (fixed or formula), GST, schedule (monthly/quarterly/weekly, on day-N or last-working-day).
- **Generation policy** per template:
  - *Auto-post* (silent, for fixed certain items like office rent), or
  - *Generate-and-hold* — system creates a **draft** on schedule and drops a "confirm before posting" notification into the action queue. Owner approves → posts.
- **End conditions** — run until date, or N occurrences (EMIs auto-stop after the tenure).
- Recurring **sales invoices** also trigger the Smart Reminder + Client Portal flow automatically.
- Dashboard "Upcoming" widget surfaces what's about to generate in the next 7 days.

---

## 9. Smart Reminders

Automated debtor follow-up, aging-rule-driven, multi-channel:

- **Channels**: Email (Resend), **WhatsApp Business API**, SMS fallback.
- **Aging rules per client**: e.g. "at +3 days overdue: gentle email", "+15 days: WhatsApp + email", "+30 days: firm WhatsApp with statement of account attached".
- **Templates** — friendly/firm/legal tone variants, with merge fields (party name, invoice no, amount, due date, payment link).
- **Payment link** — reminder includes a link to the Client Portal showing the exact outstanding and a download of the invoice.
- **Auto-stop** — once a receipt is posted (or a portal payment-intimation approved), reminders for that invoice cease.
- **Quiet hours & cadence caps** — never spam; max one reminder per invoice per N days; respect business hours.
- **Reminder log** — per party: what was sent, when, which channel, delivery/read status (WhatsApp ticks).

---

## 10. Approval Workflow

Configurable per company, each stage optional:

```
Staff enters (draft)
   → Accountant reviews (correct ledgers, GST, attachment present?)
      → Owner/Manager approves
         → POSTED (now affects ledgers & reports)
```

- **Per-voucher-type and per-amount-threshold** rules: e.g., expenses < ₹5,000 auto-post; purchases > ₹1L need owner approval; all sales need accountant review.
- **Drafts don't touch the ledger** — until posted, a voucher is invisible to reports and balances (prevents half-baked numbers polluting the dashboard).
- **Approval queue** — a single inbox per approver, batch-approve, with diff/comment per voucher and full attachment view.
- **Audit trail** — who entered, who reviewed, who approved, with timestamps, immutable. Critical for CAs and for trust with multi-staff offices.
- Mobile-first for approvers (the owner approves from the phone — see §15).

---

## 11. Industry Pipelines — the moat

This is what *none* of Tally/Busy/Zoho ship, and what wins security agencies, manpower contractors, BPOs, and freight companies. A visual, stage-gated pipeline:

### Security / Manpower agency pipeline

```
[ ATTENDANCE ]  →  [ SALARY CALC ]  →  [ PAYSLIP ]  →  [ BANK TRANSFER FILE ]  →  [ CLIENT INVOICE ]
   shifts,           PF/ESI/PT,         per guard,       NEFT/IMPS bulk          bill the client for
   sites,            OT, deductions     downloadable     upload format            deployed manpower
   guards            per statutory      PDF              (bank-ready CSV)         (markup over cost)
```

1. **Attendance capture** — per site, per guard, per shift. Sources: manual roster grid, CSV from a biometric device, or mobile self-mark by supervisors. Tracks present/absent/OT/double-shift/leave.
2. **Salary calculation** — applies pay structure (basic, allowances), **PF (12%), ESI (0.75%), Professional Tax, TDS where applicable**, OT, advances/deductions. India-statutory, not generic payroll.
3. **Payslips** — auto-generated PDF per employee, shareable via the employee portal/WhatsApp.
4. **Bank transfer file** — generates the **bank-ready bulk NEFT/IMPS upload file** (per major bank's format) so the office uploads one file instead of paying 200 guards manually.
5. **Client invoice** — the same attendance data, costed with the agency's markup and GST, **auto-generates the invoice to the client** ("47 guards × 30 days at site X = ₹Y + 18% GST"). One source of attendance truth feeds both *payroll out* and *revenue in* — the agency's two biggest numbers, reconciled by construction.

The whole chain is one pipeline screen: each stage is a tile that lights up as the prior completes, with counts and an error gutter (e.g., "3 guards missing bank details"). Variants ship for **freight** (trip sheet → driver settlement → freight invoice) and **BPO/staffing** (timesheet → billing).

---

## 12. GST Centre (one screen)

- **GSTR-1 ready** — outward supplies auto-compiled from sales vouchers, B2B/B2C/exports/credit-notes segregated, HSN summary, ready for export/API filing.
- **GSTR-2A/2B reconciliation** — upload/import the portal's 2B, auto-match against purchase vouchers; flag **mismatches, missing-in-books, missing-in-2B, ITC-at-risk**. One-click create the missing purchase from a 2B line.
- **GSTR-3B computation** — net liability auto-computed (output tax − eligible ITC), RCM included, with the drill-down to constituent vouchers.
- **RCM as first-class** — reverse charge flagged at entry, self-invoice generated, ITC tracked. (In Zoho this is an afterthought; here it's native.)
- **e-Invoice (IRN)** — for turnover-eligible clients, generate IRN + signed QR via the IRP, embed on the invoice PDF; e-way bill generation alongside.
- All on **one screen** with period selector: liabilities, ITC, reconciliation status, filing checklist, deadline countdown.

---

## 13. TDS Centre

- **Section-wise tracking** — 194C, 194J, 194I, 194H, etc.; correct rate auto-applied at the purchase/expense entry based on nature + PAN availability (higher rate if no PAN).
- **Deduct-at-source** — TDS auto-deducted on eligible vouchers, parked in the TDS-payable ledger with the deposit deadline.
- **26AS / TDS-receivable matching** — import 26AS/AIS, match TDS *deducted by your customers on you* against your books; flag gaps.
- **Form 16A generation** — quarterly certificates per deductee.
- **Return data** — 26Q/27Q-ready data export for filing.
- Dashboard surfaces **"TDS to deposit by 7th"** with a countdown — the deadline accountants miss most.

---

## 14. Multi-Company

- **One login → many companies.** A header company-switcher (`Ctrl+Shift+C`) flips context instantly; recent companies pinned.
- **Built for CAs and group owners** — a CA managing 40 clients sees a portfolio home (each client's compliance status, pending approvals, deadlines) before drilling into one.
- **Cross-company consolidation** — for group owners: consolidated P&L/Balance Sheet across entities, inter-company elimination.
- **Per-company users & roles** — staff scoped to specific companies; the CA has cross-company; the client owner sees only theirs.
- **Developer-controlled access model for resellers** — ONK can be resold; a reseller/partner provisions and meters client workspaces through an admin layer, with feature/seat gating they control. (This is the SaaS-reseller hook the desktop incumbents structurally can't offer.)

---

## 15. Mobile Experience

**Works on phone (full parity for the owner's daily needs):**
- View dashboard + all KPI cards and charts.
- Approve/reject vouchers from the approval queue (the #1 mobile use case for owners).
- Record an expense with camera-captured bill (Simple Mode tiles are touch-native).
- Send/resend an invoice; share via WhatsApp.
- Mark/confirm a payment received; review portal payment-intimations.
- Check a party's outstanding before a meeting; see who owes what.
- Glance at GST/TDS deadlines and reminder logs.

**Requires desktop (by design — these need a keyboard or wide screen):**
- High-volume Power-Mode voucher entry (200 vouchers/day is a keyboard task).
- Complex/wide reports (Trial Balance, full GSTR reconciliation grids, stock summaries).
- Bank statement column-mapping and bulk reconciliation.
- Payroll structure setup and bank-file generation.

Philosophy: **phone is for deciding and glancing; desktop is for producing.** We do not pretend a guard-attendance grid is a good phone experience, nor force the owner to a laptop to approve a ₹2,000 expense.

---

## 16. Revised Module List

| Module | Status | What's new vs. original plan |
|---|---|---|
| **Vouchers (Sales/Purchase/Payment/Receipt/Contra/Journal)** | Core | Dual-mode entry (Simple + Power); same function-key map as Tally |
| **Day Book / Party Ledger / Reports** | Core | Universal drill-down to editable voucher; real-time recompute |
| **Dashboard & Analytics** | New emphasis | Owner-first KPI cards + charts; action queue |
| **Bank Reconciliation** | Reworked | CSV/Excel/PDF statement import + auto-match (no live feed) |
| **Client Portal** | New | Read-only customer login + payment-intimation approval |
| **Document Vault** | New | Attach bills/contracts to vouchers; mandatory-attach rules; OCR search |
| **Recurring Transactions** | New | Templates + generate-and-hold approval |
| **Smart Reminders** | New | Aging-rule-driven Email/WhatsApp/SMS with payment links |
| **Approval Workflow** | New | Staff→Accountant→Owner, threshold-based, full audit trail |
| **Inventory** | Enhanced (Busy-grade) | Multi-location, batch, expiry, price lists/rate masters |
| **Payroll** | Enhanced | India-statutory PF/ESI/PT/TDS, bank bulk-transfer file |
| **Industry Pipelines** | New (moat) | Attendance→Salary→Payslip→Bank file→Client invoice; freight/BPO variants |
| **GST Centre** | India-first core | GSTR-1, 2A/2B recon, 3B, RCM, e-invoice/IRN, e-way bill — one screen |
| **TDS Centre** | India-first core | Section-wise, 26AS match, Form 16A, return data |
| **Multi-Company** | Enhanced | Portfolio view for CAs, consolidation, reseller access model |
| **Mobile App** | New | Approve/glance/capture parity; desktop for production tasks |
| **ODBC / Data Export & API** | Carried from Tally strength | Programmatic data extraction + REST API for integrations |

---

## 17. Revised Tech Additions

| Need | Technology |
|---|---|
| Transactional email & reminders | **Resend** |
| WhatsApp reminders/invoice delivery | **WhatsApp Business API** (via BSP, e.g. Meta Cloud API) |
| Invoice / payslip / Form 16A PDFs | Server-side PDF generation (e.g. headless Chromium / Puppeteer or React-PDF) |
| Bank statement parsing | CSV/Excel parser + per-bank column-mapping engine; PDF table extraction; OCR (Tesseract / cloud OCR) for scanned bills in the Vault |
| Dashboard charts | Charting library (Recharts / ECharts) |
| Document storage | S3-compatible object storage, encrypted, signed URLs |
| GST / e-invoice / e-way bill | IRP (GSP) integration; GSTR JSON generation; 2B import parser |
| Bulk bank-transfer file | Per-bank NEFT/IMPS file format generators |
| Multi-tenancy & reseller gating | Tenant isolation + feature/seat metering admin layer |
| Real-time balance updates | Event-driven ledger recompute; optimistic UI |
| Mobile | Responsive PWA + native shell for camera/notifications |
| API / data extraction | REST API + ODBC-style export bridge (parity with Tally's ODBC) |

All third-party keys (Resend, WhatsApp BSP, OCR, IRP) live in environment variables per `.env.example`, never in code — per project engineering principles.

---

## 18. Competitive Positioning

A 300-guard security agency, a 50-seat BPO, or a regional freight company today runs **Tally (for books) + Zoho (for invoicing/portal) + Excel (for attendance and payroll) + a payroll vendor** — three to four disconnected systems, double data entry, and a monthly reconciliation nightmare where attendance, salaries paid, and client billing never quite agree. ONK Solutions collapses that stack into one: **the same attendance record that pays the guard also bills the client, posts to the GST-ready ledger, deducts the TDS, and lands in the owner's approval queue on his phone — once, reconciled by construction.** They get Tally's keyboard speed and drill-down for their accountant, Zoho's portal and reminders for their cash collection, Busy's inventory/payroll practicality, and an industry pipeline none of the three will ever build because none of them is India-service-industry-first. The pitch is simple: **stop paying ₹20,000+/month across four tools that don't talk to each other, and run your entire operation — from the guard's shift to the client's payment — in one.**
