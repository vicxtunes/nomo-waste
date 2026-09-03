# Nomo Waste

Coordination and data platform for solid waste collection in Kampala
(Uganda Climate Innovation Challenge 2026).

- **Architecture, commands, and build philosophy:** see [`CLAUDE.md`](./CLAUDE.md).
- **Current increment:** the core loop — manual fill report → threshold →
  auto pickup request + alert → live authority dashboard.

## Quick start

```
npm install
npx supabase start        # local Postgres/Auth/Realtime (needs Docker)
cp .env.local.example .env.local   # then paste the printed anon key
npm run dev                # http://localhost:3000
```

Run `npm test` for unit tests and `npx supabase test db` for the database
trigger tests.
