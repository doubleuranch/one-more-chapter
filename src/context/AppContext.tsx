import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Book, UserBook, ClubBook, ClubBookStatus, FeedItem, Rating, BookStatus, BookFormat, SwapBook, SwapRequest, ClubEvent, Notification } from '../types';
import { MOCK_NOTIFICATIONS } from '../data/mockData';
import { generateId } from '../lib/utils';
import { supabase, signOut as supabaseSignOut, consumeInviteCode } from '../lib/supabase';
import { toast } from '../lib/toast';

// ─── State shape ───────────────────────────────────────────────────────────────

interface AppState {
  currentUser: User | null;
  users: User[];
  books: Book[];
  userBooks: UserBook[];
  clubBooks: ClubBook[];
  feedItems: FeedItem[];
  swapBooks: SwapBook[];
  swapRequests: SwapRequest[];
  events: ClubEvent[];
  notifications: Notification[];
  loading: boolean;
  initialized: boolean;
  needsProfileSetup: boolean;
}

interface AppContextValue extends AppState {
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, 'displayName' | 'bio' | 'tagline' | 'avatarUrl' | 'avatarColor' | 'favoriteAuthor' | 'favoriteBook' | 'memberSince'>>) => void;
  rateBook: (bookId: string, rating: Rating, hotTake?: string, vibeTags?: string[], format?: BookFormat) => void;
  setBookStatus: (bookId: string, status: BookStatus, progress?: number, hotTake?: string) => void;
  removeBook: (bookId: string) => void;
  voteForBook: (clubBookId: string) => void;
  unvoteBook: (clubBookId: string) => void;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  addBook: (book: Book) => void;
  getUserBook: (bookId: string, userId?: string) => UserBook | undefined;
  getBook: (bookId: string) => Book | undefined;
  getUser: (userId: string) => User | undefined;
  getUserBooks: (userId: string) => UserBook[];
  // Swap / Borrow
  addSwapBook: (bookId: string, note?: string) => void;
  removeSwapBook: (swapBookId: string) => void;
  requestBorrow: (swapBookId: string) => void;
  cancelBorrowRequest: (swapBookId: string) => void;
  acceptBorrow: (swapBookId: string) => void;
  returnBook: (swapBookId: string) => void;
  addWishRequest: (bookId: string, note?: string) => void;
  removeWishRequest: (requestId: string) => void;
  fulfillWishRequest: (requestId: string) => void;
  // Events
  rsvpEvent: (eventId: string, status: 'yes' | 'maybe' | 'no') => void;
  setEventBook: (eventId: string, bookId: string) => void;
  addEvent: (title: string, date: string, time?: string, location?: string, description?: string, host?: string, bookId?: string) => Promise<string | null>;
  updateEvent: (eventId: string, updates: Partial<Pick<ClubEvent, 'title' | 'date' | 'time' | 'location' | 'description' | 'host' | 'bookId'>>) => void;
  deleteEvent: (eventId: string) => void;
  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: number;
  // Reactions
  toggleReaction: (feedItemId: string, emoji: string) => void;
  // Recommendations
  recommendBook: (bookId: string, toUserId: string) => void;
  setRecommendedBy: (bookId: string, recommendedByUserId: string) => void;
  // Club management
  nominateBook: (bookId: string) => void;
  removeNomination: (clubBookId: string) => void;
  setClubBookStatus: (clubBookId: string, status: ClubBookStatus) => void;
  addPastClubBook: (bookId: string, startDate: string, host?: string, cakeNote?: string, editorNote?: string, cakeImageUrl?: string) => void;
  updateClubBookMeta: (clubBookId: string, host?: string, cakeNote?: string, editorNote?: string, cakeImageUrl?: string, startDate?: string) => void;
  // Profile setup (for new invited users)
  needsProfileSetup: boolean;
  completeProfileSetup: (displayName: string, username: string, avatarColor: string) => Promise<void>;
}

// ─── Initial / reset state ─────────────────────────────────────────────────────

const LOGGED_OUT_STATE: AppState = {
  currentUser: null,
  users: [],
  books: [],
  userBooks: [],
  clubBooks: [],
  feedItems: [],
  swapBooks: [],
  swapRequests: [],
  events: [],
  notifications: MOCK_NOTIFICATIONS,
  loading: false,
  initialized: true,
  needsProfileSetup: false,
};

// Fire-and-forget helper: converts any PromiseLike (Supabase query builder) to a real Promise
// so we can handle errors without TypeScript complaining about missing .catch()
const bg = (q: PromiseLike<unknown>): Promise<void> =>
  Promise.resolve(q).then(() => {}, err => console.error('One More Chapter DB:', err));

// ─── Load all data from Supabase ────────────────────────────────────────────────

async function loadAllData(
  authUserId: string,
  setState: React.Dispatch<React.SetStateAction<AppState>>,
) {
  setState(s => ({ ...s, loading: true }));
  try {
    // Run all queries in parallel; use allSettled so one failure doesn't block the rest
    const [
      profilesResult,
      booksResult,
      userBooksResult,
      clubBooksResult,
      votesResult,
      followsResult,
      swapBooksResult,
      swapRequestsResult,
      eventsResult,
      rsvpsResult,
    ] = await Promise.allSettled([
      supabase.from('profiles').select('*'),
      supabase.from('books').select('*'),
      supabase.from('user_books').select('*'),
      supabase.from('club_books').select('*'),
      supabase.from('votes').select('*'),
      supabase.from('follows').select('*'),
      supabase.from('swap_books').select('*'),
      supabase.from('swap_requests').select('*'),
      supabase.from('events').select('*').order('date', { ascending: true }),
      supabase.from('event_rsvps').select('*'),
    ]);

    const ok = <T,>(r: PromiseSettledResult<{ data: T[] | null; error: unknown }>): T[] =>
      r.status === 'fulfilled' && !r.value.error ? (r.value.data ?? []) : [];

    const profiles     = ok<any>(profilesResult);
    const booksRaw     = ok<any>(booksResult);
    const userBooksRaw = ok<any>(userBooksResult);
    const clubBooksRaw = ok<any>(clubBooksResult);
    const votesRaw     = ok<any>(votesResult);
    const followsRaw   = ok<any>(followsResult);
    const swapBooksRaw = ok<any>(swapBooksResult);
    const swapRequestsRaw = ok<any>(swapRequestsResult);
    const eventsRaw = ok<any>(eventsResult);
    const rsvpsRaw  = ok<any>(rsvpsResult);

    // Map profiles → User
    const users: User[] = profiles.map((p: any) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      bio: p.bio ?? '',
      tagline: p.tagline ?? '',
      avatarColor: p.avatar_color ?? '#C4603B',
      avatarInitials: p.avatar_initials,
      avatarUrl: p.avatar_url ?? undefined,
      favoriteAuthor: p.favorite_author ?? undefined,
      favoriteBook: p.favorite_book ?? undefined,
      following: followsRaw.filter((f: any) => f.follower_id === p.id).map((f: any) => f.following_id),
      followers: followsRaw.filter((f: any) => f.following_id === p.id).map((f: any) => f.follower_id),
      joinedDate: p.created_at?.split('T')[0] ?? '',
      memberSince: p.member_since ?? undefined,
      isAdmin: p.is_admin ?? false,
    }));

    // Map books — if cover_url is missing in the DB, reconstruct it from the
    // Google Books volume ID. All books in this app come from the Google Books
    // API so their IDs are valid volume IDs. If the image doesn't exist,
    // BookCover's onError handler will fall back to the styled spine placeholder.
    const gbCoverUrl = (id: string) =>
      `https://books.google.com/books/content?id=${id}&printsec=frontcover&img=1&zoom=2&source=gbs_api`;

    const books: Book[] = booksRaw.map((b: any) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      coverUrl: b.cover_url ?? gbCoverUrl(b.id),
      description: b.description ?? '',
      publishedYear: b.published_year ?? 0,
      genre: b.genre ?? 'Fiction',
      pageCount: b.page_count ?? 0,
    }));

    // Map user_books
    const userBooks: UserBook[] = userBooksRaw.map((ub: any) => ({
      id: ub.id,
      userId: ub.user_id,
      bookId: ub.book_id,
      status: ub.status as BookStatus,
      rating: ub.rating as Rating | undefined ?? undefined,
      hotTake: ub.hot_take ?? undefined,
      vibeTags: ub.vibe_tags ?? [],
      progress: ub.progress ?? undefined,
      dateAdded: ub.date_added ?? new Date().toISOString().split('T')[0],
      dateRead: ub.date_read ?? undefined,
    }));

    // Build feed from user_books sorted by updated_at desc
    const feedItems: FeedItem[] = [...userBooksRaw]
      .sort((a: any, b: any) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
      .slice(0, 60)
      .map((ub: any) => ({
        id: `feed_${ub.id}`,
        userId: ub.user_id,
        type: (ub.status === 'read' ? 'rated'
          : ub.status === 'currently_reading' ? 'started_reading'
          : 'added_to_list') as FeedItem['type'],
        bookId: ub.book_id,
        rating: ub.rating as Rating | undefined ?? undefined,
        hotTake: ub.hot_take ?? undefined,
        timestamp: ub.updated_at ?? new Date().toISOString(),
      }));

    // Map club_books with their vote arrays
    const clubBooks: ClubBook[] = clubBooksRaw.map((cb: any) => ({
      id: cb.id,
      bookId: cb.book_id,
      status: cb.status,
      addedBy: cb.added_by ?? '',
      startDate: cb.start_date ?? undefined,
      endDate: cb.end_date ?? undefined,
      votes: votesRaw.filter((v: any) => v.club_book_id === cb.id).map((v: any) => v.user_id),
      host: cb.host ?? undefined,
      cakeNote: cb.cake_note ?? undefined,
      cakeImageUrl: cb.cake_image_url ?? undefined,
      editorNote: cb.editor_note ?? undefined,
    }));

    // Map swap_books (table may not exist yet → falls back to empty)
    const swapBooks: SwapBook[] = swapBooksRaw.map((sb: any) => ({
      id: sb.id,
      userId: sb.user_id,
      bookId: sb.book_id,
      note: sb.note ?? undefined,
      status: sb.status,
      requestedBy: sb.requested_by ?? undefined,
      borrowedAt: sb.borrowed_at ?? undefined,
      createdAt: sb.created_at?.split('T')[0] ?? new Date().toISOString().split('T')[0],
    }));

    // Map swap_requests (table may not exist yet → falls back to empty)
    const swapRequests: SwapRequest[] = swapRequestsRaw.map((r: any) => ({
      id: r.id,
      bookId: r.book_id,
      requesterId: r.requester_id,
      note: r.note ?? undefined,
      fulfilled: r.fulfilled ?? false,
      fulfilledBy: r.fulfilled_by ?? undefined,
      createdAt: r.created_at?.split('T')[0] ?? new Date().toISOString().split('T')[0],
    }));

    // Map events
    const events: ClubEvent[] = eventsRaw.map((e: any) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time ?? '',
      location: e.location ?? undefined,
      bookId: e.book_id ?? undefined,
      description: e.description ?? undefined,
      host: e.host ?? undefined,
      rsvps: rsvpsRaw
        .filter((r: any) => r.event_id === e.id)
        .map((r: any) => ({ userId: r.user_id, status: r.status as 'yes' | 'maybe' | 'no' })),
      createdBy: e.created_by ?? '',
    }));

    const currentUser = users.find(u => u.id === authUserId) ?? null;
    // Detect newly invited users who haven't completed their profile yet
    const currentUserProfile = profiles.find((p: any) => p.id === authUserId);
    const needsProfileSetup = currentUserProfile ? !(currentUserProfile.profile_complete ?? false) : false;

    setState(s => ({
      ...s,
      users,
      books,
      userBooks,
      clubBooks,
      feedItems,
      swapBooks,
      swapRequests,
      events,
      currentUser,
      needsProfileSetup,
      loading: false,
      initialized: true,
    }));
  } catch (err) {
    console.error('One More Chapter: failed to load data from Supabase', err);
    setState(s => ({ ...s, loading: false, initialized: true }));
  }
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: [],
    books: [],
    userBooks: [],
    clubBooks: [],
    feedItems: [],
    swapBooks: [],
    swapRequests: [],
    events: [],
    notifications: MOCK_NOTIFICATIONS,
    loading: true,
    initialized: false,
    needsProfileSetup: false,
  });

  // ── Auth listener ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // User signed out
        if (event === 'SIGNED_OUT') {
          setState(s => ({ ...LOGGED_OUT_STATE, events: s.events, notifications: s.notifications }));
          return;
        }

        // Session established (page load with existing session, or magic link click)
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
          // New-user registration: apply pending profile stored before magic link was sent
          const pendingRaw = localStorage.getItem('omc_pending_profile');
          if (pendingRaw) {
            try {
              const pending = JSON.parse(pendingRaw);
              await supabase.from('profiles').update({
                display_name: pending.displayName,
                username: pending.username,
                avatar_color: pending.avatarColor,
                avatar_initials: pending.avatarInitials,
                profile_complete: true,
              }).eq('id', session.user.id);
              if (pending.inviteCode) {
                await consumeInviteCode(pending.inviteCode, session.user.id);
              }
            } catch (e) {
              console.error('One More Chapter: could not apply pending profile', e);
            } finally {
              localStorage.removeItem('omc_pending_profile');
            }
          }
          await loadAllData(session.user.id, setState);
          return;
        }

        // INITIAL_SESSION with no session = not logged in
        if (event === 'INITIAL_SESSION' && !session) {
          setState(s => ({ ...s, loading: false, initialized: true }));
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────────
  const unreadCount = state.notifications.filter(
    n => !n.read && n.recipientId === state.currentUser?.id
  ).length;

  // ── Auth actions ──────────────────────────────────────────────────────────────
  const logout = () => {
    supabaseSignOut().catch(console.error);
  };

  // ── Profile ───────────────────────────────────────────────────────────────────
  const updateProfile = (updates: Partial<Pick<User, 'displayName' | 'bio' | 'tagline' | 'avatarUrl' | 'avatarColor' | 'favoriteAuthor' | 'favoriteBook' | 'memberSince'>>) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    setState(s => {
      const updated = { ...s.currentUser!, ...updates };
      return {
        ...s,
        currentUser: updated,
        users: s.users.map(u => u.id === updated.id ? updated : u),
      };
    });
    // Persist columns that exist in the DB
    bg(supabase.from('profiles').update({
      ...(updates.displayName    !== undefined && { display_name:    updates.displayName }),
      ...(updates.bio            !== undefined && { bio:             updates.bio }),
      ...(updates.avatarColor    !== undefined && { avatar_color:    updates.avatarColor }),
      ...(updates.avatarUrl      !== undefined && { avatar_url:      updates.avatarUrl }),
      ...(updates.favoriteAuthor !== undefined && { favorite_author: updates.favoriteAuthor ?? null }),
      ...(updates.favoriteBook   !== undefined && { favorite_book:   updates.favoriteBook ?? null }),
      ...(updates.memberSince    !== undefined && { member_since:    updates.memberSince ?? null }),
    }).eq('id', userId));
    toast.success('Profile saved!');
  };

  // ── Books ─────────────────────────────────────────────────────────────────────

  // Upsert a book into the DB. On conflict (same Google Books ID), update
  // cover_url only when it was previously null so we never lose a working URL.
  // Requires books_update RLS policy: check (auth.uid() is not null).
  const persistBook = (book: Book): Promise<void> =>
    bg(supabase.from('books').upsert({
      id: book.id,
      title: book.title,
      author: book.author,
      cover_url: book.coverUrl ?? null,
      description: book.description,
      published_year: book.publishedYear,
      genre: book.genre,
      page_count: book.pageCount,
    }, { onConflict: 'id' }));

  const addBook = (book: Book) => {
    setState(s => ({
      ...s,
      books: s.books.find(b => b.id === book.id) ? s.books : [...s.books, book],
    }));
    persistBook(book);
  };

  const rateBook = (bookId: string, rating: Rating, hotTake?: string, vibeTags?: string[], format?: BookFormat) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    const now = new Date().toISOString();
    setState(s => {
      const existing = s.userBooks.find(ub => ub.bookId === bookId && ub.userId === userId);
      const updated: UserBook = existing
        ? { ...existing, status: 'read', rating, hotTake, vibeTags, format, dateRead: now.split('T')[0] }
        : { id: `ub_${generateId()}`, userId, bookId, status: 'read', rating, hotTake, vibeTags, format, dateAdded: now.split('T')[0], dateRead: now.split('T')[0] };
      const newUserBooks = existing
        ? s.userBooks.map(ub => (ub.bookId === bookId && ub.userId === userId ? updated : ub))
        : [...s.userBooks, updated];
      const feedItem: FeedItem = { id: `f_${generateId()}`, userId, type: 'rated', bookId, rating, hotTake, timestamp: now };
      return { ...s, userBooks: newUserBooks, feedItems: [feedItem, ...s.feedItems] };
    });
    toast.success('Rating saved!');
    // Ensure book row exists first, then upsert user_book
    const book = state.books.find(b => b.id === bookId);
    const bookUpsert = book ? persistBook(book) : Promise.resolve();
    bookUpsert.then(() =>
      bg(supabase.from('user_books').upsert({
        user_id: userId,
        book_id: bookId,
        status: 'read',
        rating,
        hot_take: hotTake ?? null,
        vibe_tags: vibeTags ?? [],
        date_read: now.split('T')[0],
        updated_at: now,
      }, { onConflict: 'user_id,book_id' }))
    );
  };

  const setBookStatus = (bookId: string, status: BookStatus, progress?: number, hotTake?: string) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    const now = new Date().toISOString();
    setState(s => {
      const existing = s.userBooks.find(ub => ub.bookId === bookId && ub.userId === userId);
      const updated: UserBook = existing
        ? { ...existing, status, progress, ...(hotTake !== undefined ? { hotTake } : {}) }
        : { id: `ub_${generateId()}`, userId, bookId, status, progress, hotTake, dateAdded: now.split('T')[0] };
      const newUserBooks = existing
        ? s.userBooks.map(ub => (ub.bookId === bookId && ub.userId === userId ? updated : ub))
        : [...s.userBooks, updated];
      const type = status === 'currently_reading' ? 'started_reading' as const : 'added_to_list' as const;
      const feedItem: FeedItem = { id: `f_${generateId()}`, userId, type, bookId, timestamp: now };
      return { ...s, userBooks: newUserBooks, feedItems: [feedItem, ...s.feedItems] };
    });
    const msg = status === 'currently_reading' ? 'Now reading!' : 'Added to your shelf!';
    toast.success(msg);
    const book = state.books.find(b => b.id === bookId);
    const bookUpsert = book ? persistBook(book) : Promise.resolve();
    bookUpsert.then(() =>
      bg(supabase.from('user_books').upsert({
        user_id: userId,
        book_id: bookId,
        status,
        progress: progress ?? null,
        hot_take: hotTake ?? null,
        updated_at: now,
      }, { onConflict: 'user_id,book_id' }))
    );
  };

  const removeBook = (bookId: string) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    setState(s => ({
      ...s,
      userBooks: s.userBooks.filter(ub => !(ub.bookId === bookId && ub.userId === userId)),
    }));
    toast.info('Removed from shelf');
    bg(supabase.from('user_books').delete()
      .eq('user_id', userId)
      .eq('book_id', bookId));
  };

  // ── Club / Voting ─────────────────────────────────────────────────────────────

  const voteForBook = (clubBookId: string) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    setState(s => ({
      ...s,
      clubBooks: s.clubBooks.map(cb =>
        cb.id === clubBookId && !cb.votes.includes(userId)
          ? { ...cb, votes: [...cb.votes, userId] }
          : cb
      ),
    }));
    toast.success('Vote cast!');
    bg(supabase.from('votes')
      .insert({ user_id: userId, club_book_id: clubBookId }));
  };

  const unvoteBook = (clubBookId: string) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    setState(s => ({
      ...s,
      clubBooks: s.clubBooks.map(cb =>
        cb.id === clubBookId
          ? { ...cb, votes: cb.votes.filter(id => id !== userId) }
          : cb
      ),
    }));
    toast.info('Vote removed');
    bg(supabase.from('votes').delete()
      .eq('user_id', userId)
      .eq('club_book_id', clubBookId));
  };

  const nominateBook = (bookId: string) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    // Optimistic add with temp ID; replaced once Supabase returns the real UUID
    const tempId = `temp_${Math.random().toString(36).slice(2)}`;
    setState(s => ({ ...s, clubBooks: [...s.clubBooks, { id: tempId, bookId, status: 'nominated', addedBy: userId, votes: [] }] }));
    toast.success('Book nominated!');
    supabase.from('club_books').insert({ book_id: bookId, status: 'nominated', added_by: userId })
      .select('id').single()
      .then(({ data, error }) => {
        if (!error && data) {
          setState(s => ({ ...s, clubBooks: s.clubBooks.map(cb => cb.id === tempId ? { ...cb, id: data.id } : cb) }));
        } else {
          console.error('nominateBook error:', error);
          setState(s => ({ ...s, clubBooks: s.clubBooks.filter(cb => cb.id !== tempId) }));
          toast.error('Nomination failed — try again');
        }
      });
  };

  const removeNomination = (clubBookId: string) => {
    setState(s => ({ ...s, clubBooks: s.clubBooks.filter(cb => cb.id !== clubBookId) }));
    bg(supabase.from('club_books').delete().eq('id', clubBookId));
  };

  const setClubBookStatus = (clubBookId: string, status: ClubBookStatus) => {
    const now = new Date().toISOString().split('T')[0];
    setState(s => ({
      ...s,
      clubBooks: s.clubBooks.map(cb => {
        if (cb.id !== clubBookId) return cb;
        // When making it the current pick, set startDate; when marking read, set endDate
        if (status === 'reading') return { ...cb, status, startDate: now };
        if (status === 'read')    return { ...cb, status, endDate: now };
        return { ...cb, status };
      }),
    }));
    const updates: Record<string, unknown> = { status };
    if (status === 'reading') updates.start_date = now;
    if (status === 'read')    updates.end_date = now;
    bg(supabase.from('club_books').update(updates).eq('id', clubBookId));
  };

  const addPastClubBook = (bookId: string, startDate: string, host?: string, cakeNote?: string, editorNote?: string, cakeImageUrl?: string) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    const tempId = `temp_${Math.random().toString(36).slice(2)}`;
    const tempEntry: ClubBook = { id: tempId, bookId, status: 'read', addedBy: userId, startDate, endDate: startDate, votes: [], host, cakeNote, cakeImageUrl, editorNote };
    setState(s => ({ ...s, clubBooks: [...s.clubBooks, tempEntry] }));
    supabase.from('club_books').insert({
      book_id: bookId, status: 'read', added_by: userId,
      start_date: startDate, end_date: startDate,
      host: host ?? null, cake_note: cakeNote ?? null,
      cake_image_url: cakeImageUrl ?? null, editor_note: editorNote ?? null,
    }).select('id').single().then(({ data, error }) => {
      if (!error && data) {
        setState(s => ({ ...s, clubBooks: s.clubBooks.map(cb => cb.id === tempId ? { ...cb, id: data.id } : cb) }));
      } else {
        setState(s => ({ ...s, clubBooks: s.clubBooks.filter(cb => cb.id !== tempId) }));
      }
    });
  };

  const updateClubBookMeta = (clubBookId: string, host?: string, cakeNote?: string, editorNote?: string, cakeImageUrl?: string, startDate?: string) => {
    setState(s => ({
      ...s,
      clubBooks: s.clubBooks.map(cb =>
        cb.id === clubBookId
          ? { ...cb, host, cakeNote, cakeImageUrl, editorNote, ...(startDate ? { startDate } : {}) }
          : cb
      ),
    }));
    bg(supabase.from('club_books').update({
      host: host ?? null,
      cake_note: cakeNote ?? null,
      cake_image_url: cakeImageUrl ?? null,
      editor_note: editorNote ?? null,
      ...(startDate ? { start_date: startDate, end_date: startDate } : {}),
    }).eq('id', clubBookId));
  };

  // ── Social ────────────────────────────────────────────────────────────────────

  const followUser = (userId: string) => {
    if (!state.currentUser) return;
    const myId = state.currentUser.id;
    const name = state.users.find(u => u.id === userId)?.displayName ?? 'them';
    setState(s => ({
      ...s,
      currentUser: s.currentUser ? { ...s.currentUser, following: [...s.currentUser.following, userId] } : null,
      users: s.users.map(u => {
        if (u.id === myId) return { ...u, following: [...u.following, userId] };
        if (u.id === userId) return { ...u, followers: [...u.followers, myId] };
        return u;
      }),
    }));
    toast.success(`Following ${name}!`);
    bg(supabase.from('follows')
      .insert({ follower_id: myId, following_id: userId }));
  };

  const unfollowUser = (userId: string) => {
    if (!state.currentUser) return;
    const myId = state.currentUser.id;
    const name = state.users.find(u => u.id === userId)?.displayName ?? 'them';
    setState(s => ({
      ...s,
      currentUser: s.currentUser ? { ...s.currentUser, following: s.currentUser.following.filter(id => id !== userId) } : null,
      users: s.users.map(u => {
        if (u.id === myId) return { ...u, following: u.following.filter(id => id !== userId) };
        if (u.id === userId) return { ...u, followers: u.followers.filter(id => id !== myId) };
        return u;
      }),
    }));
    toast.info(`Unfollowed ${name}`);
    bg(supabase.from('follows').delete()
      .eq('follower_id', myId)
      .eq('following_id', userId));
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const getUserBook = (bookId: string, userId?: string) =>
    state.userBooks.find(ub => ub.bookId === bookId && ub.userId === (userId ?? state.currentUser?.id));
  const getBook = (bookId: string) => state.books.find(b => b.id === bookId);
  const getUser = (userId: string) => state.users.find(u => u.id === userId);
  const getUserBooks = (userId: string) => state.userBooks.filter(ub => ub.userId === userId);

  // ── Swap / Borrow (in-memory + background Supabase when tables exist) ─────────

  const addSwapBook = (bookId: string, note?: string) => {
    if (!state.currentUser) return;
    const newSwap: SwapBook = {
      id: `sb_${generateId()}`,
      userId: state.currentUser.id,
      bookId,
      note,
      status: 'available',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setState(s => ({ ...s, swapBooks: [...s.swapBooks, newSwap] }));
    bg(supabase.from('swap_books').insert({
      user_id: state.currentUser!.id,
      book_id: bookId,
      note: note ?? null,
      status: 'available',
    })); // silently ignored if table doesn't exist yet
  };

  const removeSwapBook = (swapBookId: string) => {
    setState(s => ({ ...s, swapBooks: s.swapBooks.filter(sb => sb.id !== swapBookId) }));
    bg(supabase.from('swap_books').delete().eq('id', swapBookId));
  };

  const requestBorrow = (swapBookId: string) => {
    if (!state.currentUser) return;
    const borrower = state.currentUser;
    const swapBook = state.swapBooks.find(sb => sb.id === swapBookId);
    setState(s => {
      const newSwapBooks = s.swapBooks.map(sb =>
        sb.id === swapBookId ? { ...sb, status: 'requested' as const, requestedBy: borrower.id } : sb
      );
      if (!swapBook) return { ...s, swapBooks: newSwapBooks };
      const book = s.books.find(b => b.id === swapBook.bookId);
      const notif: Notification = {
        id: `notif_${generateId()}`,
        recipientId: swapBook.userId,
        type: 'borrow_request',
        fromUserId: borrower.id,
        bookId: swapBook.bookId,
        text: `${borrower.displayName} wants to borrow ${book?.title ?? 'your book'}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      return { ...s, swapBooks: newSwapBooks, notifications: [notif, ...s.notifications] };
    });
    bg(supabase.from('swap_books').update({ status: 'requested', requested_by: borrower.id }).eq('id', swapBookId));
  };

  const cancelBorrowRequest = (swapBookId: string) => {
    setState(s => ({
      ...s,
      swapBooks: s.swapBooks.map(sb =>
        sb.id === swapBookId ? { ...sb, status: 'available', requestedBy: undefined } : sb
      ),
    }));
    bg(supabase.from('swap_books').update({ status: 'available', requested_by: null }).eq('id', swapBookId));
  };

  const acceptBorrow = (swapBookId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setState(s => ({
      ...s,
      swapBooks: s.swapBooks.map(sb =>
        sb.id === swapBookId ? { ...sb, status: 'borrowed', borrowedAt: today } : sb
      ),
    }));
    bg(supabase.from('swap_books').update({ status: 'borrowed', borrowed_at: today }).eq('id', swapBookId));
  };

  const returnBook = (swapBookId: string) => {
    setState(s => ({
      ...s,
      swapBooks: s.swapBooks.map(sb =>
        sb.id === swapBookId ? { ...sb, status: 'available', requestedBy: undefined, borrowedAt: undefined } : sb
      ),
    }));
    bg(supabase.from('swap_books').update({ status: 'available', requested_by: null, borrowed_at: null }).eq('id', swapBookId));
  };

  const addWishRequest = (bookId: string, note?: string) => {
    if (!state.currentUser) return;
    const newReq: SwapRequest = {
      id: `sr_${generateId()}`,
      bookId,
      requesterId: state.currentUser.id,
      note,
      fulfilled: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setState(s => ({ ...s, swapRequests: [...s.swapRequests, newReq] }));
    bg(supabase.from('swap_requests').insert({
      book_id: bookId,
      requester_id: state.currentUser!.id,
      note: note ?? null,
      fulfilled: false,
    }));
  };

  const removeWishRequest = (requestId: string) => {
    setState(s => ({ ...s, swapRequests: s.swapRequests.filter(r => r.id !== requestId) }));
    bg(supabase.from('swap_requests').delete().eq('id', requestId));
  };

  const fulfillWishRequest = (requestId: string) => {
    if (!state.currentUser) return;
    const fromUser = state.currentUser;
    const req = state.swapRequests.find(r => r.id === requestId);
    setState(s => {
      const newRequests = s.swapRequests.map(r =>
        r.id === requestId ? { ...r, fulfilled: true, fulfilledBy: fromUser.id } : r
      );
      if (!req) return { ...s, swapRequests: newRequests };
      const book = s.books.find(b => b.id === req.bookId);
      const notif: Notification = {
        id: `notif_${generateId()}`,
        recipientId: req.requesterId,
        type: 'borrow_accepted',
        fromUserId: fromUser.id,
        bookId: req.bookId,
        text: `${fromUser.displayName} can lend you ${book?.title ?? 'that book'} 📖`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      return { ...s, swapRequests: newRequests, notifications: [notif, ...s.notifications] };
    });
    bg(supabase.from('swap_requests').update({ fulfilled: true, fulfilled_by: fromUser.id }).eq('id', requestId));
  };

  // ── Events ────────────────────────────────────────────────────────────────────

  const rsvpEvent = (eventId: string, status: 'yes' | 'maybe' | 'no') => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    setState(s => ({
      ...s,
      events: s.events.map(ev => {
        if (ev.id !== eventId) return ev;
        const existing = ev.rsvps.find(r => r.userId === userId);
        const rsvps = existing
          ? ev.rsvps.map(r => r.userId === userId ? { ...r, status } : r)
          : [...ev.rsvps, { userId, status }];
        return { ...ev, rsvps };
      }),
    }));
    bg(supabase.from('event_rsvps').upsert(
      { event_id: eventId, user_id: userId, status },
      { onConflict: 'event_id,user_id' }
    ));
  };

  const setEventBook = (eventId: string, bookId: string) => {
    setState(s => ({
      ...s,
      events: s.events.map(ev => ev.id === eventId ? { ...ev, bookId } : ev),
    }));
    bg(supabase.from('events').update({ book_id: bookId }).eq('id', eventId));
  };

  const updateEvent = (eventId: string, updates: Partial<Pick<ClubEvent, 'title' | 'date' | 'time' | 'location' | 'description' | 'host' | 'bookId'>>) => {
    setState(s => ({
      ...s,
      events: s.events.map(ev => ev.id === eventId ? { ...ev, ...updates } : ev),
    }));
    const dbUp: Record<string, unknown> = {};
    if (updates.title       !== undefined) dbUp.title       = updates.title;
    if (updates.date        !== undefined) dbUp.date        = updates.date;
    if (updates.time        !== undefined) dbUp.time        = updates.time;
    if (updates.location    !== undefined) dbUp.location    = updates.location ?? null;
    if (updates.description !== undefined) dbUp.description = updates.description ?? null;
    if (updates.host        !== undefined) dbUp.host        = updates.host ?? null;
    if (updates.bookId      !== undefined) dbUp.book_id     = updates.bookId ?? null;
    bg(supabase.from('events').update(dbUp).eq('id', eventId));
  };

  const addEvent = async (title: string, date: string, time?: string, location?: string, description?: string, host?: string, bookId?: string): Promise<string | null> => {
    if (!state.currentUser) return 'Not logged in';
    const { data, error } = await supabase.from('events').insert({
      title, date,
      time: time ?? '',
      location: location ?? null,
      description: description ?? null,
      host: host ?? null,
      book_id: bookId ?? null,
      created_by: state.currentUser.id,
    }).select().single();
    if (error) return error.message;
    if (data) {
      const newEvent: ClubEvent = {
        id: data.id, title: data.title, date: data.date,
        time: data.time ?? '', location: data.location ?? undefined,
        description: data.description ?? undefined, host: data.host ?? undefined,
        bookId: data.book_id ?? undefined, rsvps: [], createdBy: data.created_by ?? '',
      };
      setState(s => ({ ...s, events: [...s.events, newEvent].sort((a, b) => a.date.localeCompare(b.date)) }));
    }
    return null;
  };

  const deleteEvent = (eventId: string) => {
    setState(s => ({ ...s, events: s.events.filter(ev => ev.id !== eventId) }));
    bg(supabase.from('events').delete().eq('id', eventId));
  };

  // ── Notifications ─────────────────────────────────────────────────────────────

  const markNotificationRead = (id: string) => {
    setState(s => ({
      ...s,
      notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  };

  const markAllNotificationsRead = () => {
    if (!state.currentUser) return;
    const uid = state.currentUser.id;
    setState(s => ({
      ...s,
      notifications: s.notifications.map(n => n.recipientId === uid ? { ...n, read: true } : n),
    }));
  };

  // ── Reactions ─────────────────────────────────────────────────────────────────

  const toggleReaction = (feedItemId: string, emoji: string) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    setState(s => ({
      ...s,
      feedItems: s.feedItems.map(item => {
        if (item.id !== feedItemId) return item;
        const reactions = item.reactions ?? [];
        const existing = reactions.find(r => r.emoji === emoji);
        if (existing) {
          const hasReacted = existing.userIds.includes(userId);
          const updated = hasReacted
            ? existing.userIds.filter(id => id !== userId)
            : [...existing.userIds, userId];
          const newReactions = updated.length === 0
            ? reactions.filter(r => r.emoji !== emoji)
            : reactions.map(r => r.emoji === emoji ? { ...r, userIds: updated } : r);
          return { ...item, reactions: newReactions };
        }
        return { ...item, reactions: [...reactions, { emoji, userIds: [userId] }] };
      }),
    }));
  };

  // ── Recommendations ───────────────────────────────────────────────────────────

  const setRecommendedBy = (bookId: string, recommendedByUserId: string) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    setState(s => ({
      ...s,
      userBooks: s.userBooks.map(ub =>
        ub.bookId === bookId && ub.userId === userId
          ? { ...ub, recommendedBy: recommendedByUserId }
          : ub
      ),
    }));
    // Persists when the recommended_by column exists in user_books
    bg(supabase.from('user_books')
      .update({ recommended_by: recommendedByUserId })
      .eq('user_id', userId)
      .eq('book_id', bookId));
  };

  const recommendBook = (bookId: string, toUserId: string) => {
    if (!state.currentUser) return;
    const fromUser = state.currentUser;
    const book = state.books.find(b => b.id === bookId);
    if (!book) return;
    const notif: Notification = {
      id: `notif_${generateId()}`,
      recipientId: toUserId,
      type: 'recommended',
      fromUserId: fromUser.id,
      bookId,
      text: `${fromUser.displayName} recommended ${book.title} to you`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setState(s => ({ ...s, notifications: [notif, ...s.notifications] }));
  };

  // ── Profile setup (for newly invited users) ───────────────────────────────────
  const completeProfileSetup = async (displayName: string, username: string, avatarColor: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const initials = displayName.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    await supabase.from('profiles').update({
      display_name: displayName.trim(),
      username: username.trim().toLowerCase(),
      avatar_color: avatarColor,
      avatar_initials: initials,
      profile_complete: true,
    }).eq('id', session.user.id);
    await loadAllData(session.user.id, setState);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppContext.Provider value={{
      ...state,
      logout,
      updateProfile,
      rateBook,
      setBookStatus,
      removeBook,
      voteForBook,
      unvoteBook,
      followUser,
      unfollowUser,
      addBook,
      getUserBook,
      getBook,
      getUser,
      getUserBooks,
      addSwapBook,
      removeSwapBook,
      requestBorrow,
      cancelBorrowRequest,
      acceptBorrow,
      returnBook,
      addWishRequest,
      removeWishRequest,
      fulfillWishRequest,
      rsvpEvent,
      setEventBook,
      addEvent,
      updateEvent,
      deleteEvent,
      markNotificationRead,
      markAllNotificationsRead,
      unreadCount,
      toggleReaction,
      recommendBook,
      setRecommendedBy,
      nominateBook,
      removeNomination,
      setClubBookStatus,
      addPastClubBook,
      updateClubBookMeta,
      completeProfileSetup,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
