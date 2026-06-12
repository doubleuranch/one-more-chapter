import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Book } from '../types';
import { useApp } from '../context/AppContext';
import { ratingEmoji, ratingBg } from '../lib/utils';
import BookCover from './BookCover';
import RatingModal from './RatingModal';

interface Props {
  book: Book;
  showActions?: boolean;
  compact?: boolean;
}

export default function BookCard({ book, showActions = true, compact = false }: Props) {
  const navigate = useNavigate();
  const { getUserBook, rateBook, setBookStatus, removeBook, currentUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const userBook = currentUser ? getUserBook(book.id) : undefined;

  const handleRate = () => { setShowMenu(false); setShowModal(true); };

  const handleAddToList = () => {
    setBookStatus(book.id, 'want_to_read');
    setShowMenu(false);
  };

  const handleCurrentlyReading = () => {
    setBookStatus(book.id, 'currently_reading', 0);
    setShowMenu(false);
  };

  const handleRemove = () => { removeBook(book.id); setShowMenu(false); };

  const statusBadge = () => {
    if (!userBook) return null;
    if (userBook.status === 'currently_reading') {
      return <span className="text-xs bg-forest-100 text-forest-700 px-2 py-0.5 rounded-full font-medium">Reading</span>;
    }
    if (userBook.status === 'want_to_read') {
      return <span className="text-xs bg-earth-200 text-earth-600 px-2 py-0.5 rounded-full font-medium">Want to read</span>;
    }
    if (userBook.rating) {
      return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ratingBg(userBook.rating)}`}>
          {ratingEmoji(userBook.rating)}
        </span>
      );
    }
    return null;
  };

  return (
    <>
      <div className="relative group">
        <div
          className="cursor-pointer"
          onClick={() => navigate(`/book/${book.id}`)}
        >
          <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-full shadow-sm" />
          {!compact && (
            <div className="mt-2">
              <p className="font-serif text-earth-800 text-sm font-semibold leading-tight line-clamp-2">{book.title}</p>
              <p className="text-earth-500 text-xs mt-0.5 line-clamp-1">{book.author}</p>
              <div className="mt-1">{statusBadge()}</div>
            </div>
          )}
        </div>

        {showActions && currentUser && (
          <div className="absolute top-1.5 right-1.5">
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(m => !m); }}
              className="w-7 h-7 rounded-full bg-white/90 text-earth-600 text-sm flex items-center justify-center shadow hover:bg-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              ···
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-earth-200 py-1 z-10 min-w-[160px]" onClick={e => e.stopPropagation()}>
                <button onClick={handleRate} className="w-full text-left px-4 py-2.5 text-sm text-earth-700 hover:bg-earth-50">
                  {userBook?.rating ? '✏️ Edit rating' : '👍 Rate this book'}
                </button>
                {userBook?.status !== 'currently_reading' && (
                  <button onClick={handleCurrentlyReading} className="w-full text-left px-4 py-2.5 text-sm text-earth-700 hover:bg-earth-50">
                    📖 Currently reading
                  </button>
                )}
                {userBook?.status !== 'want_to_read' && (
                  <button onClick={handleAddToList} className="w-full text-left px-4 py-2.5 text-sm text-earth-700 hover:bg-earth-50">
                    🔖 Want to read
                  </button>
                )}
                {userBook && (
                  <button onClick={handleRemove} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                    Remove from shelf
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <RatingModal
          book={book}
          existingRating={userBook?.rating}
          existingHotTake={userBook?.hotTake}
          existingVibeTags={userBook?.vibeTags}
          existingFormat={userBook?.format}
          onSave={(rating, hotTake, vibeTags, format) => { rateBook(book.id, rating, hotTake, vibeTags, format); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
