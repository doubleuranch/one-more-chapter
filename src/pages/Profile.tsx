import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ratingEmoji, ratingBg } from '../lib/utils';
import Layout from '../components/Layout';
import UserAvatar from '../components/UserAvatar';
import BookCover from '../components/BookCover';
import EditProfileModal from '../components/EditProfileModal';

type Tab = 'read' | 'want_to_read' | 'currently_reading';

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { users, currentUser, getUserBooks, getBook, followUser, unfollowUser, logout, updateProfile, notifications, markNotificationRead } = useApp();
  const [tab, setTab] = useState<Tab>('read');
  const [showEditModal, setShowEditModal] = useState(false);

  const profileUser = username ? users.find(u => u.username === username) : currentUser;
  const isOwn = profileUser?.id === currentUser?.id;

  if (!profileUser) return (
    <Layout>
      <div className="text-center py-20 text-earth-500">User not found.</div>
    </Layout>
  );

  const isFollowing = currentUser?.following.includes(profileUser.id) ?? false;
  const allUserBooks = getUserBooks(profileUser.id);
  const filtered = allUserBooks.filter(ub => ub.status === tab);
  const booksRead = allUserBooks.filter(ub => ub.status === 'read').length;
  const wantToRead = allUserBooks.filter(ub => ub.status === 'want_to_read').length;
  const currentlyReading = allUserBooks.filter(ub => ub.status === 'currently_reading').length;

  // Books recommended to me by club members (own profile only)
  const recommendedToMe = isOwn
    ? notifications
        .filter(n => n.recipientId === currentUser?.id && n.type === 'recommended' && n.bookId && n.fromUserId)
        .reduce<{ bookId: string; fromUserId: string; notifId: string }[]>((acc, n) => {
          if (!acc.find(r => r.bookId === n.bookId)) {
            acc.push({ bookId: n.bookId!, fromUserId: n.fromUserId!, notifId: n.id });
          }
          return acc;
        }, [])
    : [];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'read', label: 'Read', count: booksRead },
    { key: 'currently_reading', label: 'Reading', count: currentlyReading },
    { key: 'want_to_read', label: 'Want to read', count: wantToRead },
  ];

  return (
    <Layout noPadding>
      <div className="max-w-2xl mx-auto md:mx-0">
        {/* Header */}
        <div className="bg-earth-100 px-4 md:px-6 pt-8 pb-6">
          <div className="flex items-start gap-4">
            <UserAvatar initials={profileUser.avatarInitials} color={profileUser.avatarColor} src={profileUser.avatarUrl} size="lg" />
            <div className="flex-1 min-w-0">
              <h1 className="font-serif font-bold text-earth-800 text-2xl">{profileUser.displayName}</h1>
              <p className="text-earth-400 text-sm">
                @{profileUser.username}
                {profileUser.joinedDate && (
                  <span className="ml-2 text-earth-300">· member since {profileUser.joinedDate.split('-')[0]}</span>
                )}
              </p>
              {profileUser.tagline && (
                <p className="text-terracotta-600 text-sm italic mt-1">{profileUser.tagline}</p>
              )}
              {profileUser.bio && <p className="text-earth-600 text-sm mt-1.5 leading-snug">{profileUser.bio}</p>}
              <div className="flex gap-4 mt-3 text-sm">
                <span className="text-earth-500"><strong className="text-earth-800">{booksRead}</strong> read</span>
                <span className="text-earth-500"><strong className="text-earth-800">{profileUser.following.length}</strong> following</span>
                <span className="text-earth-500"><strong className="text-earth-800">{profileUser.followers.length}</strong> followers</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            {isOwn ? (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2.5 bg-white border border-earth-300 text-earth-700 rounded-xl text-sm font-medium hover:bg-earth-50 transition-colors"
                >
                  Edit profile
                </button>
                <button
                  onClick={() => navigate('/wrapped')}
                  className="flex-1 py-2.5 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 transition-colors"
                >
                  ✨ Year Wrapped
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2.5 bg-earth-200 text-earth-600 rounded-xl text-sm font-medium hover:bg-earth-300 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : currentUser ? (
              <button
                onClick={() => isFollowing ? unfollowUser(profileUser.id) : followUser(profileUser.id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${isFollowing ? 'bg-earth-100 text-earth-600 hover:bg-earth-200' : 'bg-terracotta-500 text-white hover:bg-terracotta-600'}`}
              >
                {isFollowing ? 'Following ✓' : '+ Follow'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Followers preview */}
        {profileUser.following.length > 0 && (
          <div className="px-4 md:px-6 py-4 bg-white border-b border-earth-100">
            <p className="text-xs font-medium text-earth-500 mb-2">Following</p>
            <div className="flex items-center gap-2">
              {profileUser.following.slice(0, 6).map(uid => {
                const u = users.find(u => u.id === uid);
                if (!u) return null;
                return (
                  <button key={uid} onClick={() => navigate(`/profile/${u.username}`)} title={u.displayName}>
                    <UserAvatar initials={u.avatarInitials} color={u.avatarColor} src={u.avatarUrl} size="sm" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommended for you */}
        {recommendedToMe.length > 0 && (
          <div className="px-4 md:px-6 py-4 bg-white border-b border-earth-100">
            <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-3">Recommended for you</p>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
              {recommendedToMe.map(({ bookId, fromUserId, notifId }) => {
                const book = getBook(bookId);
                const recommender = users.find(u => u.id === fromUserId);
                if (!book || !recommender) return null;
                return (
                  <button
                    key={bookId}
                    onClick={() => { markNotificationRead(notifId); navigate(`/book/${book.id}`); }}
                    className="shrink-0 w-20 text-left group"
                  >
                    <div className="relative">
                      <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-full shadow-sm group-hover:shadow-md transition-shadow" />
                      <div className="absolute -top-2 -right-2 ring-2 ring-white rounded-full">
                        <UserAvatar initials={recommender.avatarInitials} color={recommender.avatarColor} size="xs" />
                      </div>
                    </div>
                    <p className="font-serif text-earth-800 text-xs font-semibold mt-2 leading-tight line-clamp-2">{book.title}</p>
                    <p className="text-earth-400 text-xs mt-0.5">from {recommender.displayName.split(' ')[0]}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-earth-200 bg-white px-4 md:px-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${tab === t.key ? 'text-terracotta-600 border-b-2 border-terracotta-500 -mb-px' : 'text-earth-400 hover:text-earth-600'}`}
            >
              {t.label} <span className="text-xs text-earth-400">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Book grid */}
        <div className="px-4 md:px-6 py-5 pb-24 md:pb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-earth-400 text-sm">Nothing here yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filtered.map(ub => {
                const book = getBook(ub.bookId);
                if (!book) return null;
                const recommender = ub.recommendedBy ? users.find(u => u.id === ub.recommendedBy) : undefined;
                return (
                  <div key={ub.id} className="cursor-pointer" onClick={() => navigate(`/book/${book.id}`)}>
                    <div className="relative">
                      <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-full shadow-sm" />
                      {recommender && (
                        <div className="absolute -top-2 -right-2 ring-2 ring-white rounded-full" title={`${recommender.displayName.split(' ')[0]} mentioned this`}>
                          <UserAvatar initials={recommender.avatarInitials} color={recommender.avatarColor} size="xs" />
                        </div>
                      )}
                    </div>
                    <p className="font-serif text-earth-800 text-xs font-semibold mt-1.5 leading-tight line-clamp-2">{book.title}</p>
                    {recommender && (
                      <p className="text-earth-400 text-xs mt-0.5">from {recommender.displayName.split(' ')[0]}</p>
                    )}
                    {ub.rating && (
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${ratingBg(ub.rating)}`}>
                        {ratingEmoji(ub.rating)}
                      </span>
                    )}
                    {ub.hotTake && (
                      <p className="text-xs text-earth-400 italic mt-1 line-clamp-2">"{ub.hotTake}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showEditModal && currentUser && isOwn && (
        <EditProfileModal
          user={currentUser}
          onSave={updates => { updateProfile(updates); setShowEditModal(false); }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </Layout>
  );
}
