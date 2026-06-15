# Booking Platform — Deploy Guide

This is your booking demo, now wired to a real database. Bookings and
suggestions are saved permanently, and the "no double-booking" rule is enforced
by the database itself (not the browser), so it holds up even under real traffic.

Stack: **React (Vite)** front-end + **Supabase** (managed Postgres) back-end,
deployed on **Cloudflare Pages**, domain via **GoDaddy/Cloudflare**.

You'll do this once. Budget ~30–45 minutes the first time.

---

## Step 1 — Set up the database (Supabase)

1. Go to https://supabase.com → sign up (free tier is fine) → **New project**.
   Pick a name and a strong database password (save it). Choose the region
   closest to your users (Frankfurt/Bahrain is closest to Kuwait).
2. Wait ~2 min for it to provision.
3. Left sidebar → **SQL Editor** → **New query**. Open `schema.sql` from this
   project, paste the whole thing in, click **Run**. You should see "Success".
   (This creates the tables, the anti-double-booking logic, and the seed data.)
4. Left sidebar → **Project Settings** → **API**. Copy two values:
   - **Project URL**  → this is your `VITE_SUPABASE_URL`
   - **anon / public** key → this is your `VITE_SUPABASE_ANON_KEY`
   (The anon key is meant to be public — Row Level Security protects your data.)

---

## Step 2 — Run it locally (optional but recommended)

You need Node.js installed (https://nodejs.org, LTS version).

```bash
cp .env.example .env        # then paste your two values into .env
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). Make a booking, refresh
the page — it should still show as taken. That's the database working.

---

## Step 3 — Put the code on GitHub

1. Create a free account at https://github.com if you don't have one.
2. Create a new **empty** repository (no README).
3. From this project folder:

```bash
git init
git add .
git commit -m "Booking platform"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

`.env` is git-ignored on purpose — your keys do NOT get pushed. You'll add them
to Cloudflare in the next step instead.

---

## Step 4 — Deploy on Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → pick your repo.
2. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. **Environment variables** (expand this section before deploying) — add both:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. **Save and Deploy.** In ~1–2 min you get a live `*.pages.dev` URL. Test it.

Every future `git push` auto-deploys. No servers to maintain.

---

## Step 5 — Point your domain

Your domain is at GoDaddy but you use Cloudflare. Two cases:

**A) Domain's DNS is already managed by Cloudflare:**
In Cloudflare Pages → your project → **Custom domains** → **Set up a domain** →
type your domain (e.g. `book.yourdomain.com`). Cloudflare adds the DNS record
for you. Done.

**B) Domain still managed at GoDaddy:**
Easiest is to move DNS to Cloudflare (Cloudflare → **Add a site**, follow the
nameserver steps — you update nameservers once inside GoDaddy). Then do (A).
Or, to keep DNS at GoDaddy: in Pages add the custom domain, Cloudflare shows you
a CNAME target; add that CNAME in GoDaddy's DNS panel.

A subdomain like `book.yourdomain.com` is the cleanest choice.

---

## What's NOT in this version yet (next slices)

- **Admin dashboard** — owner view to see/manage bookings and read suggestions.
  The data is already in Supabase (you can view it now under **Table Editor**),
  but there's no nice UI yet. This needs login/auth and is the next build.
- **Real email/SMS confirmations** — right now the confirmation screen says one
  is "on its way" but nothing is sent. Add an email provider (Resend) next.
- **Multi-tenant** — this runs as one business at a time (niche switcher is a
  demo control). Turning it into "many businesses, each with their own login"
  is a later step.

---

## How the pieces map (for future-you)

- `src/App.jsx` — the whole front-end. `THEMES`/`CONTENT` still drive everything.
- `src/supabaseClient.js` — reads your two env vars.
- `schema.sql` — the database. The `create_booking` function is where the
  atomic, race-proof booking lives. To change restaurant capacity, edit
  `v_per_slot` there.
- Availability shown in the app comes from `get_availability`, which returns
  **counts only** — customer contact details and notes never reach the browser.
