import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import BookCover from '../components/BookCover';
import UserAvatar from '../components/UserAvatar';

export default function Wrapped() {
  const navigate = useNavigate();
  const { currentUser, getUserBooks, getBook, userBooks, users } = useApp();

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const myBooks = getUserBooks(currentUser.id);
  const read = myBooks.filter(ub => ub.status === 'read');
  const rated = read.filter(ub => ub.rating);
  const withHotTakes = read.filter(ub => ub.hotTake);

  const loved = rated.filter(ub => ub.rating === 'thumbs_up');
  const meh = rated.filter(ub => ub.rating === 'so_so');
  const nope = rated.filter(ub => ub.rating === 'thumbs_down');

  const pageCount = read.reduce((sum, ub) => {
    const book = getBook(ub.bookId);
    return sum + (book?.pageCount ?? 0);
  }, 0);

  // Genre breakdown
  const genreCounts: Record<string, number> = {};
  read.forEach(ub => {
    const book = getBook(ub.bookId);
    if (book) genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
  });
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Fiction';

  // Recommendations that others read
  const myBookIds = new Set(myBooks.map(ub => ub.bookId));
  const othersWhoReadMyBooks = userBooks.filter(ub =>
    ub.userId !== currentUser.id && myBookIds.has(ub.bookId) && ub.status === 'read'
  ).length;

  // Reading personality
  const personality = (() => {
    if (loved.length > meh.length + nope.length * 2) return { title: 'The Eternal Optimist', desc: 'You loved almost everything you read. Your enthusiasm is contagious.' };
    if (nope.length > 0 || meh.length > loved.length) return { title: 'The Discerning Critic', desc: "You don't give love easily — which makes your recommendations gold." };
    if (read.length >= 10) return { title: 'The Voracious Reader', desc: 'Quantity and quality. The bar has been set.' };
    return { title: 'The Thoughtful Reader', desc: 'You read intentionally. Every book gets your full attention.' };
  })();

  const StatCard = ({ emoji, value, label }: { emoji: string; value: string | number; label: string }) => (
    <div className="bg-white rounded-2xl border border-earth-200 p-4 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="font-serif font-bold text-earth-800 text-2xl">{value}</div>
      <div className="text-earth-500 text-xs mt-0.5">{label}</div>
    </div>
  );

  return (
    <Layout title="Your 2024 Wrapped">
      <div className="space-y-6">
        {/* Hero */}
        <div className="bg-terracotta-500 rounded-2xl p-6 text-white text-center">
          <UserAvatar initials={currentUser.avatarInitials} color="rgba(255,255,255,0.2)" size="lg" className="mx-auto mb-3" />
          <h2 className="font-serif font-bold text-2xl">{currentUser.displayName}</h2>
          <p className="text-terracotta-100 text-sm mt-1">Here's your year in books</p>
          <div className="mt-4 inline-block bg-white/20 rounded-xl px-4 py-2">
            <span className="font-bold text-xl">{read.length}</span>
            <span className="text-terracotta-100 text-sm ml-1.5">books read in 2024</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard emoji="📄" value={pageCount.toLocaleString()} label="pages read" />
          <StatCard emoji="👍" value={loved.length} label="books loved" />
          <StatCard emoji="💬" value={withHotTakes.length} label="hot takes given" />
          <StatCard emoji="🫶" value={othersWhoReadMyBooks} label="reads inspired" />
        </div>

        {/* Personality */}
        <div className="bg-forest-500 rounded-2xl p-5 text-white">
          <p className="text-forest-200 text-xs font-medium uppercase tracking-wide mb-1">Your reading personality</p>
          <h3 className="font-serif font-bold text-xl">{personality.title}</h3>
          <p className="text-forest-100 text-sm mt-1 leading-snug">{personality.desc}</p>
        </div>

        {/* Top genre */}
        <div className="bg-white rounded-2xl border border-earth-200 p-4">
          <p className="text-earth-500 text-xs font-medium uppercase tracking-wide mb-2">Favourite genre</p>
          <p className="font-serif font-bold text-earth-800 text-xl">{topGenre}</p>
          <p className="text-earth-400 text-sm mt-0.5">You read {genreCounts[topGenre] || 0} {topGenre.toLowerCase()} books</p>
        </div>

        {/* Rating breakdown */}
        {rated.length > 0 && (
          <div className="bg-white rounded-2xl border border-earth-200 p-4">
            <p className="text-earth-500 text-xs font-medium uppercase tracking-wide mb-3">How you rated them</p>
            <div className="space-y-3">
              {[
                { rating: 'thumbs_up', count: loved.length, label: '👍 Loved it' },
                { rating: 'so_so', count: meh.length, label: '👉 It was okay' },
                { rating: 'thumbs_down', count: nope.length, label: '👎 Nope' },
              ].map(({ rating, count, label }) => {
                const pct = Math.round((count / rated.length) * 100);
                const color = rating === 'thumbs_up' ? 'bg-terracotta-400' : rating === 'so_so' ? 'bg-earth-400' : 'bg-forest-500';
                return (
                  <div key={rating} className="flex items-center gap-3 text-sm">
                    <span className="w-28 text-xs text-earth-600">{label}</span>
                    <div className="flex-1 h-2 bg-earth-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-earth-400 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Loved books */}
        {loved.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-3">Books you loved 👍</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {loved.slice(0, 6).map(ub => {
                const book = getBook(ub.bookId);
                if (!book) return null;
                return (
                  <div key={ub.id} className="shrink-0 w-24 cursor-pointer" onClick={() => navigate(`/book/${book.id}`)}>
                    <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-full shadow-sm" />
                    <p className="text-xs font-serif text-earth-700 mt-1.5 line-clamp-2 leading-tight">{book.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Best hot takes */}
        {withHotTakes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-3">Your hot takes</p>
            <div className="space-y-2">
              {withHotTakes.slice(0, 3).map(ub => {
                const book = getBook(ub.bookId);
                if (!book) return null;
                return (
                  <div key={ub.id} className="bg-white rounded-xl border border-earth-200 p-3 flex gap-3" onClick={() => navigate(`/book/${book.id}`)} role="button">
                    <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-10 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-earth-700 line-clamp-1">{book.title}</p>
                      <p className="text-xs text-earth-500 italic mt-0.5">"{ub.hotTake}"</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Club members this year */}
        <div className="bg-earth-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-3">Your reading club</p>
          <div className="flex items-center gap-3 flex-wrap">
            {users.filter(u => u.id !== currentUser.id).map(u => (
              <button key={u.id} onClick={() => navigate(`/profile/${u.username}`)} className="flex items-center gap-2 bg-white rounded-full pl-1 pr-3 py-1 border border-earth-200 hover:border-earth-300 transition-colors">
                <UserAvatar initials={u.avatarInitials} color={u.avatarColor} size="xs" />
                <span className="text-xs font-medium text-earth-700">{u.displayName}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-8" />
      </div>
    </Layout>
  );
}
