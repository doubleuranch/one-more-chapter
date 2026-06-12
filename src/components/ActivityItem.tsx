import { useNavigate } from 'react-router-dom';
import type { FeedItem } from '../types';
import { useApp } from '../context/AppContext';
import { timeAgo, ratingEmoji, ratingBg, ratingLabel } from '../lib/utils';
import UserAvatar from './UserAvatar';
import BookCover from './BookCover';

interface Props {
  item: FeedItem;
}

function actionText(type: FeedItem['type'], bookTitle: string, rating?: FeedItem['rating']): string {
  switch (type) {
    case 'rated': return rating ? `gave "${bookTitle}" a ${ratingEmoji(rating)}` : `rated "${bookTitle}"`;
    case 'added_to_list': return `added "${bookTitle}" to their list`;
    case 'started_reading': return `started reading "${bookTitle}"`;
    case 'finished': return `finished "${bookTitle}"`;
  }
}

const REACTION_OPTIONS = ['❤️', '🔥', '😂'] as const;
const REACTION_LABELS: Record<string, string> = { '❤️': 'Same!', '🔥': 'Hot take!', '😂': 'Relatable' };

export default function ActivityItem({ item }: Props) {
  const navigate = useNavigate();
  const { getUser, getBook, currentUser, toggleReaction } = useApp();
  const user = getUser(item.userId);
  const book = getBook(item.bookId);
  if (!user || !book) return null;

  const myId = currentUser?.id;

  return (
    <div className="bg-white rounded-2xl border border-earth-200 p-4 flex gap-3">
      <button onClick={() => navigate(`/profile/${user.username}`)} className="shrink-0">
        <UserAvatar initials={user.avatarInitials} color={user.avatarColor} src={user.avatarUrl} size="md" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-earth-700 text-sm leading-snug">
            <button
              onClick={() => navigate(`/profile/${user.username}`)}
              className="font-semibold text-earth-800 hover:text-terracotta-600"
            >
              {user.displayName}
            </button>{' '}
            <span>{actionText(item.type, book.title, item.rating)}</span>
          </p>
          <span className="text-xs text-earth-400 shrink-0 mt-0.5">{timeAgo(item.timestamp)}</span>
        </div>

        <div className="flex gap-3">
          <div
            className="flex gap-3 flex-1 cursor-pointer min-w-0"
            onClick={() => navigate(`/book/${book.id}${item.userId !== myId ? `?from=${item.userId}` : ''}`)}
          >
            <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-10 shrink-0" />
            <div className="min-w-0">
              <p className="font-serif text-earth-800 text-sm font-semibold leading-tight line-clamp-1">{book.title}</p>
              <p className="text-earth-400 text-xs">{book.author}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {item.rating && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ratingBg(item.rating)}`}>
                    {ratingEmoji(item.rating)} {ratingLabel(item.rating)}
                  </span>
                )}
                {item.format && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-earth-100 text-earth-500">
                    {item.format === 'listened' ? '🎧 Audiobook' : '📖 Read'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Add to shelf shortcut — only on other people's activity */}
          {item.userId !== myId && (
            <button
              onClick={() => navigate(`/book/${book.id}?from=${item.userId}`)}
              className="shrink-0 self-center px-2.5 py-1.5 rounded-full bg-terracotta-50 border border-terracotta-200 text-terracotta-600 text-xs font-medium hover:bg-terracotta-100 transition-colors whitespace-nowrap"
            >
              + Add
            </button>
          )}
        </div>

        {item.hotTake && (
          <blockquote className="mt-3 border-l-2 border-terracotta-300 pl-3 text-sm text-earth-600 italic leading-snug">
            "{item.hotTake}"
          </blockquote>
        )}

        {/* Reactions */}
        <div className="flex items-center gap-1.5 mt-3">
          {REACTION_OPTIONS.map(emoji => {
            const reaction = item.reactions?.find(r => r.emoji === emoji);
            const count = reaction?.userIds.length ?? 0;
            const isMine = myId ? reaction?.userIds.includes(myId) : false;
            return (
              <button
                key={emoji}
                onClick={() => myId && toggleReaction(item.id, emoji)}
                title={REACTION_LABELS[emoji]}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs transition-colors ${
                  isMine
                    ? 'bg-terracotta-100 text-terracotta-700 border border-terracotta-300'
                    : count > 0
                    ? 'bg-earth-100 text-earth-600 border border-earth-200 hover:bg-earth-200'
                    : 'text-earth-300 hover:text-earth-500 hover:bg-earth-50 border border-transparent'
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="font-medium">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
