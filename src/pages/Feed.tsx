import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import ActivityItem from '../components/ActivityItem';
import UserAvatar from '../components/UserAvatar';
import BookCover from '../components/BookCover';
import { SkeletonActivityItem } from '../components/Skeleton';
import { timeAgo } from '../lib/utils';
import type { Notification } from '../types';

const NOTIF_ICONS: Record<Notification['type'], string> = {
  recommended:    '📖',
  reaction:       '✨',
  event_reminder: '📅',
  friend_rated:   '👍',
  borrow_request: '📦',
  borrow_accepted:'✅',
};

type Tab = 'all' | 'following' | 'for_you' | 'mine';

export default function Feed() {
  const navigate = useNavigate();
  const { feedItems, currentUser, notifications, getUser, getBook, markNotificationRead, markAllNotificationsRead, unreadCount, loading } = useApp();
  const [tab, setTab] = useState<Tab>('all');

  const myNotifs = notifications
    .filter(n => n.recipientId === currentUser?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filtered = feedItems.filter(item => {
    if (tab === 'mine') return item.userId === currentUser?.id;
    if (tab === 'following' && currentUser) return currentUser.following.includes(item.userId);
    if (tab === 'for_you') return false; // handled separately
    return true;
  });

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'all',       label: 'Everyone' },
    { key: 'following', label: 'Following' },
    { key: 'for_you',   label: 'For You', badge: unreadCount },
    { key: 'mine',      label: 'My Activity' },
  ];

  return (
    <Layout
      title="Activity"
      headerRight={
        <button
          onClick={() => navigate('/search')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-earth-100 text-earth-600 hover:bg-earth-200 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </button>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              tab === t.key ? 'bg-terracotta-500 text-white' : 'bg-earth-100 text-earth-600 hover:bg-earth-200'
            }`}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold leading-none ${
                tab === t.key ? 'bg-white/30 text-white' : 'bg-terracotta-500 text-white'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* For You tab — notifications */}
      {tab === 'for_you' ? (
        myNotifs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔔</p>
            <p className="font-serif text-earth-700 text-lg font-semibold">All quiet</p>
            <p className="text-earth-400 text-sm mt-1">When someone recommends a book or reacts to your take, it'll show here.</p>
          </div>
        ) : (
          <div>
            {unreadCount > 0 && (
              <div className="flex justify-end mb-3">
                <button onClick={markAllNotificationsRead} className="text-xs text-terracotta-600 font-medium hover:text-terracotta-700">
                  Mark all read
                </button>
              </div>
            )}
            <div className="space-y-2">
              {myNotifs.map(notif => {
                const fromUser = notif.fromUserId ? getUser(notif.fromUserId) : undefined;
                const book = notif.bookId ? getBook(notif.bookId) : undefined;
                return (
                  <button
                    key={notif.id}
                    onClick={() => {
                      markNotificationRead(notif.id);
                      if (notif.bookId) navigate(`/book/${notif.bookId}`);
                      else if (notif.eventId) navigate('/events');
                    }}
                    className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-colors ${
                      notif.read
                        ? 'bg-white border-earth-200 hover:bg-earth-50'
                        : 'bg-terracotta-50 border-terracotta-200 hover:bg-terracotta-100/60'
                    }`}
                  >
                    <div className="shrink-0 relative">
                      {fromUser ? (
                        <UserAvatar initials={fromUser.avatarInitials} color={fromUser.avatarColor} src={fromUser.avatarUrl} size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-earth-200 flex items-center justify-center text-base">
                          {NOTIF_ICONS[notif.type]}
                        </div>
                      )}
                      {!notif.read && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-terracotta-500 rounded-full ring-2 ring-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${notif.read ? 'text-earth-600' : 'text-earth-800 font-medium'}`}>
                        {notif.text}
                      </p>
                      <p className="text-xs text-earth-400 mt-0.5">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {book && (
                      <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-8 shrink-0 rounded-md" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonActivityItem key={i} />)}
        </div>
      ) : (
        /* Feed items tabs */
        filtered.length === 0 ? (
          <div className="text-center py-16">
            {tab === 'following' ? (
              <>
                <p className="text-4xl mb-3">👥</p>
                <p className="font-serif text-earth-700 text-lg font-semibold">No activity yet</p>
                <p className="text-earth-400 text-sm mt-1 max-w-xs mx-auto">Follow your fellow readers to see what they're reading and loving</p>
              </>
            ) : tab === 'mine' ? (
              <>
                <p className="text-4xl mb-3">✍️</p>
                <p className="font-serif text-earth-700 text-lg font-semibold">Your story starts here</p>
                <p className="text-earth-400 text-sm mt-1 max-w-xs mx-auto">Rate a book, start reading something, or add to your shelf — it'll show up here</p>
              </>
            ) : (
              <>
                <p className="text-4xl mb-3">📖</p>
                <p className="font-serif text-earth-700 text-lg font-semibold">All quiet in the club</p>
                <p className="text-earth-400 text-sm mt-1">Be the first to rate something this week</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </div>
        )
      )}
    </Layout>
  );
}
