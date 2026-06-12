-- ============================================================
-- One More Chapter — Supabase Schema
-- Run this in the Supabase SQL Editor (project → SQL Editor → New query)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  username      text unique not null,
  display_name  text not null,
  bio           text default '',
  avatar_color  text default '#C4603B',
  avatar_initials text not null,
  created_at    timestamptz default now()
);

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name, avatar_initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_initials', upper(left(split_part(new.email, '@', 1), 2)))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FOLLOWS
-- ============================================================
create table public.follows (
  follower_id   uuid references public.profiles on delete cascade,
  following_id  uuid references public.profiles on delete cascade,
  created_at    timestamptz default now(),
  primary key (follower_id, following_id)
);

-- ============================================================
-- BOOKS (cached from Google Books API + manually added)
-- ============================================================
create table public.books (
  id            text primary key,  -- Google Books volume ID or custom slug
  title         text not null,
  author        text not null,
  cover_url     text,
  description   text default '',
  published_year int,
  genre         text default 'Fiction',
  page_count    int default 0,
  created_at    timestamptz default now()
);

-- ============================================================
-- USER_BOOKS (a user's relationship to a book)
-- ============================================================
create type book_status as enum ('read', 'want_to_read', 'currently_reading');
create type rating_value as enum ('thumbs_up', 'so_so', 'thumbs_down');

create table public.user_books (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles on delete cascade not null,
  book_id       text references public.books on delete cascade not null,
  status        book_status not null,
  rating        rating_value,
  hot_take      text check (char_length(hot_take) <= 150),
  vibe_tags     text[] default '{}',
  progress      int check (progress between 0 and 100),
  date_added    date default current_date,
  date_read     date,
  updated_at    timestamptz default now(),
  unique (user_id, book_id)
);

-- ============================================================
-- CLUB_BOOKS (books the club has read, is reading, or nominated)
-- ============================================================
create type club_book_status as enum ('reading', 'read', 'nominated');

create table public.club_books (
  id            uuid default uuid_generate_v4() primary key,
  book_id       text references public.books on delete cascade not null,
  status        club_book_status not null default 'nominated',
  added_by      uuid references public.profiles on delete set null,
  start_date    date,
  end_date      date,
  created_at    timestamptz default now()
);

-- ============================================================
-- VOTES (who voted for which club_book nomination)
-- ============================================================
create table public.votes (
  user_id       uuid references public.profiles on delete cascade,
  club_book_id  uuid references public.club_books on delete cascade,
  created_at    timestamptz default now(),
  primary key (user_id, club_book_id)
);

-- ============================================================
-- INVITE_CODES
-- ============================================================
create table public.invite_codes (
  id            uuid default uuid_generate_v4() primary key,
  code          text unique not null,
  created_by    uuid references public.profiles on delete set null,
  used_by       uuid references public.profiles on delete set null,
  used_at       timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz default now()
);

-- Seed a few invite codes
insert into public.invite_codes (code) values
  ('BOOKCLUB2024'),
  ('ONEMORE'),
  ('READMORE');

-- ============================================================
-- SWAP / BORROW
-- ============================================================
create type swap_status as enum ('available', 'requested', 'borrowed', 'returned');

create table public.swap_books (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles on delete cascade not null,
  book_id       text references public.books on delete cascade not null,
  note          text,
  status        swap_status not null default 'available',
  requested_by  uuid references public.profiles on delete set null,
  borrowed_at   date,
  created_at    timestamptz default now()
);

create table public.swap_requests (
  id            uuid default uuid_generate_v4() primary key,
  book_id       text references public.books on delete cascade not null,
  requester_id  uuid references public.profiles on delete cascade not null,
  note          text,
  fulfilled     boolean not null default false,
  fulfilled_by  uuid references public.profiles on delete set null,
  created_at    timestamptz default now()
);

-- ============================================================
-- EVENTS / MEETINGS
-- ============================================================
create table public.events (
  id            uuid default uuid_generate_v4() primary key,
  title         text not null,
  date          date not null,
  time          text not null,
  location      text,
  virtual_link  text,
  book_id       text references public.books on delete set null,
  description   text,
  created_by    uuid references public.profiles on delete set null,
  created_at    timestamptz default now()
);

create type rsvp_status as enum ('yes', 'maybe', 'no');

create table public.event_rsvps (
  event_id      uuid references public.events on delete cascade,
  user_id       uuid references public.profiles on delete cascade,
  status        rsvp_status not null,
  updated_at    timestamptz default now(),
  primary key (event_id, user_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create type notification_type as enum (
  'recommended', 'reaction', 'event_reminder',
  'friend_rated', 'borrow_request', 'borrow_accepted'
);

create table public.notifications (
  id            uuid default uuid_generate_v4() primary key,
  recipient_id  uuid references public.profiles on delete cascade not null,
  type          notification_type not null,
  from_user_id  uuid references public.profiles on delete set null,
  book_id       text references public.books on delete set null,
  event_id      uuid references public.events on delete set null,
  text          text not null,
  read          boolean not null default false,
  created_at    timestamptz default now()
);

-- ============================================================
-- FEED REACTIONS
-- ============================================================
create table public.feed_reactions (
  id            uuid default uuid_generate_v4() primary key,
  user_book_id  uuid references public.user_books on delete cascade not null,
  user_id       uuid references public.profiles on delete cascade not null,
  emoji         text not null,
  created_at    timestamptz default now(),
  unique (user_book_id, user_id, emoji)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.follows        enable row level security;
alter table public.books          enable row level security;
alter table public.user_books     enable row level security;
alter table public.club_books     enable row level security;
alter table public.votes          enable row level security;
alter table public.invite_codes   enable row level security;
alter table public.swap_books     enable row level security;
alter table public.swap_requests  enable row level security;
alter table public.events         enable row level security;
alter table public.event_rsvps    enable row level security;
alter table public.notifications  enable row level security;
alter table public.feed_reactions enable row level security;

-- Profiles: anyone in the club can read, only you can update yours
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Follows: anyone can read, only you can follow/unfollow
create policy "follows_select" on public.follows for select using (true);
create policy "follows_insert" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete" on public.follows for delete using (auth.uid() = follower_id);

-- Books: anyone can read; any member can insert or update (for caching Google Books results)
create policy "books_select" on public.books for select using (true);
create policy "books_insert" on public.books for insert with check (auth.uid() is not null);
create policy "books_update" on public.books for update using (auth.uid() is not null);

-- User books: anyone in the club can read (for feed/book detail); only you can write yours
create policy "user_books_select" on public.user_books for select using (true);
create policy "user_books_insert" on public.user_books for insert with check (auth.uid() = user_id);
create policy "user_books_update" on public.user_books for update using (auth.uid() = user_id);
create policy "user_books_delete" on public.user_books for delete using (auth.uid() = user_id);

-- Club books: anyone can read; any member can nominate
create policy "club_books_select" on public.club_books for select using (true);
create policy "club_books_insert" on public.club_books for insert with check (auth.uid() is not null);

-- Votes: anyone can read; only you can vote/unvote
create policy "votes_select" on public.votes for select using (true);
create policy "votes_insert" on public.votes for insert with check (auth.uid() = user_id);
create policy "votes_delete" on public.votes for delete using (auth.uid() = user_id);

-- Invite codes: only visible to admins (service role); anyone can look up a code to validate it
create policy "invite_codes_select" on public.invite_codes for select using (true);

-- Swap books: anyone can read; only owner can insert/delete
create policy "swap_books_select" on public.swap_books for select using (true);
create policy "swap_books_insert" on public.swap_books for insert with check (auth.uid() = user_id);
create policy "swap_books_update" on public.swap_books for update using (auth.uid() = user_id or auth.uid() = requested_by);
create policy "swap_books_delete" on public.swap_books for delete using (auth.uid() = user_id);

-- Swap requests: anyone can read; only requester can insert/delete
create policy "swap_requests_select" on public.swap_requests for select using (true);
create policy "swap_requests_insert" on public.swap_requests for insert with check (auth.uid() = requester_id);
create policy "swap_requests_update" on public.swap_requests for update using (auth.uid() = requester_id or auth.uid() = fulfilled_by);
create policy "swap_requests_delete" on public.swap_requests for delete using (auth.uid() = requester_id);

-- Events: anyone can read; any member can create
create policy "events_select" on public.events for select using (true);
create policy "events_insert" on public.events for insert with check (auth.uid() is not null);
create policy "events_update" on public.events for update using (auth.uid() = created_by);

-- Event RSVPs: anyone can read; only you can write yours
create policy "event_rsvps_select" on public.event_rsvps for select using (true);
create policy "event_rsvps_insert" on public.event_rsvps for insert with check (auth.uid() = user_id);
create policy "event_rsvps_update" on public.event_rsvps for update using (auth.uid() = user_id);

-- Notifications: only you can read/update yours
create policy "notifications_select" on public.notifications for select using (auth.uid() = recipient_id);
create policy "notifications_insert" on public.notifications for insert with check (auth.uid() is not null);
create policy "notifications_update" on public.notifications for update using (auth.uid() = recipient_id);

-- Feed reactions: anyone can read; only you can write yours
create policy "feed_reactions_select" on public.feed_reactions for select using (true);
create policy "feed_reactions_insert" on public.feed_reactions for insert with check (auth.uid() = user_id);
create policy "feed_reactions_delete" on public.feed_reactions for delete using (auth.uid() = user_id);

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Feed view: joins user_books with profiles and books for the activity feed
create or replace view public.feed_items as
select
  ub.id,
  ub.user_id,
  p.display_name,
  p.avatar_color,
  p.avatar_initials,
  p.username,
  b.id as book_id,
  b.title,
  b.author,
  b.cover_url,
  ub.status,
  ub.rating,
  ub.hot_take,
  ub.updated_at as timestamp
from public.user_books ub
join public.profiles p on p.id = ub.user_id
join public.books b on b.id = ub.book_id
order by ub.updated_at desc;

-- Club archive view: past picks with vote counts
create or replace view public.club_archive as
select
  cb.id,
  cb.book_id,
  b.title,
  b.author,
  b.cover_url,
  cb.status,
  cb.start_date,
  cb.end_date,
  count(v.user_id) as vote_count
from public.club_books cb
join public.books b on b.id = cb.book_id
left join public.votes v on v.club_book_id = cb.id
group by cb.id, b.id
order by cb.start_date desc nulls last;
