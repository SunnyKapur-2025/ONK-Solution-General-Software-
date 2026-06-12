# ONK Contract Notes — Engineering Principles

1. **Define before coding** — Clarify broker format, segment, and accounting rule before writing a parser.
2. **Architecture first** — Parser → Normalizer → Journal Engine → Tally Export. Each layer has one job.
3. **Environment parity** — Copy .env.example → .env.local. Never commit real keys.
4. **Secrets never in code** — PAN numbers, passwords, API keys go in env vars or passed at runtime only.
5. **Fail gracefully** — Every PDF parse and Tally sync has try/catch with a clear error message returned to UI.
6. **Ship small** — One broker parser per PR. One accounting rule per commit. Test with real contract note data.
