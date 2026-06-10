import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import BookCover from '../components/BookCover';
import UserAvatar from '../components/UserAvatar';

export default function ClubShelf() {
  const navigate = useNavigate();
  const {
    clubBooks, getBook, users,
    currentUser,
    voteForBook, unvoteBook, removeNomination,
  } = useApp();

  const nominated = clubBooks
    .filter(cb => cb.status === 'nominated')
    .sort((a, b) => b.votes.length - a.votes.length);

  return (
    <Layout title="Book Nominations">

      {/* Header note */}
      <div className="bg-terracotta-50 border border-terracotta-200 rounded-2xl p-4 mb-6">
        <p className="font-serif font-semibold text-terracotta-800">Nominate your next read</p>
        <p className="text-terracotta-600 text-sm mt-1">
          Find a book on the Search page and tap "Nominate for Club Vote" to add it here.
          Vote for the ones you want most — the admin will choose based on votes and add it to an upcoming meeting.
        </p>
      </div>

      {/* Nominations list */}
      {nominated.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-earth-300 p-10 text-center">
          <p className="text-3xl mb-2">🗳️</p>
          <p className="font-serif text-earth-600 font-semibold text-lg">No nominations yet</p>
          <p className="text-earth-400 text-sm mt-1 mb-4">Be the first — find a book and nominate it for the club.</p>
          <button
            onClick={() => navigate('/search')}
            className="px-5 py-2.5 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 transition-colors"
          >
            Find a book to nominate →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {nominated.map((cb, i) => {
            const book      = getBook(cb.bookId);
            if (!book) return null;
            const hasVoted   = currentUser ? cb.votes.includes(currentUser.id) : false;
            const isNominator = currentUser?.id === cb.addedBy;
            const nominator  = users.find(u => u.id === cb.addedBy);
            const maxVotes   = Math.max(...nominated.map(n => n.votes.length), 1);
            const pct        = Math.round((cb.votes.length / maxVotes) * 100);

            return (
              <div
                key={cb.id}
                className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${hasVoted ? 'border-terracotta-300' : 'border-earth-200'}`}
              >
                <div className="p-4">
                  <div className="flex gap-3">
                    {/* Rank + cover */}
                    <div className="relative shrink-0">
                      {i === 0 && nominated[0].votes.length > 0 && (
                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-terracotta-500 rounded-full flex items-center justify-center z-10">
                          <span className="text-white text-[10px] font-bold">1</span>
                        </div>
                      )}
                      <button onClick={() => navigate(`/book/${book.id}`)}>
                        <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-16 shadow-sm" />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <button onClick={() => navigate(`/book/${book.id}`)} className="text-left group">
                        <h3 className="font-serif font-bold text-earth-800 text-base leading-tight group-hover:text-terracotta-600 transition-colors">
                          {book.title}
                        </h3>
                        <p className="text-earth-400 text-sm">{book.author}</p>
                      </button>
                      {nominator && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <UserAvatar initials={nominator.avatarInitials} color={nominator.avatarColor} size="xs" />
                          <span className="text-xs text-earth-400">by {nominator.displayName.split(' ')[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Vote count */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-earth-800 text-xl">{cb.votes.length}</p>
                      <p className="text-xs text-earth-400">vote{cb.votes.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Vote bar */}
                  <div className="h-1.5 bg-earth-100 rounded-full overflow-hidden my-3">
                    <div
                      className={`h-full rounded-full transition-all ${hasVoted ? 'bg-terracotta-500' : 'bg-earth-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Voter avatars */}
                  {cb.votes.length > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      {cb.votes.slice(0, 6).map(uid => {
                        const u = users.find(u => u.id === uid);
                        return u ? <UserAvatar key={uid} initials={u.avatarInitials} color={u.avatarColor} size="xs" /> : null;
                      })}
                      {cb.votes.length > 6 && <span className="text-xs text-earth-400">+{cb.votes.length - 6}</span>}
                    </div>
                  )}

                  {/* Actions */}
                  {currentUser && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => hasVoted ? unvoteBook(cb.id) : voteForBook(cb.id)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                          hasVoted
                            ? 'bg-terracotta-50 text-terracotta-600 border border-terracotta-300 hover:bg-terracotta-100'
                            : 'bg-terracotta-500 text-white hover:bg-terracotta-600'
                        }`}
                      >
                        {hasVoted ? '✓ Voted · Remove' : 'Vote for this'}
                      </button>

                      {/* Nominator can withdraw their own nomination */}
                      {(isNominator || currentUser.isAdmin) && (
                        <button
                          onClick={() => removeNomination(cb.id)}
                          className="px-3 py-2 rounded-xl text-sm font-medium bg-earth-100 text-earth-500 hover:bg-earth-200 transition-colors whitespace-nowrap"
                          title={currentUser.isAdmin ? 'Remove from nominations' : 'Withdraw your nomination'}
                        >
                          {currentUser.isAdmin && !isNominator ? '✓ Remove' : 'Withdraw'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <button
            onClick={() => navigate('/search')}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-earth-300 text-sm font-medium text-earth-400 hover:border-terracotta-300 hover:text-terracotta-600 hover:bg-terracotta-50 transition-colors"
          >
            + Nominate another book
          </button>
        </div>
      )}
    </Layout>
  );
}
