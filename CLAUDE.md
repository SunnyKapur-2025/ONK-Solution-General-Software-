# ONK Solution — General Software for Service Industry

## Engineering Principles

These rules govern every decision in this codebase. They are not guidelines — they are constraints.

### 1. Define the problem before writing code
Know exactly what you're building, for whom, and why. Ambiguous requirements cause more rework than any technical mistake. If a requirement is unclear, stop and clarify before touching a file.

### 2. Architecture first, code second
Decide how components talk to each other (APIs, queues, DBs) before implementing. Changing architecture mid-build is expensive. Document component boundaries before writing the first function.

### 3. Environment parity
Dev, staging, and prod must behave identically. Use `.env.example` (committed) and `.env` (gitignored) for all configuration. Never hard-code environment-specific values. Docker or equivalent tooling enforces this.

### 4. Secrets never in code
API keys, passwords, and tokens belong in environment variables or a secrets manager. `.env` files are gitignored. Hardcoded credentials are grounds for immediate revert.

### 5. Fail gracefully, log clearly
Every external call (DB, cache, third-party API) must handle errors with a meaningful log message. Silent failures are forbidden. Log the what, where, and why — not just that something went wrong.

### 6. Ship small, verify often
Small commits merged frequently are easier to debug and roll back than one massive change. A working 60% ships before a broken 100%. Every PR should be deployable independently.

---

## Project Overview

**Domain:** Service Industry  
**Status:** Pre-development — architecture phase

## Contribution Rules

- No secrets in code or committed `.env` files
- All environment config goes in `.env.example` with placeholder values
- Error handling is required on all I/O operations
- Commits must be atomic and deployable
