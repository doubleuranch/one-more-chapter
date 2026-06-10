import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import BookCover from '../components/BookCover';
import UserAvatar from '../components/UserAvatar';

export default function Voting() {
  const { clubBooks, getBook, getUser, voteForBook, unvoteBook, currentUser, users, setClubBookStatus } = useApp();

  const nominated = clubBooks
    .filter(cb => cb.status === 'nominated')
    .sort((a, b) => b.votes.length - a.votes.length);

  const hasPassToken = true; // mock

  return (
    <Layout title="Vote on Next Pick">
      <div className="mb-6">
        <div className="bg-terracotta-50 border border-terracotta-200 rounded-2xl p-4">
          <p className="font-serif font-semibold text-terracotta-800 text-base">Voting round is open</p>
          <p className="text-terracotta-600 text-sm mt-1">
            Cast your vote for November's pick. Top book wins. You have{' '}
            <strong>{hasPassToken ? '1 pass token' : 'no pass tokens'}</strong> left.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {nominated.map((cb, i) => {
          const book = getBook(cb.bookId);
          if (!book) return null;
          const hasVoted = currentUser ? cb.votes.includes(currentUser.id) : false;
          const voteCount = cb.votes.length;
          const maxVotes = Math.max(...nominated.map(n => n.votes.length), 1);
          const pct = Math.round((voteCount / maxVotes) * 100);
          const addedBy = getUser(cb.addedBy);

          return (
            <div key={cb.id} className={`bg-white rounded-2xl border-2 transition-all ${hasVoted ? 'border-terracotta-400' : 'border-earth-200'} overflow-hidden`}>
              <div className="p-4">
                <div className="flex gap-3 mb-3">
                  <div className="relative">
                    {i === 0 && (
                      <div className="absolute -top-1 -left-1 w-5 h-5 bg-terracotta-500 rounded-full flex items-center justify-center z-10">
                        <span className="text-white text-xs font-bold">1</span>
                      </div>
                    )}
                    <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-16 shadow-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-earth-800 text-base leading-tight">{book.title}</h3>
                    <p className="text-earth-400 text-sm">{book.author}</p>
                    {addedBy && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <UserAvatar initials={addedBy.avatarInitials} color={addedBy.avatarColor} size="xs" />
                        <span className="text-xs text-earth-400">nominated by {addedBy.displayName}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-earth-800 text-xl">{voteCount}</p>
                    <p className="text-xs text-earth-400">vote{voteCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Vote bar */}
                <div className="h-1.5 bg-earth-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${hasVoted ? 'bg-terracotta-500' : 'bg-earth-300'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Voters */}
                {cb.votes.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-3">
                    {cb.votes.slice(0, 5).map(uid => {
                      const u = users.find(u => u.id === uid);
                      if (!u) return null;
                      return <UserAvatar key={uid} initials={u.avatarInitials} color={u.avatarColor} size="xs" />;
                    })}
                    {cb.votes.length > 5 && (
                      <span className="text-xs text-earth-400">+{cb.votes.length - 5} more</span>
                    )}
                  </div>
                )}

                {currentUser && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => hasVoted ? unvoteBook(cb.id) : voteForBook(cb.id)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        hasVoted
                          ? 'bg-terracotta-50 text-terracotta-600 border border-terracotta-300 hover:bg-terracotta-100'
                          : 'bg-terracotta-500 text-white hover:bg-terracotta-600'
                      }`}
                    >
                      {hasVoted ? '✓ Voted · Remove vote' : 'Vote for this book'}
                    </button>
                    {currentUser.isAdmin && (
                      <button
                        onClick={() => setClubBookStatus(cb.id, 'reading')}
                        className="px-3 py-2.5 rounded-xl text-sm font-medium bg-forest-100 text-forest-700 hover:bg-forest-200 transition-colors whitespace-nowrap"
                        title="Make this the club's current pick"
                      >
                        📚 Make the pick
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {nominated.length === 0 && (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">📚</p>
          <p className="font-serif text-earth-700 text-lg">No books nominated yet</p>
          <p className="text-earth-400 text-sm mt-1">Add books to your Want to Read list to nominate them</p>
        </div>
      )}
    </Layout>
  );
}
