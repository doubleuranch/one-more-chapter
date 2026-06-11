import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ratingEmoji, ratingBg } from '../lib/utils';
import Layout from '../components/Layout';
import BookCover from '../components/BookCover';
import UserAvatar from '../components/UserAvatar';

type Tab = 'read' | 'currently_reading' | 'want_to_read' | 'did_not_finish';

const TABS: { key: Tab; label: string }[] = [
  { key: 'read',              label: 'Read' },
  { key: 'currently_reading', label: 'Reading' },
  { key: 'want_to_read',      label: 'Want to read' },
  { key: 'did_not_finish',    label: 'Did not finish' },
];

export default function MyShelf() {
  const navigate = useNavigate();
  const { currentUser, getUserBooks, getBook, users } = useApp();
  const [tab, setTab] = useState<Tab>('read');

  if (!currentUser) return null;

  const allUserBooks = getUserBooks(currentUser.id);
  const filtered = allUserBooks.filter(ub => ub.status === tab);

  const counts: Record<Tab, number> = {
    read:              allUserBooks.filter(ub => ub.status === 'read').length,
    currently_reading: allUserBooks.filter(ub => ub.status === 'currently_reading').length,
    want_to_read:      allUserBooks.filter(ub => ub.status === 'want_to_read').length,
    did_not_finish:    allUserBooks.filter(ub => ub.status === 'did_not_finish').length,
  };

  return (
    <Layout title="My Shelf">
      {/* Stats row */}
      <div className="flex gap-4 mb-6 text-sm flex-wrap">
        <span className="text-earth-500"><strong className="text-earth-800">{counts.read}</strong> read</span>
        <span className="text-earth-500"><strong className="text-earth-800">{counts.currently_reading}</strong> reading</span>
        <span className="text-earth-500"><strong className="text-earth-800">{counts.want_to_read}</strong> want to read</span>
        {counts.did_not_finish > 0 && (
          <span className="text-earth-500"><strong className="text-earth-800">{counts.did_not_finish}</strong> DNF</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-earth-200 mb-5 -mx-4 px-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'text-terracotta-600 border-b-2 border-terracotta-500 -mb-px'
                : 'text-earth-400 hover:text-earth-600'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-earth-400">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      {/* Book grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">
            {tab === 'read' ? '📚' : tab === 'currently_reading' ? '📖' : tab === 'did_not_finish' ? '🚧' : '🔖'}
          </p>
          <p className="font-serif text-earth-600 font-semibold">
            {tab === 'read' ? 'Nothing read yet'
              : tab === 'currently_reading' ? 'Not reading anything yet'
              : tab === 'did_not_finish' ? 'No abandoned books — nice!'
              : 'No books saved yet'}
          </p>
          <p className="text-earth-400 text-sm mt-1">
            Search for a book to add it to your shelf.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="mt-4 px-5 py-2.5 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 transition-colors"
          >
            Find a book →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {filtered.map(ub => {
            const book = getBook(ub.bookId);
            if (!book) return null;
            const recommender = ub.recommendedBy ? users.find(u => u.id === ub.recommendedBy) : undefined;

            return (
              <div
                key={ub.id}
                className="cursor-pointer"
                onClick={() => navigate(`/book/${book.id}`)}
              >
                <div className="relative">
                  <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-full shadow-sm" />
                  {/* Recommender avatar badge on cover */}
                  {recommender && (
                    <div
                      className="absolute -top-2 -right-2 ring-2 ring-white rounded-full"
                      title={`${recommender.displayName.split(' ')[0]} mentioned this`}
                    >
                      <UserAvatar initials={recommender.avatarInitials} color={recommender.avatarColor} src={recommender.avatarUrl} size="xs" />
                    </div>
                  )}
                  {/* Progress bar for currently reading */}
                  {ub.status === 'currently_reading' && ub.progress !== undefined && ub.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-earth-200 rounded-b">
                      <div
                        className="h-full bg-terracotta-500 rounded-b transition-all"
                        style={{ width: `${ub.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                <p className="font-serif text-earth-800 text-xs font-semibold mt-1.5 leading-tight line-clamp-2">
                  {book.title}
                </p>

                {/* "from [Name]" under title */}
                {recommender && (
                  <p className="text-earth-400 text-xs mt-0.5">
                    from {recommender.displayName.split(' ')[0]}
                  </p>
                )}

                {ub.rating && (
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${ratingBg(ub.rating)}`}>
                    {ratingEmoji(ub.rating)}
                  </span>
                )}

                {ub.status === 'currently_reading' && ub.progress !== undefined && ub.progress > 0 && (
                  <p className="text-xs text-earth-400 mt-0.5">{ub.progress}%</p>
                )}

                {ub.hotTake && (
                  <p className="text-xs text-earth-400 italic mt-1 line-clamp-2">"{ub.hotTake}"</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
