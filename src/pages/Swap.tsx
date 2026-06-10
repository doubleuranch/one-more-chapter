import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { searchGoogleBooks } from '../lib/googleBooks';
import type { Book } from '../types';
import Layout from '../components/Layout';
import BookCover from '../components/BookCover';
import UserAvatar from '../components/UserAvatar';

type Tab = 'browse' | 'wishlist' | 'myshelf';

// ─── Add book to swap modal ───────────────────────────────────────────────────
interface AddSwapModalProps {
  onAdd: (bookId: string, note: string) => void;
  onClose: () => void;
}

function AddSwapModal({ onAdd, onClose }: AddSwapModalProps) {
  const { swapBooks, currentUser, addBook } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);
  const [note, setNote] = useState('');

  const alreadyListed = new Set(swapBooks.filter(sb => sb.userId === currentUser?.id).map(sb => sb.bookId));

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    const googleResults = await searchGoogleBooks(query);
    // Deduplicate by title+author, filter already listed
    const seen = new Set<string>();
    const deduped = googleResults
      .filter(r => !alreadyListed.has(r.id))
      .filter(r => {
        const key = `${r.title.toLowerCase().replace(/[^a-z0-9]/g, '')}|${r.author.toLowerCase().slice(0, 20)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(r => ({
        id: r.id,
        title: r.title,
        author: r.author,
        coverUrl: r.coverUrl,
        description: r.description ?? '',
        publishedYear: r.publishedYear ?? 0,
        genre: 'Fiction',
        pageCount: r.pageCount ?? 0,
      }));
    setResults(deduped);
    setSearching(false);
  }, [query]);

  const handleSelect = (book: Book) => {
    addBook(book); // register in global state so BookDetail can find it
    setSelected(book);
    setResults([]);
    setQuery('');
  };

  const handleAdd = () => {
    if (!selected) return;
    onAdd(selected.id, note.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-earth-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="p-6 pb-4 border-b border-earth-100">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-serif font-bold text-earth-800 text-lg">Offer a book to lend</h3>
            <button onClick={onClose} className="text-earth-400 hover:text-earth-600 text-xl leading-none">✕</button>
          </div>
          <p className="text-earth-400 text-sm">Search any book from your personal library.</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Selected book preview */}
          {selected ? (
            <div className="flex items-center gap-3 bg-terracotta-50 border border-terracotta-200 rounded-2xl p-3 mb-4">
              <BookCover src={selected.coverUrl} title={selected.title} author={selected.author} className="w-10 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-serif font-semibold text-earth-800 text-sm leading-tight line-clamp-1">{selected.title}</p>
                <p className="text-earth-500 text-xs">{selected.author}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-earth-400 hover:text-earth-600 text-sm shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            /* Search bar */
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Title or author…"
                  className="flex-1 border border-earth-200 rounded-xl px-4 py-2.5 text-sm text-earth-800 placeholder-earth-400 focus:outline-none focus:border-terracotta-400 bg-earth-50"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                  className="px-4 py-2.5 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 disabled:opacity-50 transition-colors"
                >
                  {searching ? '…' : 'Search'}
                </button>
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="mt-2 border border-earth-200 rounded-xl overflow-hidden divide-y divide-earth-100 max-h-56 overflow-y-auto">
                  {results.map(book => (
                    <button
                      key={book.id}
                      onClick={() => handleSelect(book)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-earth-50 text-left transition-colors"
                    >
                      <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-8 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-serif font-semibold text-earth-800 text-sm leading-tight line-clamp-1">{book.title}</p>
                        <p className="text-earth-400 text-xs">{book.author}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div className="mb-6">
            <label className="text-sm font-medium text-earth-700 block mb-1.5">
              Note <span className="text-earth-400 font-normal">(optional)</span>
            </label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Paperback, great condition"
              maxLength={100}
              className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm text-earth-800 focus:outline-none focus:border-terracotta-400 bg-earth-50"
            />
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-earth-100 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-earth-300 text-earth-600 font-medium text-sm hover:bg-earth-50 transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selected}
            className="flex-1 py-3 rounded-xl bg-terracotta-500 text-white font-medium text-sm hover:bg-terracotta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            List book
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add wish request modal ───────────────────────────────────────────────────
interface AddWishModalProps {
  onAdd: (bookId: string, note: string) => void;
  onClose: () => void;
}

function AddWishModal({ onAdd, onClose }: AddWishModalProps) {
  const { books, swapRequests, currentUser } = useApp();
  const [selectedBookId, setSelectedBookId] = useState('');
  const [note, setNote] = useState('');

  const alreadyRequested = new Set(
    swapRequests.filter(r => r.requesterId === currentUser?.id && !r.fulfilled).map(r => r.bookId)
  );
  const eligibleBooks = books.filter(b => !alreadyRequested.has(b.id));

  const handleAdd = () => {
    if (!selectedBookId) return;
    onAdd(selectedBookId, note.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-earth-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif font-bold text-earth-800 text-lg">Request a book</h3>
            <button onClick={onClose} className="text-earth-400 hover:text-earth-600 text-xl leading-none">✕</button>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-earth-700 block mb-1.5">Which book?</label>
            <select
              value={selectedBookId}
              onChange={e => setSelectedBookId(e.target.value)}
              className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm text-earth-800 focus:outline-none focus:border-terracotta-400 bg-earth-50"
            >
              <option value="">Select a book…</option>
              {eligibleBooks.map(b => (
                <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-earth-700 block mb-1.5">
              Note <span className="text-earth-400 font-normal">(optional)</span>
            </label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Why you want it, urgency, etc."
              maxLength={120}
              className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm text-earth-800 focus:outline-none focus:border-terracotta-400 bg-earth-50"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-earth-300 text-earth-600 font-medium text-sm hover:bg-earth-50 transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedBookId}
              className="flex-1 py-3 rounded-xl bg-forest-600 text-white font-medium text-sm hover:bg-forest-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add to wish list
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Swap page ───────────────────────────────────────────────────────────
export default function Swap() {
  const navigate = useNavigate();
  const {
    currentUser, swapBooks, swapRequests,
    getBook, getUser,
    addSwapBook, removeSwapBook, requestBorrow, cancelBorrowRequest, acceptBorrow, returnBook,
    addWishRequest, removeWishRequest, fulfillWishRequest,
  } = useApp();

  const [tab, setTab] = useState<Tab>('browse');
  const [showAddSwap, setShowAddSwap] = useState(false);
  const [showAddWish, setShowAddWish] = useState(false);

  if (!currentUser) return null;

  // ── Browse tab data — include own listings so you can see your listing is live
  const availableBooks = swapBooks.filter(sb => sb.status === 'available');

  // ── Wish list tab data ──
  const openWishes = swapRequests.filter(r => !r.fulfilled);

  // ── My shelf tab data ──
  const myListings = swapBooks.filter(sb => sb.userId === currentUser.id);
  const myRequests = swapBooks.filter(sb => sb.requestedBy === currentUser.id && sb.userId !== currentUser.id);
  const myWishes = swapRequests.filter(r => r.requesterId === currentUser.id && !r.fulfilled);
  const incomingRequests = swapBooks.filter(sb => sb.userId === currentUser.id && (sb.status === 'requested' || sb.status === 'borrowed'));

  const statusBadge = (status: string) => {
    switch (status) {
      case 'available': return <span className="text-xs px-2 py-0.5 rounded-full bg-forest-100 text-forest-700 font-medium">Available</span>;
      case 'requested': return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Requested</span>;
      case 'borrowed': return <span className="text-xs px-2 py-0.5 rounded-full bg-earth-200 text-earth-600 font-medium">Out on loan</span>;
      case 'returned': return <span className="text-xs px-2 py-0.5 rounded-full bg-earth-100 text-earth-400 font-medium">Returned</span>;
      default: return null;
    }
  };

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'browse', label: 'Available', emoji: '📚' },
    { key: 'wishlist', label: 'Requests', emoji: '🙋' },
    { key: 'myshelf', label: 'My Shelf', emoji: '🏠' },
  ];

  return (
    <Layout title="Borrow">
      {/* Header */}
      <div className="mb-5">
        <p className="text-earth-500 text-sm">Offer a book to lend, or ask if anyone has one you want.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-earth-100 rounded-2xl p-1 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-earth-800 shadow-sm' : 'text-earth-500 hover:text-earth-700'
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BROWSE TAB ── */}
      {tab === 'browse' && (
        <div>
          {availableBooks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📖</p>
              <p className="font-serif text-earth-700 text-lg">Nothing available yet</p>
              <p className="text-earth-400 text-sm mt-1">Be the first to list a book!</p>
              <button
                onClick={() => { setTab('myshelf'); setShowAddSwap(true); }}
                className="mt-4 px-5 py-2.5 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 transition-colors"
              >
                + Offer a book
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {availableBooks.map(sb => {
                const book = getBook(sb.bookId);
                const owner = getUser(sb.userId);
                if (!book || !owner) return null;
                const isOwn = sb.userId === currentUser.id;
                const alreadyRequested = !isOwn && swapBooks.some(
                  s => s.id === sb.id && s.requestedBy === currentUser.id
                );
                return (
                  <div key={sb.id} className={`rounded-2xl border p-4 flex gap-3 ${isOwn ? 'bg-earth-50 border-earth-300 border-dashed' : 'bg-white border-earth-200'}`}>
                    <div
                      className="cursor-pointer shrink-0"
                      onClick={() => navigate(`/book/${book.id}`)}
                    >
                      <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-14" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="cursor-pointer"
                        onClick={() => navigate(`/book/${book.id}`)}
                      >
                        <p className="font-serif font-semibold text-earth-800 text-sm leading-tight line-clamp-1">{book.title}</p>
                        <p className="text-earth-400 text-xs">{book.author}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => navigate(`/profile/${owner.username}`)}>
                          <UserAvatar initials={owner.avatarInitials} color={owner.avatarColor} src={owner.avatarUrl} size="xs" />
                        </button>
                        <button
                          onClick={() => navigate(`/profile/${owner.username}`)}
                          className="text-xs text-earth-500 hover:text-terracotta-600"
                        >
                          {isOwn ? 'You (your listing)' : owner.displayName}
                        </button>
                      </div>
                      {sb.note && (
                        <p className="text-xs text-earth-400 italic mt-1">"{sb.note}"</p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center">
                      {isOwn ? (
                        <span className="text-xs px-3 py-1.5 rounded-lg font-medium bg-forest-100 text-forest-700">
                          Listed ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => requestBorrow(sb.id)}
                          disabled={alreadyRequested}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                            alreadyRequested
                              ? 'bg-earth-100 text-earth-400 cursor-not-allowed'
                              : 'bg-terracotta-500 text-white hover:bg-terracotta-600'
                          }`}
                        >
                          {alreadyRequested ? 'Requested' : 'Borrow'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── WISH LIST TAB ── */}
      {tab === 'wishlist' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-earth-500 text-sm">{openWishes.length} open request{openWishes.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setShowAddWish(true)}
              className="text-sm px-4 py-2 bg-forest-600 text-white rounded-xl font-medium hover:bg-forest-700 transition-colors"
            >
              + Request a book
            </button>
          </div>

          {openWishes.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🙋</p>
              <p className="font-serif text-earth-700 text-lg">No open requests</p>
              <p className="text-earth-400 text-sm mt-1">Ask the club if anyone has a book you want.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openWishes.map(req => {
                const book = getBook(req.bookId);
                const requester = getUser(req.requesterId);
                if (!book || !requester) return null;
                const isMyRequest = req.requesterId === currentUser.id;
                return (
                  <div key={req.id} className="bg-white rounded-2xl border border-earth-200 p-4 flex gap-3">
                    <div
                      className="cursor-pointer shrink-0"
                      onClick={() => navigate(`/book/${book.id}`)}
                    >
                      <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-14" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="cursor-pointer"
                        onClick={() => navigate(`/book/${book.id}`)}
                      >
                        <p className="font-serif font-semibold text-earth-800 text-sm leading-tight line-clamp-1">{book.title}</p>
                        <p className="text-earth-400 text-xs">{book.author}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => navigate(`/profile/${requester.username}`)}>
                          <UserAvatar initials={requester.avatarInitials} color={requester.avatarColor} src={requester.avatarUrl} size="xs" />
                        </button>
                        <span className="text-xs text-earth-500">
                          <button
                            onClick={() => navigate(`/profile/${requester.username}`)}
                            className="hover:text-terracotta-600"
                          >
                            {requester.displayName}
                          </button>
                          {' '}wants to borrow this
                        </span>
                      </div>
                      {req.note && (
                        <p className="text-xs text-earth-400 italic mt-1">"{req.note}"</p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      {isMyRequest ? (
                        <button
                          onClick={() => removeWishRequest(req.id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-earth-100 text-earth-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => fulfillWishRequest(req.id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-forest-500 text-white hover:bg-forest-600 transition-colors"
                        >
                          I can lend this ✓
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MY SHELF TAB ── */}
      {tab === 'myshelf' && (
        <div className="space-y-8">

          {/* My listings */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-serif font-semibold text-earth-800">Books I'm lending</h3>
              <button
                onClick={() => setShowAddSwap(true)}
                className="text-sm px-4 py-2 bg-terracotta-500 text-white rounded-xl font-medium hover:bg-terracotta-600 transition-colors"
              >
                + Offer a book
              </button>
            </div>

            {myListings.length === 0 ? (
              <p className="text-earth-400 text-sm text-center py-6 bg-white rounded-2xl border border-earth-200">
                You haven't listed any books yet.
              </p>
            ) : (
              <div className="space-y-2">
                {myListings.map(sb => {
                  const book = getBook(sb.bookId);
                  if (!book) return null;
                  const requester = sb.requestedBy ? getUser(sb.requestedBy) : null;
                  return (
                    <div key={sb.id} className="bg-white rounded-2xl border border-earth-200 p-4 flex gap-3 items-center">
                      <div
                        className="cursor-pointer shrink-0"
                        onClick={() => navigate(`/book/${book.id}`)}
                      >
                        <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-12" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif font-semibold text-earth-800 text-sm leading-tight line-clamp-1">{book.title}</p>
                        <p className="text-earth-400 text-xs">{book.author}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {statusBadge(sb.status)}
                          {requester && (
                            <span className="text-xs text-earth-500">
                              → {requester.displayName}
                            </span>
                          )}
                        </div>
                        {sb.note && <p className="text-xs text-earth-400 italic mt-1">"{sb.note}"</p>}
                      </div>
                      <div className="shrink-0 flex flex-col gap-1.5">
                        {sb.status === 'available' && (
                          <button
                            onClick={() => removeSwapBook(sb.id)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-earth-100 text-earth-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                        {sb.status === 'requested' && (
                          <button
                            onClick={() => acceptBorrow(sb.id)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-forest-100 text-forest-700 hover:bg-forest-200 transition-colors"
                          >
                            Confirm lend
                          </button>
                        )}
                        {sb.status === 'borrowed' && (
                          <button
                            onClick={() => returnBook(sb.id)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-earth-200 text-earth-600 hover:bg-earth-300 transition-colors"
                          >
                            Mark returned
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Books I'm borrowing / requested */}
          {myRequests.length > 0 && (
            <div>
              <h3 className="font-serif font-semibold text-earth-800 mb-3">Books I'm borrowing</h3>
              <div className="space-y-2">
                {myRequests.map(sb => {
                  const book = getBook(sb.bookId);
                  const owner = getUser(sb.userId);
                  if (!book || !owner) return null;
                  return (
                    <div key={sb.id} className="bg-white rounded-2xl border border-earth-200 p-4 flex gap-3 items-center">
                      <div
                        className="cursor-pointer shrink-0"
                        onClick={() => navigate(`/book/${book.id}`)}
                      >
                        <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-12" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif font-semibold text-earth-800 text-sm leading-tight line-clamp-1">{book.title}</p>
                        <p className="text-earth-400 text-xs">{book.author}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {statusBadge(sb.status)}
                          <button
                            onClick={() => navigate(`/profile/${owner.username}`)}
                            className="text-xs text-earth-500 hover:text-terracotta-600"
                          >
                            from {owner.displayName}
                          </button>
                        </div>
                      </div>
                      {sb.status === 'requested' && (
                        <button
                          onClick={() => cancelBorrowRequest(sb.id)}
                          className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium bg-earth-100 text-earth-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* My wish list */}
          {myWishes.length > 0 && (
            <div>
              <h3 className="font-serif font-semibold text-earth-800 mb-3">My wish list</h3>
              <div className="space-y-2">
                {myWishes.map(req => {
                  const book = getBook(req.bookId);
                  if (!book) return null;
                  return (
                    <div key={req.id} className="bg-white rounded-2xl border border-earth-200 p-4 flex gap-3 items-center">
                      <div
                        className="cursor-pointer shrink-0"
                        onClick={() => navigate(`/book/${book.id}`)}
                      >
                        <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-12" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif font-semibold text-earth-800 text-sm leading-tight line-clamp-1">{book.title}</p>
                        <p className="text-earth-400 text-xs">{book.author}</p>
                        {req.note && <p className="text-xs text-earth-400 italic mt-1">"{req.note}"</p>}
                      </div>
                      <button
                        onClick={() => removeWishRequest(req.id)}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium bg-earth-100 text-earth-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Incoming borrow requests */}
          {incomingRequests.filter(sb => sb.status === 'requested').length > 0 && (
            <div>
              <h3 className="font-serif font-semibold text-earth-800 mb-3">
                📬 Incoming requests
              </h3>
              <div className="space-y-2">
                {incomingRequests.filter(sb => sb.status === 'requested').map(sb => {
                  const book = getBook(sb.bookId);
                  const requester = sb.requestedBy ? getUser(sb.requestedBy) : null;
                  if (!book) return null;
                  return (
                    <div key={sb.id} className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex gap-3 items-center">
                      <div
                        className="cursor-pointer shrink-0"
                        onClick={() => navigate(`/book/${book.id}`)}
                      >
                        <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-12" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif font-semibold text-earth-800 text-sm leading-tight line-clamp-1">{book.title}</p>
                        {requester && (
                          <p className="text-xs text-earth-500 mt-1">
                            <button
                              onClick={() => navigate(`/profile/${requester.username}`)}
                              className="font-medium hover:text-terracotta-600"
                            >
                              {requester.displayName}
                            </button>
                            {' '}wants to borrow this
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex gap-1.5">
                        <button
                          onClick={() => cancelBorrowRequest(sb.id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-white text-earth-500 border border-earth-200 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => acceptBorrow(sb.id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-forest-600 text-white hover:bg-forest-700 transition-colors"
                        >
                          Lend it!
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {myListings.length === 0 && myRequests.length === 0 && myWishes.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-earth-200">
              <p className="text-4xl mb-3">📦</p>
              <p className="font-serif text-earth-700">Nothing here yet</p>
              <p className="text-earth-400 text-sm mt-1">Start by listing a book or browsing what's available.</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddSwap && (
        <AddSwapModal
          onAdd={(bookId, note) => { addSwapBook(bookId, note || undefined); setShowAddSwap(false); }}
          onClose={() => setShowAddSwap(false)}
        />
      )}
      {showAddWish && (
        <AddWishModal
          onAdd={(bookId, note) => { addWishRequest(bookId, note || undefined); setShowAddWish(false); }}
          onClose={() => setShowAddWish(false)}
        />
      )}
    </Layout>
  );
}
