# AlmostCrackd — Admin Panel

Admin dashboard for the AlmostCrackd humor study Supabase database.

## Setup

1. In Vercel, add these Environment Variables:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key |

2. Deploy — Vercel will pick up the Next.js app automatically.

## What it does (so far)

- **`/`** — Users table: lists all rows from `public.profiles`, paginated (20/page), searchable by name or email. Shows name, email, roles (superadmin / matrix admin), study enrollment status, join date, and truncated ID.

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Supabase JS (`service_role` key — bypasses RLS for full read access)
