import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import BookCover from '../components/BookCover';
import UserAvatar from '../components/UserAvatar';
import RatingModal from '../components/RatingModal';
import { ratingEmoji, ratingBg, ratingLabel } from '../lib/utils';
import { searchGoogleBooks } from '../lib/googleBooks';
import { supabase } from '../lib/supabase';
import type { ClubEvent, ClubBook, Book } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isUpcoming(dateStr: string) {
  return new Date(dateStr + 'T23:59:59') >= new Date();
}

const RSVP_OPTIONS = [
  { status: 'yes' as const, label: 'Going', emoji: '✓' },
  { status: 'maybe' as const, label: 'Maybe', emoji: '?' },
  { status: 'no' as const, label: "Can't", emoji: '✕' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => currentYear - i);

// ─── Cake image resize helper ────────────────────────────────────────────────

const CAKE_SIZES = [
  { label: 'Small',  dim: 600  },
  { label: 'Medium', dim: 1000 },
  { label: 'Full',   dim: 0    }, // 0 = no resize
] as const;

interface ResizeResult { blob: Blob; previewUrl: string; width: number; height: number; wasResized: boolean; }

// FileReader-based approach avoids URL revocation timing issues
async function resizeCakeImage(file: File, maxDim: number): Promise<ResizeResult> {
  // Step 1: read file as data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Step 2: load into image to get natural dimensions
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload  = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const nw = img.naturalWidth;
  const nh = img.naturalHeight;

  // No resize needed
  if (maxDim === 0 || (nw <= maxDim && nh <= maxDim)) {
    return { blob: file, previewUrl: dataUrl, width: nw, height: nh, wasResized: false };
  }

  // Resize via canvas
  const scale = Math.min(maxDim / nw, maxDim / nh);
  const w = Math.round(nw * scale);
  const h = Math.round(nh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
  const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const byteStr = atob(resizedDataUrl.split(',')[1]);
  const arr = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
  return { blob: new Blob([arr], { type: 'image/jpeg' }), previewUrl: resizedDataUrl, width: w, height: h, wasResized: true };
}

// ─── Club rating bar ──────────────────────────────────────────────────────────

function ClubRatingBar({ ratings }: { ratings: { rating?: string }[] }) {
  const rated = ratings.filter(r => r.rating);
  if (rated.length === 0) return null;
  const loved = rated.filter(r => r.rating === 'thumbs_up').length;
  const soso  = rated.filter(r => r.rating === 'so_so').length;
  const total = rated.length;
  const lovedPct = Math.round((loved / total) * 100);
  const sosoPct  = Math.round((soso  / total) * 100);
  const nopePct  = 100 - lovedPct - sosoPct;
  const nope = total - loved - soso;
  let verdict = '';
  if (lovedPct >= 75) verdict = 'The club loved this one';
  else if (lovedPct >= 50) verdict = 'Mostly a hit';
  else if (lovedPct >= 25) verdict = 'Mixed feelings';
  else verdict = 'The club was divided';
  return (
    <div className="px-4 pb-4">
      <p className="text-xs font-semibold text-earth-500 mb-2">Club rating</p>
      <div className="h-2.5 rounded-full overflow-hidden flex gap-px mb-2">
        {lovedPct > 0 && <div className="bg-terracotta-500 rounded-l-full" style={{ width: `${lovedPct}%` }} />}
        {sosoPct  > 0 && <div className="bg-earth-300"                     style={{ width: `${sosoPct}%` }} />}
        {nopePct  > 0 && <div className="bg-forest-400 rounded-r-full"     style={{ width: `${nopePct}%` }} />}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          {loved > 0 && <span className="text-terracotta-600 font-medium">👍 {loved}</span>}
          {soso  > 0 && <span className="text-earth-500 font-medium">👉 {soso}</span>}
          {nope  > 0 && <span className="text-forest-600 font-medium">👎 {nope}</span>}
        </div>
        <span className="text-xs text-earth-400 italic">{verdict}</span>
      </div>
    </div>
  );
}

// ─── Pick a book modal ────────────────────────────────────────────────────────

function PickBookModal({ onClose, onSelect }: { onClose: () => void; onSelect: (book: Book) => void }) {
  const { books, addBook } = useApp();
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const googleResults = await searchGoogleBooks(query);
      const mapped: Book[] = googleResults.map(r => ({
        id: r.id, title: r.title, author: r.author,
        coverUrl: r.coverUrl, description: r.description ?? '',
        publishedYear: r.publishedYear ?? 0, genre: 'Fiction', pageCount: r.pageCount ?? 0,
      }));
      const localMatches = books.filter(b =>
        b.title.toLowerCase().includes(query.toLowerCase()) ||
        b.author.toLowerCase().includes(query.toLowerCase())
      );
      const seen = new Set<string>();
      setResults([...localMatches, ...mapped].filter(r => {
        const key = `${r.title.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,30)}|${r.author.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20)}`;
        if (seen.has(key)) return false; seen.add(key); return true;
      }));
    } finally { setSearching(false); }
  }, [query, books]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-earth-100 shrink-0">
          <h2 className="font-serif font-bold text-earth-800 text-lg">Add a book to this meeting</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-earth-100 text-earth-400 text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex gap-2 mb-4">
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Search by title or author…"
              className="flex-1 px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50" autoFocus />
            <button onClick={search} disabled={searching || !query.trim()}
              className="px-4 py-2.5 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 disabled:opacity-50 transition-colors">
              {searching ? '…' : 'Search'}
            </button>
          </div>
          <div className="space-y-2">
            {results.map(book => (
              <button key={book.id} onClick={() => { addBook(book); onSelect(book); onClose(); }}
                className="w-full flex gap-3 items-center p-3 rounded-xl hover:bg-earth-50 transition-colors text-left">
                <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-12 shrink-0 shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-bold text-earth-800 text-sm leading-tight">{book.title}</p>
                  <p className="text-xs text-earth-400 mt-0.5">{book.author}</p>
                </div>
                <span className="text-terracotta-500 text-sm shrink-0">Select →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit/Create event modal ──────────────────────────────────────────────────

function EditEventModal({ event, onClose }: { event?: ClubEvent; onClose: () => void }) {
  const { addEvent, updateEvent, addBook, books } = useApp();
  const isNew = !event;

  // Book search state
  const existingBook = event?.bookId ? books.find(b => b.id === event.bookId) : undefined;
  const [selectedBook, setSelectedBook] = useState<Book | null>(existingBook ?? null);
  const [bookQuery, setBookQuery]       = useState('');
  const [bookResults, setBookResults]   = useState<Book[]>([]);
  const [searching, setSearching]       = useState(false);

  const [date, setDate]         = useState(event?.date ?? '');
  const [time, setTime]         = useState(event?.time ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [host, setHost]         = useState(event?.host ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const searchBooks = useCallback(async () => {
    if (!bookQuery.trim()) return;
    setSearching(true);
    try {
      const googleResults = await searchGoogleBooks(bookQuery);
      const mapped: Book[] = googleResults.map(r => ({
        id: r.id, title: r.title, author: r.author,
        coverUrl: r.coverUrl, description: r.description ?? '',
        publishedYear: r.publishedYear ?? 0, genre: 'Fiction', pageCount: r.pageCount ?? 0,
      }));
      const localMatches = books.filter(b =>
        b.title.toLowerCase().includes(bookQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(bookQuery.toLowerCase())
      );
      const seen = new Set<string>();
      setBookResults([...localMatches, ...mapped].filter(r => {
        const key = `${r.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)}|${r.author.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}`;
        if (seen.has(key)) return false; seen.add(key); return true;
      }));
    } finally { setSearching(false); }
  }, [bookQuery, books]);

  const handleSave = async () => {
    if (!selectedBook || !date) return;
    setSaving(true);

    // Ensure the book exists in DB before saving the event (FK constraint)
    await supabase.from('books').upsert({
      id: selectedBook.id,
      title: selectedBook.title,
      author: selectedBook.author,
      cover_url: selectedBook.coverUrl ?? null,
      description: selectedBook.description ?? '',
      published_year: selectedBook.publishedYear ?? 0,
      genre: selectedBook.genre ?? 'Fiction',
      page_count: selectedBook.pageCount ?? 0,
    }, { onConflict: 'id', ignoreDuplicates: true });

    if (isNew) {
      const err = await addEvent(selectedBook.title, date, time.trim() || undefined, location.trim() || undefined, description.trim() || undefined, host.trim() || undefined, selectedBook.id);
      setSaving(false);
      if (err) { setSaveError(err); return; }
    } else {
      updateEvent(event!.id, {
        title: selectedBook.title, date, time: time.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        host: host.trim() || undefined,
        bookId: selectedBook.id,
      });
      setSaving(false);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-earth-100 shrink-0">
          <h2 className="font-serif font-bold text-earth-800 text-lg">{isNew ? 'New meeting' : 'Edit meeting'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-earth-100 text-earth-400 text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Book picker ── */}
          <div>
            <label className="block text-sm font-semibold text-earth-700 mb-2">📖 What are you reading? *</label>
            {selectedBook ? (
              <div className="flex gap-3 items-center bg-earth-50 rounded-xl p-3 border border-earth-200">
                <BookCover src={selectedBook.coverUrl} title={selectedBook.title} author={selectedBook.author} className="w-14 shrink-0 shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-bold text-earth-800 text-sm leading-tight">{selectedBook.title}</p>
                  <p className="text-xs text-earth-500 mt-0.5">{selectedBook.author}</p>
                </div>
                <button onClick={() => { setSelectedBook(null); setBookResults([]); setBookQuery(''); }}
                  className="text-xs text-terracotta-600 font-medium hover:text-terracotta-700 shrink-0">
                  Change
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    type="text" value={bookQuery} onChange={e => setBookQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchBooks()}
                    placeholder="Search by title or author…"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50"
                    autoFocus
                  />
                  <button onClick={searchBooks} disabled={searching || !bookQuery.trim()}
                    className="px-4 py-2.5 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 disabled:opacity-50 transition-colors">
                    {searching ? '…' : 'Search'}
                  </button>
                </div>
                {bookResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {bookResults.map(book => (
                      <button key={book.id}
                        onClick={() => { addBook(book); setSelectedBook(book); setBookResults([]); setBookQuery(''); }}
                        className="w-full flex gap-3 items-center p-2.5 rounded-xl hover:bg-earth-50 transition-colors text-left">
                        <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-10 shrink-0 shadow-sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-earth-800 text-sm leading-tight truncate">{book.title}</p>
                          <p className="text-xs text-earth-400">{book.author}</p>
                        </div>
                        <span className="text-terracotta-500 text-sm shrink-0">Select →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Date & Time ── */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-earth-700 mb-1.5">📅 Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-earth-700 mb-1.5">🕐 Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-earth-700 mb-1.5">🏠 Who's hosting?</label>
            <input value={host} onChange={e => setHost(e.target.value)} placeholder="e.g. Sarah's place"
              className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-earth-700 mb-1.5">📍 Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Address or 'Zoom'"
              className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-earth-700 mb-1.5">📝 Notes</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Anything the group should know…" rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50 resize-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-earth-100 shrink-0">
          {saveError && (
            <p className="text-xs text-red-500 mb-3 p-2 bg-red-50 rounded-lg">⚠️ {saveError}</p>
          )}
          <button onClick={handleSave} disabled={!selectedBook || !date || saving}
            className="w-full py-3 bg-terracotta-500 text-white rounded-xl font-semibold text-sm hover:bg-terracotta-600 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : isNew ? 'Create meeting' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming event card ──────────────────────────────────────────────────────

function UpcomingEventCard({ event }: { event: ClubEvent }) {
  const navigate = useNavigate();
  const { currentUser, getBook, getUser, rsvpEvent, setEventBook } = useApp();
  const book     = event.bookId ? getBook(event.bookId) : undefined;
  const myRsvp   = currentUser ? event.rsvps.find(r => r.userId === currentUser.id)?.status : undefined;
  const yesCount   = event.rsvps.filter(r => r.status === 'yes').length;
  const maybeCount = event.rsvps.filter(r => r.status === 'maybe').length;
  const [showPickBook, setShowPickBook] = useState(false);
  const [showEdit, setShowEdit]         = useState(false);

  return (
    <div className="bg-white rounded-2xl border-2 border-terracotta-200 p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-12 text-center rounded-xl py-1.5 bg-terracotta-500">
          <p className="text-xs font-medium uppercase tracking-wide text-terracotta-100">
            {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
          </p>
          <p className="font-serif font-bold text-xl leading-none text-white">
            {new Date(event.date + 'T12:00:00').getDate()}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif font-bold text-earth-800 leading-tight">{event.title}</h3>
            {currentUser?.isAdmin && (
              <button onClick={() => setShowEdit(true)}
                className="shrink-0 text-xs text-earth-400 hover:text-terracotta-600 font-medium transition-colors">
                Edit
              </button>
            )}
          </div>
          <p className="text-earth-400 text-xs mt-0.5">
            {event.time && `${event.time}`}{event.location ? (event.time ? ` · ${event.location}` : event.location) : ''}
          </p>
          {event.host && (
            <p className="text-xs text-earth-500 mt-1">🏠 Hosted by {event.host}</p>
          )}
          {event.description && (
            <p className="text-earth-500 text-sm mt-2 leading-snug">{event.description}</p>
          )}

          {book ? (
            <div className="mt-3">
              <button onClick={() => navigate(`/book/${book.id}`)}
                className="flex gap-3 items-center w-full text-left p-3 bg-earth-50 rounded-xl hover:bg-earth-100 transition-colors">
                <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-14 shrink-0 shadow-sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide mb-1">We're reading</p>
                  <p className="font-serif font-bold text-earth-800 leading-tight">{book.title}</p>
                  <p className="text-sm text-earth-500 mt-0.5">{book.author}</p>
                </div>
              </button>
              {currentUser?.isAdmin && (
                <button onClick={() => setShowPickBook(true)}
                  className="mt-1.5 text-xs text-earth-400 hover:text-terracotta-600 font-medium transition-colors">
                  Change book
                </button>
              )}
            </div>
          ) : (
            <button onClick={() => setShowPickBook(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-earth-300 rounded-xl text-sm font-medium text-earth-400 hover:border-terracotta-300 hover:text-terracotta-600 hover:bg-terracotta-50 transition-colors">
              📖 Add the book for this meeting
            </button>
          )}

          <div className="flex items-center gap-3 mt-3">
            <div className="flex -space-x-1.5">
              {event.rsvps.filter(r => r.status === 'yes').map(r => {
                const u = getUser(r.userId);
                if (!u) return null;
                return <UserAvatar key={r.userId} initials={u.avatarInitials} color={u.avatarColor} src={u.avatarUrl} size="xs" className="ring-2 ring-white" />;
              })}
            </div>
            <p className="text-xs text-earth-400">
              {yesCount > 0 ? `${yesCount} going` : 'No RSVPs yet'}
              {maybeCount > 0 ? `, ${maybeCount} maybe` : ''}
            </p>
          </div>

          {currentUser && (
            <div className="flex gap-2 mt-3">
              {RSVP_OPTIONS.map(opt => (
                <button key={opt.status} onClick={() => rsvpEvent(event.id, opt.status)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    myRsvp === opt.status
                      ? opt.status === 'yes'   ? 'bg-forest-500 text-white'
                      : opt.status === 'maybe' ? 'bg-earth-400 text-white'
                      :                          'bg-earth-200 text-earth-600'
                      : 'bg-earth-50 text-earth-500 hover:bg-earth-100'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPickBook && (
        <PickBookModal onClose={() => setShowPickBook(false)} onSelect={book => setEventBook(event.id, book.id)} />
      )}
      {showEdit && <EditEventModal event={event} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

// ─── Edit past meeting modal ──────────────────────────────────────────────────

function EditPastMeetingModal({ cb, onClose }: { cb: ClubBook; onClose: () => void }) {
  const { updateClubBookMeta } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialDate = cb.startDate ? new Date(cb.startDate + 'T12:00:00') : new Date();
  const [month, setMonth]         = useState(String(initialDate.getMonth() + 1).padStart(2, '0'));
  const [year, setYear]           = useState(String(initialDate.getFullYear()));
  const [host, setHost]           = useState(cb.host ?? '');
  const [cakeNote, setCakeNote]   = useState(cb.cakeNote ?? '');
  const [editorNote, setEditorNote] = useState(cb.editorNote ?? '');
  const [cakeImagePreview, setCakeImagePreview] = useState<string | null>(cb.cakeImageUrl ?? null);
  const [cakeImageUrl, setCakeImageUrl]         = useState<string | null>(cb.cakeImageUrl ?? null);
  const [uploadingImage, setUploadingImage]     = useState(false);
  const [uploadError, setUploadError]           = useState<string | null>(null);
  const [selectedFile, setSelectedFile]         = useState<File | null>(null);
  const [cakeSizeDim, setCakeSizeDim]           = useState(1000); // Medium default
  const [resizeInfo, setResizeInfo]             = useState<{ w: number; h: number; kb: number; wasResized: boolean } | null>(null);

  const uploadCakeImage = async (file: File, dim: number) => {
    setUploadingImage(true);
    setCakeImageUrl(null);
    setUploadError(null);
    try {
      const { blob, previewUrl, width, height, wasResized } = await resizeCakeImage(file, dim);
      setCakeImagePreview(previewUrl);
      setResizeInfo({ w: width, h: height, kb: Math.round(blob.size / 1024), wasResized });
      const ext  = dim === 0 ? (file.name.split('.').pop() ?? 'jpg') : 'jpg';
      const path = `cakes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const contentType = dim === 0 ? file.type : 'image/jpeg';
      const { error: uploadErr } = await supabase.storage.from('club-photos').upload(path, blob, { upsert: false, contentType });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('club-photos').getPublicUrl(path);
      setCakeImageUrl(publicUrl);
    } catch {
      setUploadError('Upload failed — image preview is local only.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setCakeImagePreview(URL.createObjectURL(file));
    await uploadCakeImage(file, cakeSizeDim);
  };

  const handleSizeChange = async (dim: number) => {
    setCakeSizeDim(dim);
    if (selectedFile) await uploadCakeImage(selectedFile, dim);
  };

  const handleSave = () => {
    updateClubBookMeta(
      cb.id,
      host.trim() || undefined,
      cakeNote.trim() || undefined,
      editorNote.trim() || undefined,
      cakeImageUrl ?? undefined,
      `${year}-${month}-01`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-earth-100 shrink-0">
          <h2 className="font-serif font-bold text-earth-800 text-lg">Edit past meeting</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-earth-100 text-earth-400 text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-earth-700 mb-2">📅 When did you meet?</label>
            <div className="flex gap-2">
              <select value={month} onChange={e => setMonth(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50">
                {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
              </select>
              <select value={year} onChange={e => setYear(e.target.value)}
                className="w-28 px-3 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50">
                {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-earth-700 mb-2">🏠 Who hosted?</label>
            <input type="text" value={host} onChange={e => setHost(e.target.value)}
              placeholder="e.g. Sarah's place"
              className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-earth-700 mb-2">🎂 Cake photo & note</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            {cakeImagePreview ? (
              <div className="mb-3">
                <div className="relative rounded-xl overflow-hidden border border-earth-200">
                  <img src={cakeImagePreview} alt="Cake" className="w-full h-40 object-cover" />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-white rounded-full px-3 py-1.5 text-sm font-medium text-earth-700">⏳ Uploading…</span>
                    </div>
                  )}
                  {!uploadingImage && cakeImageUrl && (
                    <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-0.5 text-xs font-medium text-forest-700">✓ Saved</div>
                  )}
                  <button onClick={() => { setCakeImagePreview(null); setCakeImageUrl(null); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 left-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-sm">✕</button>
                </div>
                {selectedFile && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-earth-500 shrink-0">Resize:</span>
                      {CAKE_SIZES.map(s => (
                        <button key={s.label} type="button" disabled={uploadingImage} onClick={() => handleSizeChange(s.dim)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-40 ${
                            cakeSizeDim === s.dim
                              ? 'bg-terracotta-500 text-white border-terracotta-500'
                              : 'text-earth-500 border-earth-200 hover:border-terracotta-300 hover:text-terracotta-600'
                          }`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                    {resizeInfo && !uploadingImage && (
                      <p className="text-xs text-earth-400">
                        📐 {resizeInfo.w} × {resizeInfo.h}px · {resizeInfo.kb < 1024 ? `${resizeInfo.kb} KB` : `${(resizeInfo.kb / 1024).toFixed(1)} MB`}{!resizeInfo.wasResized ? ' · already fits' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 mb-3 border-2 border-dashed border-earth-300 rounded-xl flex items-center justify-center gap-2 hover:border-terracotta-300 hover:bg-terracotta-50 transition-colors group">
                <span className="text-xl">📸</span>
                <span className="text-sm font-medium text-earth-500 group-hover:text-terracotta-600">Upload cake photo</span>
              </button>
            )}
            {uploadError && <p className="text-xs text-amber-600 mb-2">{uploadError}</p>}
            <textarea value={cakeNote} onChange={e => setCakeNote(e.target.value)}
              placeholder="e.g. Lemon drizzle with lavender frosting" rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-earth-700 mb-2">✍️ What made this night special?</label>
            <textarea value={editorNote} onChange={e => setEditorNote(e.target.value)}
              placeholder="A few lines about the conversation…" rows={4} maxLength={400}
              className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50 resize-none" />
            <p className="text-xs text-earth-400 text-right mt-1">{editorNote.length}/400</p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-earth-100 shrink-0">
          <button onClick={handleSave}
            className="w-full py-3 bg-terracotta-500 text-white rounded-xl font-semibold text-sm hover:bg-terracotta-600 transition-colors">
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Past meeting book card ───────────────────────────────────────────────────

function PastMeetingCard({ clubBookId }: { clubBookId: string }) {
  const navigate = useNavigate();
  const { clubBooks, getBook, userBooks, users, currentUser, rateBook, getUserBook } = useApp();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showEditModal, setShowEditModal]     = useState(false);

  const cb   = clubBooks.find(c => c.id === clubBookId);
  const book = cb ? getBook(cb.bookId) : undefined;
  if (!cb || !book) return null;

  const allRatings = userBooks.filter(ub => ub.bookId === book.id && ub.rating);
  const quotes     = allRatings.filter(r => r.hotTake);
  const myEntry    = currentUser ? getUserBook(book.id) : undefined;

  const monthYear = cb.startDate
    ? new Date(cb.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-earth-200 overflow-hidden">
      {/* Book header */}
      <div className="flex gap-4 p-4">
        <button onClick={() => navigate(`/book/${book.id}`)} className="shrink-0">
          <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-20 shadow-md" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <button onClick={() => navigate(`/book/${book.id}`)} className="text-left">
              <h3 className="font-serif font-bold text-earth-800 text-lg leading-tight hover:text-terracotta-600 transition-colors">{book.title}</h3>
              <p className="text-earth-500 text-sm mt-0.5">{book.author}</p>
            </button>
            {currentUser?.isAdmin && (
              <button onClick={() => setShowEditModal(true)}
                className="shrink-0 text-xs text-earth-400 hover:text-terracotta-600 font-medium transition-colors">
                Edit
              </button>
            )}
          </div>
          {monthYear && <p className="text-sm font-semibold text-terracotta-600 mt-1.5">{monthYear}</p>}
          {cb.host && (
            <div className="mt-2">
              <span className="text-xs bg-earth-100 text-earth-600 px-2.5 py-1 rounded-full">🏠 {cb.host}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cake */}
      {(cb.cakeImageUrl || cb.cakeNote) && (
        <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-amber-200 bg-amber-50">
          {cb.cakeImageUrl && <img src={cb.cakeImageUrl} alt="The cake" className="w-full h-48 object-cover" />}
          {cb.cakeNote && (
            <div className="px-3 py-2.5 flex items-start gap-2">
              <span className="text-base shrink-0">🎂</span>
              <p className="text-sm text-amber-800 leading-snug">{cb.cakeNote}</p>
            </div>
          )}
        </div>
      )}

      {/* Editor note */}
      {cb.editorNote && (
        <div className="mx-4 mb-4 p-3 bg-earth-50 rounded-xl border border-earth-100">
          <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide mb-1.5">✍️ About this night</p>
          <p className="text-sm text-earth-600 leading-relaxed">{cb.editorNote}</p>
        </div>
      )}

      {/* Club rating */}
      {allRatings.length > 0 && (
        <div className="border-t border-earth-100">
          <ClubRatingBar ratings={allRatings} />
        </div>
      )}

      {/* Member hot takes */}
      {quotes.length > 0 && (
        <div className="px-4 pb-4 border-t border-earth-100 pt-3 space-y-3">
          <p className="text-xs font-medium text-earth-400 uppercase tracking-wide">What the club said</p>
          {quotes.slice(0, 3).map(r => {
            const u = users.find(u => u.id === r.userId);
            if (!u) return null;
            return (
              <div key={r.userId} className="flex gap-3">
                <button onClick={() => navigate(`/profile/${u.username}`)} className="shrink-0 mt-0.5">
                  <UserAvatar initials={u.avatarInitials} color={u.avatarColor} src={u.avatarUrl} size="xs" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-earth-500 mb-0.5">
                    <button onClick={() => navigate(`/profile/${u.username}`)} className="font-semibold text-earth-700 hover:text-terracotta-600">
                      {u.displayName.split(' ')[0]}
                    </button>
                    {r.rating && <span className="ml-1.5">{ratingEmoji(r.rating as any)}</span>}
                  </p>
                  <p className="text-sm text-earth-600 italic leading-snug">"{r.hotTake}"</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rate / my rating */}
      {currentUser && (
        <div className="px-4 pb-4 border-t border-earth-100 pt-3">
          {myEntry?.rating ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ratingBg(myEntry.rating)}`}>
                  {ratingEmoji(myEntry.rating)} {ratingLabel(myEntry.rating)}
                </span>
                <span className="text-xs text-earth-400">Your rating</span>
              </div>
              <button onClick={() => setShowRatingModal(true)} className="text-xs text-terracotta-600 font-medium hover:text-terracotta-700">Edit</button>
            </div>
          ) : (
            <button onClick={() => setShowRatingModal(true)}
              className="w-full py-2.5 rounded-xl border border-earth-200 text-sm font-medium text-earth-600 hover:bg-earth-50 transition-colors">
              Rate this book
            </button>
          )}
        </div>
      )}

      {showRatingModal && currentUser && (
        <RatingModal book={book} existingRating={myEntry?.rating} existingHotTake={myEntry?.hotTake}
          existingVibeTags={myEntry?.vibeTags} existingFormat={myEntry?.format}
          onSave={(rating, hotTake, vibeTags, format) => { rateBook(book.id, rating, hotTake, vibeTags, format); setShowRatingModal(false); }}
          onClose={() => setShowRatingModal(false)} />
      )}
      {showEditModal && <EditPastMeetingModal cb={cb} onClose={() => setShowEditModal(false)} />}
    </div>
  );
}

// ─── Add Past Meeting Modal ───────────────────────────────────────────────────

function AddPastMeetingModal({ onClose, onSave, addBook }: {
  onClose: () => void;
  onSave: (bookId: string, startDate: string, host?: string, cakeNote?: string, editorNote?: string, cakeImageUrl?: string) => void;
  addBook: (book: Book) => void;
}) {
  const { books } = useApp();
  const [step, setStep] = useState<'search' | 'details'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [month, setMonth]       = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear]         = useState(String(currentYear - 1));
  const [host, setHost]         = useState('');
  const [cakeNote, setCakeNote] = useState('');
  const [editorNote, setEditorNote] = useState('');
  const [cakeImagePreview, setCakeImagePreview] = useState<string | null>(null);
  const [cakeImageUrl, setCakeImageUrl]         = useState<string | null>(null);
  const [uploadingImage, setUploadingImage]     = useState(false);
  const [uploadError, setUploadError]           = useState<string | null>(null);
  const [selectedFile, setSelectedFile]         = useState<File | null>(null);
  const [cakeSizeDim, setCakeSizeDim]           = useState(1000); // Medium default
  const [resizeInfo, setResizeInfo]             = useState<{ w: number; h: number; kb: number; wasResized: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadCakeImage = async (file: File, dim: number) => {
    setUploadingImage(true);
    setCakeImageUrl(null);
    setUploadError(null);
    try {
      const { blob, previewUrl, width, height, wasResized } = await resizeCakeImage(file, dim);
      setCakeImagePreview(previewUrl);
      setResizeInfo({ w: width, h: height, kb: Math.round(blob.size / 1024), wasResized });
      const ext  = dim === 0 ? (file.name.split('.').pop() ?? 'jpg') : 'jpg';
      const path = `cakes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const contentType = dim === 0 ? file.type : 'image/jpeg';
      const { error: uploadErr } = await supabase.storage.from('club-photos').upload(path, blob, { upsert: false, contentType });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('club-photos').getPublicUrl(path);
      setCakeImageUrl(publicUrl);
    } catch {
      setUploadError('Upload failed — image preview is local only.');
    } finally { setUploadingImage(false); }
  };

  const handleSizeChange = async (dim: number) => {
    setCakeSizeDim(dim);
    if (selectedFile) await uploadCakeImage(selectedFile, dim);
  };

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const googleResults = await searchGoogleBooks(query);
      const mapped: Book[] = googleResults.map(r => ({
        id: r.id, title: r.title, author: r.author,
        coverUrl: r.coverUrl, description: r.description ?? '',
        publishedYear: r.publishedYear ?? 0, genre: 'Fiction', pageCount: r.pageCount ?? 0,
      }));
      const localMatches = books.filter(b =>
        b.title.toLowerCase().includes(query.toLowerCase()) ||
        b.author.toLowerCase().includes(query.toLowerCase())
      );
      const seen = new Set<string>();
      setResults([...localMatches, ...mapped].filter(r => {
        const key = `${r.title.toLowerCase().replace(/[^a-z0-9]/g, '')}|${r.author.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}`;
        if (seen.has(key)) return false; seen.add(key); return true;
      }));
    } finally { setSearching(false); }
  }, [query, books]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setCakeImagePreview(URL.createObjectURL(file));
    await uploadCakeImage(file, cakeSizeDim);
  };

  const handleSave = () => {
    if (!selectedBook) return;
    onSave(selectedBook.id, `${year}-${month}-01`, host.trim() || undefined, cakeNote.trim() || undefined, editorNote.trim() || undefined, cakeImageUrl ?? undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-earth-100 shrink-0">
          <div>
            <h2 className="font-serif font-bold text-earth-800 text-lg">Add a past meeting</h2>
            <p className="text-xs text-earth-400 mt-0.5">
              {step === 'search' ? 'Search for the book you read together' : `Adding: ${selectedBook?.title}`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-earth-100 text-earth-400 text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {step === 'search' ? (
            <div className="p-5">
              <div className="flex gap-2 mb-4">
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search by title or author…"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50" autoFocus />
                <button onClick={search} disabled={searching || !query.trim()}
                  className="px-4 py-2.5 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 disabled:opacity-50 transition-colors">
                  {searching ? '…' : 'Search'}
                </button>
              </div>
              <div className="space-y-2">
                {results.map(book => (
                  <button key={book.id} onClick={() => { addBook(book); setSelectedBook(book); setStep('details'); }}
                    className="w-full flex gap-3 items-center p-3 rounded-xl hover:bg-earth-50 transition-colors text-left">
                    <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-10 shrink-0 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-earth-800 text-sm leading-tight">{book.title}</p>
                      <p className="text-xs text-earth-400">{book.author}</p>
                    </div>
                    <span className="text-terracotta-500 text-sm shrink-0">Select →</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {selectedBook && (
                <div className="flex gap-3 items-center bg-earth-50 rounded-xl p-3">
                  <BookCover src={selectedBook.coverUrl} title={selectedBook.title} author={selectedBook.author} className="w-12 shrink-0 shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-bold text-earth-800 text-sm">{selectedBook.title}</p>
                    <p className="text-xs text-earth-500">{selectedBook.author}</p>
                  </div>
                  <button onClick={() => setStep('search')} className="text-xs text-terracotta-600 font-medium">Change</button>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-earth-700 mb-2">📅 When did you meet?</label>
                <div className="flex gap-2">
                  <select value={month} onChange={e => setMonth(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50">
                    {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                  </select>
                  <select value={year} onChange={e => setYear(e.target.value)}
                    className="w-28 px-3 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50">
                    {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-earth-700 mb-2">🏠 Who hosted?</label>
                <input type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="e.g. Sarah's place"
                  className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-earth-700 mb-2">🎂 What was the cake?</label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                {cakeImagePreview ? (
                  <div className="mb-3">
                  <div className="relative rounded-xl overflow-hidden border border-earth-200">
                    <img src={cakeImagePreview} alt="Cake" className="w-full h-40 object-cover" />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white rounded-full px-3 py-1.5 text-sm font-medium text-earth-700">⏳ Uploading…</span>
                      </div>
                    )}
                    {!uploadingImage && cakeImageUrl && <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-0.5 text-xs font-medium text-forest-700">✓ Saved</div>}
                    <button onClick={() => { setCakeImagePreview(null); setCakeImageUrl(null); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute top-2 left-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-sm">✕</button>
                  </div>
                  {selectedFile && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-earth-500 shrink-0">Resize:</span>
                        {CAKE_SIZES.map(s => (
                          <button key={s.label} type="button" disabled={uploadingImage} onClick={() => handleSizeChange(s.dim)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-40 ${
                              cakeSizeDim === s.dim
                                ? 'bg-terracotta-500 text-white border-terracotta-500'
                                : 'text-earth-500 border-earth-200 hover:border-terracotta-300 hover:text-terracotta-600'
                            }`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                      {resizeInfo && !uploadingImage && (
                        <p className="text-xs text-earth-400">
                          📐 {resizeInfo.w} × {resizeInfo.h}px · {resizeInfo.kb < 1024 ? `${resizeInfo.kb} KB` : `${(resizeInfo.kb / 1024).toFixed(1)} MB`}{!resizeInfo.wasResized ? ' · already fits' : ''}
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full h-20 mb-3 border-2 border-dashed border-earth-300 rounded-xl flex items-center justify-center gap-2 hover:border-terracotta-300 hover:bg-terracotta-50 transition-colors group">
                    <span className="text-xl">📸</span>
                    <span className="text-sm font-medium text-earth-500 group-hover:text-terracotta-600">Upload cake photo</span>
                  </button>
                )}
                {uploadError && <p className="text-xs text-amber-600 mb-2">{uploadError}</p>}
                <textarea value={cakeNote} onChange={e => setCakeNote(e.target.value)}
                  placeholder="e.g. Lemon drizzle with lavender frosting — incredible" rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-earth-700 mb-2">✍️ What made this night special?</label>
                <textarea value={editorNote} onChange={e => setEditorNote(e.target.value)}
                  placeholder="A few lines about the conversation or what you'll always remember…" rows={4} maxLength={400}
                  className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-300 bg-earth-50 resize-none" />
                <p className="text-xs text-earth-400 text-right mt-1">{editorNote.length}/400</p>
              </div>
            </div>
          )}
        </div>
        {step === 'details' && (
          <div className="px-5 py-4 border-t border-earth-100 shrink-0">
            <button onClick={handleSave} disabled={!selectedBook}
              className="w-full py-3 bg-terracotta-500 text-white rounded-xl font-semibold text-sm hover:bg-terracotta-600 disabled:opacity-50 transition-colors">
              Save to Meeting History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Events() {
  const { events, clubBooks, currentUser, addPastClubBook, addBook } = useApp();
  const [showAddModal, setShowAddModal]     = useState(false);
  const [showNewMeeting, setShowNewMeeting] = useState(false);

  const upcoming  = events.filter(e => isUpcoming(e.date)).sort((a, b) => a.date.localeCompare(b.date));
  const pastBooks = [...clubBooks.filter(cb => cb.status === 'read')]
    .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));

  return (
    <Layout title="Meetings">
      <div className="space-y-8">

        {/* ── Upcoming ─────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-earth-400 uppercase tracking-widest">Coming up</p>
            {currentUser?.isAdmin && (
              <button onClick={() => setShowNewMeeting(true)}
                className="text-xs font-medium text-terracotta-600 hover:text-terracotta-700 bg-terracotta-50 border border-terracotta-200 px-3 py-1.5 rounded-full transition-colors">
                + New meeting
              </button>
            )}
          </div>
          {upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map(e => <UpcomingEventCard key={e.id} event={e} />)}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-earth-300 p-6 text-center">
              <p className="text-2xl mb-1">📅</p>
              <p className="font-serif text-earth-600 font-semibold text-sm">No meetings scheduled yet</p>
              {currentUser?.isAdmin && (
                <button onClick={() => setShowNewMeeting(true)}
                  className="mt-3 px-4 py-2 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 transition-colors">
                  Schedule one →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Past meetings ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-earth-400 uppercase tracking-widest">Past Meetings</p>
            {currentUser?.isAdmin && (
              <button onClick={() => setShowAddModal(true)}
                className="text-xs font-medium text-terracotta-600 hover:text-terracotta-700 bg-terracotta-50 border border-terracotta-200 px-3 py-1.5 rounded-full transition-colors">
                + Add a past meeting
              </button>
            )}
          </div>

          {pastBooks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-earth-300 p-8 text-center">
              <p className="text-3xl mb-2">📚</p>
              <p className="font-serif text-earth-600 font-semibold">No meeting history yet</p>
              <p className="text-earth-400 text-sm mt-1">Add the books you've already read together.</p>
              {currentUser?.isAdmin && (
                <button onClick={() => setShowAddModal(true)}
                  className="mt-4 px-5 py-2.5 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 transition-colors">
                  Add your first meeting →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {pastBooks.map(cb => <PastMeetingCard key={cb.id} clubBookId={cb.id} />)}
            </div>
          )}
        </div>

      </div>

      {showAddModal && (
        <AddPastMeetingModal onClose={() => setShowAddModal(false)} onSave={addPastClubBook} addBook={addBook} />
      )}
      {showNewMeeting && <EditEventModal onClose={() => setShowNewMeeting(false)} />}
    </Layout>
  );
}
