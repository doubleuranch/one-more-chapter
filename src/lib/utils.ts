import type { Rating } from '../types';

export function timeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ratingLabel(rating: Rating): string {
  const map: Record<Rating, string> = {
    thumbs_up: 'Loved it',
    so_so: 'It was okay',
    thumbs_down: "Didn't finish",
  };
  return map[rating];
}

export function ratingEmoji(rating: Rating): string {
  const map: Record<Rating, string> = {
    thumbs_up: '👍',
    so_so: '👉',
    thumbs_down: '👎',
  };
  return map[rating];
}

export function ratingBg(rating: Rating): string {
  const map: Record<Rating, string> = {
    thumbs_up: 'bg-terracotta-100 text-terracotta-700',
    so_so: 'bg-earth-200 text-earth-700',
    thumbs_down: 'bg-forest-100 text-forest-700',
  };
  return map[rating];
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + '…';
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
