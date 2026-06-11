import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ratingEmoji, ratingBg, ratingLabel } from '../lib/utils';
import type { Rating } from '../types';
import Layout from '../components/Layout';
import BookCover from '../components/BookCover';
import RatingModal from '../components/RatingModal';
import UserAvatar from '../components/UserAvatar';
import VibeTag from '../components/VibeTag';

// ── "Recommend to a friend" modal ─────────────────────────────────────────────
function RecommendModal({ bookId, onClose }: { bookId: string; onClose: () => void }) {
  const { users, currentUser, recommendBook } = useApp();
  const [sent, setSent] = useState<string | null>(null);
  const others = users.filter(u => u.id !== currentUser?.id);

  const handleSend = (userId: string) => {
    recommendBook(bookId, userId);
    setSent(userId);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h3 className="font-serif font-bold text-earth-800 text-lg mb-1">Recommend to a friend</h3>
        <p className="text-earth-500 text-sm mb-4">They'll get a notification with your rec.</p>
        <div className="space-y-2">
          {others.map(u => (
            <button
              key={u.id}
              onClick={() => handleSend(u.id)}
              disabled={sent !== null}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                sent === u.id ? 'bg-forest-100 text-forest-700' : 'bg-earth-50 hover:bg-earth-100 text-earth-800'
              }`}
            >
              <UserAvatar initials={u.avatarInitials} color={u.avatarColor} src={u.avatarUrl} size="sm" />
              <div>
                <p className="font-medium text-sm">{u.displayName}</p>
                <p className="text-xs text-earth-400">@{u.username}</p>
              </div>
              {sent === u.id && <span className="ml-auto text-forest-600 text-sm font-medium">Sent ✓</span>}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2.5 text-earth-400 text-sm hover:text-earth-600">Cancel</button>
      </div>
    </div>
  );
}

// ── "Who mentioned this?" sheet ───────────────────────────────────────────────
function WhoMentionedSheet({
  onSave,
  onClose,
}: {
  onSave: (recommendedByUserId: string | null) => void;
  onClose: () => void;
}) {
  const { users, currentUser } = useApp();
  const others = users.filter(u => u.id !== currentUser?.id);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h3 className="font-serif font-bold text-earth-800 text-lg mb-1">Who mentioned this?</h3>
        <p className="text-earth-500 text-sm mb-4">Tag a friend so you remember — their icon will show on the book cover.</p>
        <div className="space-y-2">
          {others.map(u => (
            <button
              key={u.id}
              onClick={() => onSave(u.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-earth-50 hover:bg-earth-100 text-earth-800 transition-colors"
            >
              <UserAvatar initials={u.avatarInitials} color={u.avatarColor} src={u.avatarUrl} size="sm" />
              <div>
                <p className="font-medium text-sm">{u.displayName}</p>
                <p className="text-xs text-earth-400">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={() => onSave(null)}
          className="w-full mt-3 py-2.5 text-earth-500 text-sm font-medium hover:text-earth-700 border border-earth-200 rounded-xl transition-colors"
        >
          Just me — no one mentioned it
        </button>
      </div>
    </div>
  );
}

// ── "Did not finish" hot take modal ──────────────────────────────────────────
function DNFModal({
  onSave,
  onClose,
}: {
  onSave: (hotTake: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h3 className="font-serif font-bold text-earth-800 text-lg mb-1">What stopped you?</h3>
        <p className="text-earth-500 text-sm mb-4">Give us the honest hot take. Life's too short for books that don't hook you.</p>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value.slice(0, 150))}
          placeholder="It just wasn't clicking for me..."
          className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm text-earth-800 placeholder-earth-400 focus:outline-none focus:border-terracotta-400 resize-none h-24"
        />
        <p className="text-right text-xs text-earth-400 mt-1 mb-3">{text.length}/150</p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-earth-500 border border-earth-200 hover:bg-earth-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(text.trim())}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-terracotta-500 text-white hover:bg-terracotta-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromUserId = searchParams.get('from') ?? undefined;
  const {
    getBook, getUserBook, userBooks, users, currentUser,
    rateBook, setBookStatus, removeBook,
    setRecommendedBy, getUser,
    clubBooks, nominateBook, removeNomination,
  } = useApp();
  const fromUser = fromUserId ? getUser(fromUserId) : undefined;

  const [showModal, setShowModal] = useState(false);
  const [showRecommend, setShowRecommend] = useState(false);
  const [showWhoMentioned, setShowWhoMentioned] = useState(false);
  const [showDNF, setShowDNF] = useState(false);

  const book = id ? getBook(id) : undefined;
  if (!book) return (
    <Layout>
      <div className="text-center py-20">
        <p className="text-earth-500">Book not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-terracotta-600 text-sm">← Go back</button>
      </div>
    </Layout>
  );

  const myEntry = currentUser ? getUserBook(book.id) : undefined;
  const allEntries = userBooks.filter(ub => ub.bookId === book.id && ub.rating);

  const ratingsCount = {
    thumbs_up:   allEntries.filter(e => e.rating === 'thumbs_up').length,
    so_so:       allEntries.filter(e => e.rating === 'so_so').length,
    thumbs_down: allEntries.filter(e => e.rating === 'thumbs_down').length,
  };
  const totalRatings = allEntries.length;

  const vibeCounts: Record<string, number> = {};
  allEntries.forEach(e => e.vibeTags?.forEach(t => { vibeCounts[t] = (vibeCounts[t] || 0) + 1; }));
  const sortedVibes = Object.entries(vibeCounts).sort((a, b) => b[1] - a[1]);

  const ratingBar = (rating: Rating, count: number) => {
    const pct = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
    const color = rating === 'thumbs_up' ? 'bg-terracotta-400' : rating === 'so_so' ? 'bg-earth-400' : 'bg-forest-500';
    return (
      <div key={rating} className="flex items-center gap-2 text-sm">
        <span className="w-16 text-xs text-earth-500 text-right">{ratingEmoji(rating)} {ratingLabel(rating)}</span>
        <div className="flex-1 h-2 bg-earth-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-6 text-xs text-earth-400 text-right">{count}</span>
      </div>
    );
  };

  function saveWantToRead(recommendedByUserId: string | null) {
    if (!book) return;
    setBookStatus(book.id, 'want_to_read');
    const tag = recommendedByUserId ?? fromUserId ?? null;
    if (tag) setRecommendedBy(book.id, tag);
    setShowWhoMentioned(false);
  }

  function saveDNF(hotTake: string) {
    if (!book) return;
    setBookStatus(book.id, 'did_not_finish', undefined, hotTake || undefined);
    if (fromUserId) setRecommendedBy(book.id, fromUserId);
    setShowDNF(false);
  }

  return (
    <Layout noPadding>
      <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto md:mx-0">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-earth-400 text-sm mb-5 hover:text-earth-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          Back
        </button>

        {/* Header */}
        <div className="flex gap-4 mb-6">
          <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-24 shrink-0 shadow-md" />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif font-bold text-earth-800 text-2xl leading-tight">{book.title}</h1>
            <p className="text-earth-500 mt-1">{book.author}</p>
            <p className="text-earth-400 text-xs mt-1">{book.publishedYear} · {book.genre} · {book.pageCount} pages</p>
            {totalRatings > 0 && (
              <p className="text-xs text-earth-500 mt-2">{totalRatings} rating{totalRatings !== 1 ? 's' : ''} from your club</p>
            )}
          </div>
        </div>

        {/* My status */}
        {currentUser && (
          <div className="bg-white rounded-2xl border border-earth-200 p-4 mb-5">
            <p className="text-sm font-medium text-earth-700 mb-3">Your shelf</p>
            {myEntry ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {myEntry.rating && (
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${ratingBg(myEntry.rating)}`}>
                      {ratingEmoji(myEntry.rating)} {ratingLabel(myEntry.rating)}
                    </span>
                  )}
                  {myEntry.status === 'currently_reading' && (
                    <span className="text-sm px-3 py-1 rounded-full font-medium bg-forest-100 text-forest-700">
                      📖 Reading {myEntry.progress ? `(${myEntry.progress}%)` : ''}
                    </span>
                  )}
                  {myEntry.status === 'want_to_read' && !myEntry.rating && (
                    <div>
                      <span className="text-sm px-3 py-1 rounded-full font-medium bg-earth-100 text-earth-600">
                        🔖 Want to read
                      </span>
                      {myEntry.recommendedBy && (() => {
                        const rec = users.find(u => u.id === myEntry.recommendedBy);
                        return rec ? (
                          <div className="flex items-center gap-1.5 mt-2">
                            <UserAvatar initials={rec.avatarInitials} color={rec.avatarColor} size="xs" />
                            <p className="text-xs text-earth-400">mentioned by {rec.displayName.split(' ')[0]}</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  {myEntry.status === 'did_not_finish' && (
                    <span className="text-sm px-3 py-1 rounded-full font-medium bg-earth-100 text-earth-500">
                      🚧 Did not finish
                    </span>
                  )}
                  {myEntry.hotTake && (
                    <p className="text-xs text-earth-500 italic mt-2">"{myEntry.hotTake}"</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {myEntry.status !== 'did_not_finish' && (
                    <button onClick={() => setShowModal(true)} className="text-xs px-3 py-1.5 bg-earth-100 text-earth-600 rounded-lg hover:bg-earth-200">
                      {myEntry.rating ? 'Edit' : 'Rate'}
                    </button>
                  )}
                  <button onClick={() => removeBook(book.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* "Via" banner — shown when arriving from someone's feed activity */}
                {fromUser && (
                  <div className="flex items-center gap-2.5 mb-3 px-3 py-2.5 bg-terracotta-50 border border-terracotta-200 rounded-xl">
                    <UserAvatar initials={fromUser.avatarInitials} color={fromUser.avatarColor} size="xs" />
                    <p className="text-xs text-terracotta-700 leading-snug">
                      You found this through <span className="font-semibold">{fromUser.displayName.split(' ')[0]}</span>'s activity.
                      They'll be tagged when you add it to your shelf.
                    </p>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 transition-colors"
                  >
                    👍 I've read this
                  </button>
                  <button
                    onClick={() => {
                      setBookStatus(book.id, 'currently_reading', 0);
                      if (fromUserId) setRecommendedBy(book.id, fromUserId);
                    }}
                    className="px-4 py-2 bg-forest-100 text-forest-700 rounded-xl text-sm font-medium hover:bg-forest-200 transition-colors"
                  >
                    📖 Currently reading
                  </button>
                  <button
                    onClick={() => fromUserId ? saveWantToRead(fromUserId) : setShowWhoMentioned(true)}
                    className="px-4 py-2 bg-earth-100 text-earth-600 rounded-xl text-sm font-medium hover:bg-earth-200 transition-colors"
                  >
                    🔖 Want to read
                  </button>
                  <button
                    onClick={() => setShowDNF(true)}
                    className="px-4 py-2 bg-earth-50 text-earth-400 rounded-xl text-sm font-medium hover:bg-earth-100 transition-colors border border-earth-200"
                  >
                    🚧 Did not finish
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Club nomination */}
        {currentUser && (() => {
          const clubEntry = clubBooks.find(cb => cb.bookId === book.id);
          if (clubEntry?.status === 'reading') return (
            <div className="bg-terracotta-50 border border-terracotta-200 rounded-2xl px-4 py-3 mb-5 flex items-center gap-2">
              <span className="text-lg">📖</span>
              <p className="text-terracotta-700 text-sm font-semibold">This is your club's current pick!</p>
            </div>
          );
          if (clubEntry?.status === 'read') return (
            <div className="bg-earth-100 border border-earth-200 rounded-2xl px-4 py-3 mb-5 flex items-center gap-2">
              <span className="text-earth-500 text-lg">✓</span>
              <p className="text-earth-600 text-sm font-semibold">Your club read this one.</p>
            </div>
          );
          if (clubEntry?.status === 'nominated') {
            const isMine = clubEntry.addedBy === currentUser.id;
            return (
              <div className="bg-white border border-earth-200 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🗳️</span>
                  <p className="text-earth-700 text-sm font-semibold">Nominated for club vote</p>
                </div>
                {isMine && (
                  <button onClick={() => removeNomination(clubEntry.id)} className="text-xs text-earth-400 hover:text-red-500 transition-colors shrink-0">
                    Remove
                  </button>
                )}
              </div>
            );
          }
          return (
            <div className="mb-5">
              <button
                onClick={() => nominateBook(book.id)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-earth-200 bg-white text-earth-700 text-sm font-medium hover:bg-earth-50 transition-colors"
              >
                <span>🗳️</span> Nominate for Club Vote
              </button>
            </div>
          );
        })()}

        {/* Club ratings breakdown */}
        {totalRatings > 0 && (
          <div className="bg-white rounded-2xl border border-earth-200 p-4 mb-5">
            <p className="text-sm font-medium text-earth-700 mb-3">Club ratings</p>
            <div className="space-y-2">
              {(['thumbs_up', 'so_so', 'thumbs_down'] as Rating[]).map(r => ratingBar(r, ratingsCount[r]))}
            </div>
          </div>
        )}

        {/* Vibe tags */}
        {sortedVibes.length > 0 && (
          <div className="mb-5">
            <p className="text-sm font-medium text-earth-700 mb-2">Vibes from your club</p>
            <div className="flex flex-wrap gap-2">
              {sortedVibes.map(([tag, count]) => (
                <span key={tag} className="text-xs px-3 py-1 bg-cream-200 text-earth-700 rounded-full border border-earth-200">
                  {tag} <span className="text-earth-400">({count})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Friends' reactions */}
        {allEntries.filter(e => e.userId !== currentUser?.id).length > 0 && (
          <div className="mb-5">
            <p className="text-sm font-medium text-earth-700 mb-3">What your people said</p>
            <div className="space-y-3">
              {allEntries.filter(e => e.userId !== currentUser?.id).map(entry => {
                const u = users.find(u => u.id === entry.userId);
                if (!u) return null;
                return (
                  <div key={entry.id} className="bg-white rounded-2xl border border-earth-200 p-4 flex gap-3">
                    <button onClick={() => navigate(`/profile/${u.username}`)}>
                      <UserAvatar initials={u.avatarInitials} color={u.avatarColor} src={u.avatarUrl} size="sm" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <button onClick={() => navigate(`/profile/${u.username}`)} className="font-medium text-earth-800 text-sm hover:text-terracotta-600">
                          {u.displayName}
                        </button>
                        {entry.rating && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ratingBg(entry.rating)}`}>
                            {ratingEmoji(entry.rating)}
                          </span>
                        )}
                        {entry.format && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-earth-100 text-earth-500">
                            {entry.format === 'listened' ? '🎧 Audiobook' : '📖 Read'}
                          </span>
                        )}
                      </div>
                      {entry.hotTake && <p className="text-sm text-earth-600 italic">"{entry.hotTake}"</p>}
                      {entry.vibeTags && entry.vibeTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.vibeTags.map(t => <VibeTag key={t} tag={t} small />)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommend to a friend — above the bio */}
        {currentUser && (
          <button
            onClick={() => setShowRecommend(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-earth-200 bg-white text-earth-600 text-sm font-medium hover:bg-earth-50 transition-colors mb-4"
          >
            <span>✉</span> Recommend to a friend
          </button>
        )}

        {/* About this book */}
        <div className="bg-white rounded-2xl border border-earth-200 p-4">
          <p className="text-sm font-medium text-earth-700 mb-2">About this book</p>
          <p className="text-sm text-earth-600 leading-relaxed">{book.description}</p>
        </div>
      </div>

      {showWhoMentioned && (
        <WhoMentionedSheet
          onSave={saveWantToRead}
          onClose={() => setShowWhoMentioned(false)}
        />
      )}

      {showDNF && (
        <DNFModal
          onSave={saveDNF}
          onClose={() => setShowDNF(false)}
        />
      )}

      {showRecommend && (
        <RecommendModal bookId={book.id} onClose={() => setShowRecommend(false)} />
      )}

      {showModal && currentUser && (
        <RatingModal
          book={book}
          existingRating={myEntry?.rating}
          existingHotTake={myEntry?.hotTake}
          existingVibeTags={myEntry?.vibeTags}
          existingFormat={myEntry?.format}
          onSave={(rating, hotTake, vibeTags, format) => {
            rateBook(book.id, rating, hotTake, vibeTags, format);
            if (fromUserId) setRecommendedBy(book.id, fromUserId);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </Layout>
  );
}
