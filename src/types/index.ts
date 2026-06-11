export type Rating = 'thumbs_up' | 'so_so' | 'thumbs_down';
export type BookStatus = 'read' | 'want_to_read' | 'currently_reading' | 'did_not_finish';
export type ClubBookStatus = 'reading' | 'read' | 'nominated';
export type BookFormat = 'read' | 'listened';
export type SwapStatus = 'available' | 'requested' | 'borrowed' | 'returned';

export interface User {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  tagline: string;
  avatarColor: string;
  avatarInitials: string;
  avatarUrl?: string;
  favoriteAuthor?: string;
  favoriteBook?: string;
  following: string[];
  followers: string[];
  joinedDate: string;
  isAdmin?: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  description: string;
  publishedYear: number;
  genre: string;
  pageCount: number;
}

export interface UserBook {
  id: string;
  userId: string;
  bookId: string;
  status: BookStatus;
  format?: BookFormat;
  rating?: Rating;
  hotTake?: string;
  vibeTags?: string[];
  progress?: number;
  dateAdded: string;
  dateRead?: string;
  recommendedBy?: string; // user ID of whoever mentioned this book
}

export interface ClubBook {
  id: string;
  bookId: string;
  status: ClubBookStatus;
  addedBy: string;
  startDate?: string;
  endDate?: string;
  votes: string[];
  host?: string;
  cakeNote?: string;
  cakeImageUrl?: string;
  editorNote?: string;
}

export interface FeedItem {
  id: string;
  userId: string;
  type: 'rated' | 'added_to_list' | 'started_reading' | 'finished';
  bookId: string;
  rating?: Rating;
  hotTake?: string;
  format?: BookFormat;
  timestamp: string;
  reactions?: { emoji: string; userIds: string[] }[];
}

export interface ClubEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  virtualLink?: string;
  bookId?: string;
  description?: string;
  host?: string;
  rsvps: { userId: string; status: 'yes' | 'maybe' | 'no' }[];
  createdBy: string;
}

export type NotificationType =
  | 'recommended'
  | 'reaction'
  | 'event_reminder'
  | 'friend_rated'
  | 'borrow_request'
  | 'borrow_accepted';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  fromUserId?: string;
  bookId?: string;
  eventId?: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface SwapBook {
  id: string;
  userId: string;
  bookId: string;
  note?: string;
  status: SwapStatus;
  requestedBy?: string;
  borrowedAt?: string;
  createdAt: string;
}

export interface SwapRequest {
  id: string;
  bookId: string;
  requesterId: string;
  note?: string;
  fulfilledBy?: string;
  fulfilled: boolean;
  createdAt: string;
}

export interface GoogleBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  description?: string;
  publishedYear?: number;
  pageCount?: number;
}
