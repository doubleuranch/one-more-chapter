# One More Chapter — Claude Context

## What this is
An invite-only book club app for a small friend group. Built with Vite 4 + React 18 + TypeScript + Tailwind CSS 3 + React Router v6. Currently runs entirely on **mock data** (no real backend). The mock data lives in `src/data/mockData.ts` and global state is managed in `src/context/AppContext.tsx`.

**Node version constraint:** The machine runs Node 16.2.0. Next.js 16 requires Node ≥20, so Vite was chosen instead. Do NOT suggest switching to Next.js without upgrading Node first.

---

## What's already built (do not rebuild)

| Page | Route | Status |
|------|-------|--------|
| Login | `/login` | ✅ Mock user picker + invite code flow |
| Register | `/register/:inviteCode` | ✅ Name, username, avatar color picker |
| Feed | `/feed` | ✅ Activity stream, Everyone/Following filter |
| Search | `/search` | ✅ Live Google Books API + local mock search |
| Book Detail | `/book/:id` | ✅ Cover, club ratings, vibe tags, hot takes, shelf actions |
| Profile | `/profile` `/profile/:username` | ✅ Tabbed shelf (read/reading/want), follow/unfollow |
| Club Shelf | `/club` | ✅ Currently reading, up-for-vote carousel, **club archive with member quotes** |
| Voting | `/voting` | ✅ Ranked nominees, vote/unvote, vote bars, voter avatars |
| Year Wrapped | `/wrapped` | ✅ Stats, reading personality, genre breakdown, loved books, hot takes |

### Components
- `UserAvatar` — colored initials circle, 4 sizes
- `BookCover` — image with fallback to styled placeholder
- `VibeTag` — pill, selectable/unselectable
- `RatingModal` — thumbs up/side/down + hot take (150 char) + vibe tag multi-select
- `BookCard` — cover + title + hover menu (rate / currently reading / want to read / remove)
- `ActivityItem` — feed card with avatar, book thumbnail, rating badge, blockquote hot take
- `Nav` — desktop sidebar + mobile bottom bar
- `Layout` — wraps all protected pages

### Key design decisions
- **Rating system:** thumbs_up / so_so / thumbs_down (the thumb SVG is rotated 0° / -90° / 180°)
- **Hot takes:** one-liner max 150 chars, shown as italicised blockquotes throughout the app
- **Vibe tags:** community-applied mood labels (not genres), shown on book detail + archive
- **Invite codes (mock):** `BOOKCLUB2024`, `ONEMORE`, `READMORE`
- **Color palette:** cream bg `#F5F0E8`, terracotta `#C4603B`, forest `#2D6A4F`, earth browns — all defined in `tailwind.config.js`

---

## What to build next session: Supabase backend

### Pre-work Erin needs to do first
1. Create a free project at https://supabase.com
2. Run `supabase/schema.sql` in the Supabase SQL editor
3. Copy Project URL and anon key into `.env.local` (see `.env.example`)
4. Optionally: run `supabase/seed.sql` to pre-populate with the mock data

### Then: swap mock data for real data

The swap is designed to be surgical. Everything flows through `AppContext.tsx` — that's the only file that talks to data. The plan:

1. **Install Supabase client**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Wire up `src/lib/supabase.ts`** — already stubbed, just needs env vars

3. **Replace `AppContext.tsx`** — swap `useState` initialised from mock data with Supabase queries. The context's public API (all the same functions: `rateBook`, `setBookStatus`, `voteForBook`, etc.) stays identical so no page or component needs to change.

4. **Auth flow** — replace the mock login picker with Supabase magic-link email auth. The invite code check moves to a Supabase Edge Function that validates the code and creates the user record.

### Files that change
| File | Change |
|------|--------|
| `src/context/AppContext.tsx` | Full rewrite — Supabase queries instead of mock state |
| `src/lib/supabase.ts` | Uncomment the real client (already stubbed) |
| `src/pages/Login.tsx` | Replace mock user picker with email input + magic link |
| `src/pages/Register.tsx` | Call Supabase Edge Function to validate invite + create profile |

### Files that do NOT change
Everything in `src/components/`, `src/pages/` (except Login + Register), `src/types/`, `src/lib/utils.ts`, `src/lib/googleBooks.ts`, all Tailwind config.

---

## Supabase schema (see `supabase/schema.sql`)

Tables: `profiles`, `books`, `user_books`, `club_books`, `votes`, `follows`, `invite_codes`

Row Level Security is on by default. Policies are in the schema file.

---

## After Supabase: deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Set these env vars in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Running the app locally

```bash
cd "/Users/erinweidner/CPG Thing/one-more-chapter"
npm run dev
# → http://localhost:5173
# Sign in as any mock user, or use invite code BOOKCLUB2024
```
