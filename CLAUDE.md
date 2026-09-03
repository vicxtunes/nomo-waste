# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Nomo Waste — build instructions

This file is the project brief for Claude Code. Read it before making
architectural decisions. It reflects the current, agreed scope for the
UCIC 2026 submission and MVP build. Update this file as decisions change —
don't let it go stale.

## Commands

```
npm install
npm run dev                 # Next dev server (http://localhost:3000)
npm run build               # static export -> out/  (MUST stay green: Capacitor depends on it)
npm run typecheck           # tsc --noEmit
npm run lint                # next lint
npm test                    # Vitest (unit)
npx vitest run src/lib/severity.test.ts   # a single test file

npx supabase start          # local Postgres / Auth / Realtime (Docker)
npx supabase stop
npx supabase db reset       # re-apply all migrations + seed.sql
npx supabase test db        # pgTAP tests in supabase/tests/
npm run gen:types           # regenerate src/lib/database.types.ts from the local DB
```

After `npx supabase start`, copy the printed anon key into `.env.local`
(`NEXT_PUBLIC_SUPABASE_ANON_KEY`); `.env.local.example` has the rest.

**In GitHub Codespaces:** the app is client-rendered, so the browser (on your
machine) hits Supabase directly and can't reach `127.0.0.1` in the codespace.
Set port `54321` (and `3000`) visibility to **Public** in the Ports panel, and
set `NEXT_PUBLIC_SUPABASE_URL=https://<codespace-name>-54321.app.github.dev`.
Restart `npm run dev` after changing `.env.local`.

**Hosted Supabase:** point `.env.local` at the project URL + anon key, then set
the DB up one of two ways:

- *CLI (keeps migration history):* `npx supabase login` →
  `npx supabase link --project-ref <ref>` → `npx supabase db push` (applies
  `supabase/migrations/*`) → seed by pasting `supabase/cloud/seed.sql` into the
  dashboard SQL editor.
- *Manual (fastest):* paste `supabase/cloud/schema.sql` then
  `supabase/cloud/seed.sql` into the SQL editor. `schema.sql` is all seven
  migrations concatenated. If you later want `db push` to work, run
  `npx supabase migration repair --status applied 20260830000001 … 20260830000007`
  so the CLI knows they are already applied.

`supabase/cloud/*` must be kept in sync when a migration changes — the numbered
files under `supabase/migrations/` stay the source of truth.

## Architecture (Increment 1 — the core loop)

- **Rendering: fully static.** `next.config.mjs` sets `output: 'export'`.
  Every route is a client component and talks to Supabase from the browser
  with the anon key. Do NOT add server components, server actions, or route
  handlers to any route — it breaks the static export and Capacitor with it.
- **The ingestion point is the `fill_reports` INSERT, not a service.** With
  no server runtime there is nowhere to host an ingestion endpoint, so the
  row insert itself is the single ingestion point. `src/lib/ingestion.ts`
  `ingestFillReport()` is a thin insert wrapper; the
  `trg_on_fill_report` Postgres trigger
  (`supabase/migrations/*_ingestion_trigger.sql`) owns ALL downstream
  effects: sync `bins.current_fill_level`, and on threshold open exactly one
  `collection_requests` (`auto_threshold_alert`) + one `alerts` row per bin.
  A future sensor POST straight to PostgREST hits the identical path.
- **Threshold** lives in the single-row `settings` table (`fill_threshold_pct`,
  default 80). Alert severity bands (`severity_for_fill` in SQL) are mirrored
  by `src/lib/severity.ts` — keep the two in sync (there is a unit test).
- **Auth is faked.** No real auth yet: `src/context/ActingUserContext.tsx`
  loads the seeded `users` and a header dropdown picks the active one
  (persisted to `localStorage`). RLS is enabled with drafted per-role
  policies plus a `-- DEV ONLY` block granting `anon` full access — delete
  that block when phone-OTP auth lands.
- **Dashboard is Realtime, not polled** (`src/app/dashboard/page.tsx`
  subscribes to `alerts` / `bins` / `collection_requests`).
- **Mapbox is optional**: `ZoneMap` / `CollectorMap` render nothing without
  `NEXT_PUBLIC_MAPBOX_TOKEN`; a table/list is the always-present fallback.
  Shared pure helpers (`fillColor`, `binApproxCoords` — bins have no real
  lat/lng yet, so both maps jitter them deterministically around the zone
  centroid) live in `src/lib/map.ts`.
- **Collector dispatch** (`src/app/collector/page.tsx` + `CollectorMap`):
  Realtime bin pins, a "Dispatch to fullest bin" button that routes via the
  Mapbox Directions API and animates a van to the bin. On arrival
  `src/lib/collection.ts` `completePickup()` closes the loop — marks the open
  `auto_threshold_alert` request `completed`, writes a `collections` row,
  resolves the bin's `alerts`, and pushes a low reading back through
  `ingestFillReport()`. Request *claiming/assignment* UI is still a later
  increment.
- **Native projects** (`ios/`, `android/`) are gitignored and regenerated
  with `npx cap add`; not created in this Linux container.

Migrations are numbered `20260830000001..07` and must be applied in order
(enums → core tables → ops tables → settings → ingestion trigger → RLS →
realtime).

## What this project is

Nomo Waste is a coordination and data platform for solid waste collection
in Kampala, built for the Uganda Climate Innovation Challenge (UCIC 2026).
It fixes a
coordination and visibility failure: waste sits too long between
generation and collection because households, collectors, and authorities
have no shared, real-time picture of where waste is, how full bins are,
or whether collection actually happened.

The climate case: shortening the time waste sits uncollected reduces
methane generation from decomposing organics, reduces informal burning
(black carbon), and gives authorities visibility to prevent landfill
overflow risk (see Kiteezi landfill collapse, Aug 2024, as the local
cautionary case this platform is meant to help avoid repeating).

Do not overclaim the climate mechanism. Waste is the third-largest global
methane source (~20%), behind agriculture (~40%) and fossil fuels (~35%).
The honest framing is: Phase 1 builds visibility and coordination: it does
not divert emissions by itself. Diversion (Phase 3) is what actually cuts
methane, and Phase 1's data is what makes Phase 3 credible and fundable.
Keep this distinction in any user-facing copy, pitch content, or docs
this repo generates.

## Build philosophy: software first, hardware later

**Build the full logic and data flow assuming manual/software-only input
first.** Do not wire up real IoT sensors, don't integrate hardware SDKs,
and don't spend time on device firmware or embedded code in this phase.

The reason this matters architecturally: every place that will eventually
receive sensor data (bin fill level, in particular) must be designed as a
generic ingestion point, not hardcoded to a manual-entry flow. Specifically:

- `fill_reports.source` must be an enum/string field
  (`manual_slider` | `photo` | `sensor`) from day one, even though only
  `manual_slider` will be used at first. The app should not care which
  source populated a fill level, only that a row was written.
- The ingestion path (however a fill level enters `fill_reports`) should
  be a single function/service, not scattered across UI handlers. When
  hardware is added later, it should be able to POST to the same
  ingestion function/endpoint that the manual UI calls, without touching
  downstream logic (alerts, dashboards, collector requests).
- Don't build a device-management table, pairing flow, firmware OTA
  concept, or anything hardware-specific right now. That's explicitly
  out of scope until the software loop is working end-to-end and proven.
- Keep the abstraction cheap: a `source` enum and one shared ingestion
  function is enough. Don't over-engineer a plugin system for sensors
  that don't exist yet.

## Core data model (build in this order)

1. `users` — id, name, phone, role (household | market_vendor | collector
   | admin), location (lat/lng), zone_id
2. `bins` — id, owner_id, type (household | market | public),
   monitoring_mode (sensor | manual), zone_id, current_fill_level,
   last_updated_at
3. `fill_reports` — id, bin_id, fill_level, source (manual_slider |
   photo | sensor), reported_at
4. `collection_requests` — id, requester_id, bin_id (nullable — a
   household without a registered bin can still request), request_type
   (manual_call | auto_threshold_alert), payment_type (one_time |
   subscription, nullable until payments are built), amount,
   payment_status, collector_id (nullable until assigned), status
   (pending | assigned | in_progress | completed | missed), created_at
5. `collector_clients` — id, collector_id, household_id,
   relationship_status (active | paused), assigned_at
6. `collections` — id, request_id, collector_id, status (completed |
   missed | rescheduled), notes, completed_at, proof_photo_url
7. `alerts` — id, bin_id, collector_id (nullable), zone_id, severity
   (low | medium | high), created_at, resolved_at
8. `collectors_profile` — id (→ users), business_name (nullable),
   service_area, pricing_one_time, pricing_subscription_monthly, rating,
   active_status
9. `transactions` — id, request_id, payer_id, collector_id, amount,
   method (mobile_money | card | cash_on_pickup), status, created_at

Build and test tables in roughly this order, since later tables depend on
earlier ones existing and having realistic seed data.

Enum values may deliberately exceed what's wired up this phase. Examples:
`fill_reports.source` includes `sensor`, `bins.monitoring_mode` includes
`sensor`, and `transactions.method` includes `card` — none of which are
built now (see non-goals). Define the full enum from day one so later
phases don't require a migration; just don't build the code paths behind
the unused values yet.

## Core user flows to implement (in priority order)

1. **Manual fill reporting** — household/vendor sets a bin fill level via
   a simple slider or button (1–5 or %). Writes to `fill_reports`,
   updates `bins.current_fill_level`.
2. **Threshold-triggered request** — when fill level crosses a
   configurable threshold, auto-create a row in `collection_requests`
   (type `auto_threshold_alert`) and a row in `alerts`.
3. **Manual pickup request** — a household without a monitored bin can
   tap "request pickup" directly, creating a `collection_requests` row
   (type `manual_call`) without going through `fill_reports` at all.
4. **Collector map/list view** — collector sees nearby requests (map
   pins or list, support both — some collectors will be on low-end
   phones) plus their existing `collector_clients`. They claim a
   request, mark in_progress, then completed/missed. Writes to
   `collections`.
5. **Resident booking flow** — resident sees nearby collectors on a map
   (rating, one-time price, subscription price), taps to book. On
   completion, prompt to convert to a `collector_clients` subscription.
6. **Payments** — start with Mobile Money (MTN MoMo / Airtel Money) as
   the primary rail. Cash-on-pickup as a fallback. Card payments are not
   a priority for this market.
7. **Authority dashboard** — read-only, zone-level map/dashboard showing
   `alerts` by severity, bin fill levels aggregated by zone, and
   collection performance (completed vs missed) per zone/collector. This
   is the KCCA/NEMA-facing view — no write access needed for v1.

## Stack and conventions

- Next.js + Supabase (matches other Dementa Technologies products).
  Use Supabase Realtime for live map/dashboard updates instead of
  polling.
- Docker-based deployment, consistent with other products on shared
  infrastructure.
- Maps: Mapbox GL JS preferred over Google Maps for cost at scale and
  custom pin styling (pins need to be colored by fill level / status,
  not default markers).
- **UI = the Spark Admin (Bootstrap 5) theme, ported to CSS.** The whole
  design system lives in `src/app/globals.css` as real component classes
  (`.sidebar-wrapper`, `.navbar-custom`, `.footer-custom`, `.card`,
  `.stat-value`, `.table-card-custom`/`.table-custom`, `.badge-table`,
  `.form-control-custom`/`.form-select-custom`/`.form-label-custom`,
  `.btn-custom`+`-primary/-secondary/-light/-outline-primary`,
  `.alert-custom-*`, `.login-*`, `.error-*`) driven by `:root` design tokens.
  Palette: forest-green (`--brand-forest-dark #051c12` / `--brand-forest-medium
  #072f1f`) for chrome + primary actions, lime (`--brand-lime #b4f105`) for the
  accent, warm grey-green canvas (`#f4f6f5`). Font: **Plus Jakarta Sans**
  (`next/font`, `--font-jakarta`). Icons: **bootstrap-icons** (`<i className="bi
  bi-…" />`). Legacy aliases `.btn-submit` / `.btn-plain` / `.section-label` /
  `.pill-tab` still resolve. Keep new UI consistent with these — don't
  reintroduce slate/navy Tailwind utilities or the old amber-submit rule.
- **App shell** (`src/components/AppShell.tsx`): the three "bars" — fixed dark
  sidebar (grouped `NAV`, active item + lime edge indicator, acting-user
  profile card at the bottom), sticky blurred topbar (mobile toggle, page
  title, search pill, notifications, `ActingUserSwitcher`), and footer.
  Off-canvas under 1200px (the CSS breakpoint), toggled via a `show` class on
  `.sidebar-wrapper` + `.sidebar-overlay`.
- **Route groups:** the shell wraps `src/app/(app)/*` only (via
  `(app)/layout.tsx`). `src/app/login/page.tsx` and `src/app/not-found.tsx`
  render outside it — standalone `.login-wrapper` screens, matching Spark's
  auth/404 pages. `/login` is visual only (auth still faked).
- If this project has (or will have) a `.claude/skills/` directory,
  follow the same skill structure used on other Dementa Technologies
  projects (security, Docker, schema conventions, API patterns, testing
  standards) rather than inventing new conventions here.

## Mobile packaging (Capacitor)

The resident and collector apps ship as native iOS/Android via
[Capacitor](https://capacitorjs.com/) wrapping the web build. The authority
dashboard stays web-only — don't package it.

- Capacitor needs a static/client-rendered bundle. A standard
  server-rendered Next.js app does not wrap directly. Use
  `output: 'export'` (static export) or build the mobile-facing routes as
  a client-rendered SPA. Decide this before adding server components or
  server actions to resident/collector screens.
- `webDir` in `capacitor.config.*` must match the web build output dir
  (`out` for Next static export). A mismatch = blank screen in the app.
- Run `npx cap sync` after every web build and after adding any plugin.
- Decide early whether `ios/` and `android/` are committed (allows native
  config) or gitignored and regenerated. Document the choice here.
- Supabase Realtime, Mapbox GL JS, and Mobile Money redirects all need to
  work inside the Capacitor WebView — verify each on-device, not just in
  the browser. Mobile Money payment callbacks in particular need a
  deep-link / custom-URL-scheme return path.

### Decisions

- **`android/` and `ios/` are gitignored and regenerated** (`npx cap add`).
  `scripts/android-build-apk.sh` recreates `android/` from scratch each run,
  so nothing native needs to live in git.
- App id / name: `com.dementa.nomowaste` / "Nomo Waste"
  (`capacitor.config.ts`).
- A packaged app runs from `https://localhost` in the WebView and cannot
  reach `127.0.0.1` or a private Codespaces port. The APK bakes in whatever
  `NEXT_PUBLIC_SUPABASE_URL` was set at `npm run build` time — use a
  **public** URL (public Codespaces forward for a throwaway test, hosted
  Supabase for real).

### Building the Android APK on Linux (Codespace / CI — no emulator, no iOS)

```
npm install                       # ensure @capacitor/android is present
npm run android:toolchain         # one-time: JDK 17 + Android SDK (~750 MB)
export JAVA_HOME=/usr/local/sdkman/candidates/java/17.0.13-tem
export ANDROID_HOME=$HOME/android-sdk
npm run android:apk               # web build -> cap add/sync -> gradlew assembleDebug
# -> ./nomo-waste-debug.apk   (sideload onto a real Android device)
```

Gotchas handled by the script (don't undo them):
- Gradle 8.2.1 (the Capacitor 6 template's version) **does not run on
  JDK 21+** — the build must use JDK 17.
- The Gradle wrapper's distribution download times out on slow links; the
  script curl-fetches `gradle-8.2.1-bin.zip` into `android/gradle/wrapper/`
  and points the wrapper at the local file.

iOS still needs macOS + Xcode (or a `macos` CI runner) — not possible here.

## Explicit non-goals for this build phase

- No real sensor/IoT hardware integration or device pairing flow.
- No firmware, embedded code, or hardware SDKs.
- No card payment integration (Mobile Money first).
- No government/KCCA write-access features — dashboard is read-only for
  authorities in this phase.
- Don't build carbon-credit or emissions-accounting logic yet — that's a
  Phase 3 idea, not part of this build.

## When in doubt

Prioritize a working end-to-end software loop (report → request →
collector action → completion → dashboard reflects it) over polishing
any single screen. The competition deadline favors a working demo over a
feature-complete but disconnected set of screens.