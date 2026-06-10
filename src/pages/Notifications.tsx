import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import UserAvatar from '../components/UserAvatar';
import BookCover from '../components/BookCover';
import type { Notification } from '../types';
import { timeAgo } from '../lib/utils';

const TYPE_ICONS: Record<Notification['type'], string> = {
  recommended: '📖',
  reaction: '✨',
  event_reminder: '📅',
  friend_rated: '👍',
  borrow_request: '📦',
  borrow_accepted: '✅',
};

function NotifItem({ notif, onTap }: { notif: Notification; onTap: () => void }) {
  const { getUser, getBook, markNotificationRead } = useApp();
  const fromUser = notif.fromUserId ? getUser(notif.fromUserId) : undefined;
  const book = notif.bookId ? getBook(notif.bookId) : undefined;

  const handleTap = () => {
    markNotificationRead(notif.id);
    onTap();
  };

  return (
    <button
      onClick={handleTap}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${
        notif.read ? 'bg-white hover:bg-earth-50' : 'bg-terracotta-50 hover:bg-terracotta-100/60'
      }`}
    >
      <div className="shrink-0 relative">
        {fromUser ? (
          <UserAvatar initials={fromUser.avatarInitials} color={fromUser.avatarColor} size="sm" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-earth-200 flex items-center justify-center text-base">
            {TYPE_ICONS[notif.type]}
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
}

export default function Notifications() {
  const navigate = useNavigate();
  const { currentUser, notifications, markAllNotificationsRead } = useApp();

  const myNotifs = notifications
    .filter(n => n.recipientId === currentUser?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const unread = myNotifs.filter(n => !n.read);
  const read = myNotifs.filter(n => n.read);

  const getNavTarget = (notif: Notification) => {
    if (notif.bookId) return `/book/${notif.bookId}`;
    if (notif.eventId) return '/events';
    return '/feed';
  };

  return (
    <Layout
      title="Notifications"
      headerRight={
        unread.length > 0 ? (
          <button
            onClick={markAllNotificationsRead}
            className="text-xs text-terracotta-600 font-medium hover:text-terracotta-700"
          >
            Mark all read
          </button>
        ) : undefined
      }
    >
      {myNotifs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-serif text-earth-700 text-lg font-semibold">All quiet here</p>
          <p className="text-earth-400 text-sm mt-1">When your club is active, you'll see it here.</p>
        </div>
      ) : (
        <div className="-mx-4 md:-mx-6">
          {unread.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide px-4 md:px-6 pb-2">New</p>
              <div className="divide-y divide-earth-100">
                {unread.map(n => (
                  <NotifItem key={n.id} notif={n} onTap={() => navigate(getNavTarget(n))} />
                ))}
              </div>
            </div>
          )}

          {read.length > 0 && (
            <div className={unread.length > 0 ? 'mt-4' : ''}>
              {unread.length > 0 && (
                <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide px-4 md:px-6 pb-2">Earlier</p>
              )}
              <div className="divide-y divide-earth-100">
                {read.map(n => (
                  <NotifItem key={n.id} notif={n} onTap={() => navigate(getNavTarget(n))} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
