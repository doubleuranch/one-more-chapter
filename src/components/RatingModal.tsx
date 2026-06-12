import { useState } from 'react';
import type { Rating, Book, BookFormat } from '../types';
import BookCover from './BookCover';
import VibeTag from './VibeTag';

const VIBE_OPTIONS = [
  'unputdownable', 'will make you cry', 'cozy rainy day', 'beach read',
  'slow burn worth it', 'thought provoking', 'comfort read', 'dark but compelling',
  'feminist icon', 'important book', 'fantasy fix', 'multigenerational',
  'epic', 'cozy vibes',
];

interface ThumbProps {
  direction: 'up' | 'side' | 'down';
  selected: boolean;
  onClick: () => void;
  label: string;
}

function ThumbButton({ direction, selected, onClick, label }: ThumbProps) {
  const rotation = direction === 'up' ? '0deg' : direction === 'side' ? '-90deg' : '180deg';
  const colors = selected
    ? direction === 'up'
      ? 'bg-terracotta-500 text-white border-terracotta-500'
      : direction === 'side'
      ? 'bg-earth-500 text-white border-earth-500'
      : 'bg-forest-600 text-white border-forest-600'
    : 'bg-white text-earth-400 border-earth-300 hover:border-earth-400';

  return (
    <button
      key={selected ? `${direction}-on` : `${direction}-off`}
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-5 py-4 rounded-xl border-2 transition-colors ${selected ? 'thumb-pop' : ''} ${colors}`}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style={{ transform: `rotate(${rotation})` }}>
        <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83V19c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.07-.17.11-.34.11-.52v-1.98c0-.01-.01-.03-.01-.04v-.29z" />
      </svg>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

interface Props {
  book: Book;
  existingRating?: Rating;
  existingHotTake?: string;
  existingVibeTags?: string[];
  existingFormat?: BookFormat;
  onSave: (rating: Rating, hotTake?: string, vibeTags?: string[], format?: BookFormat) => void;
  onClose: () => void;
}

export default function RatingModal({ book, existingRating, existingHotTake, existingVibeTags, existingFormat, onSave, onClose }: Props) {
  const [rating, setRating] = useState<Rating | null>(existingRating ?? null);
  const [hotTake, setHotTake] = useState(existingHotTake ?? '');
  const [vibes, setVibes] = useState<string[]>(existingVibeTags ?? []);
  const [format, setFormat] = useState<BookFormat>(existingFormat ?? 'read');

  // Custom vibes the user has added — seeded from any saved tags not in the preset list
  const [customVibes, setCustomVibes] = useState<string[]>(
    (existingVibeTags ?? []).filter(t => !VIBE_OPTIONS.includes(t))
  );
  const [addingVibe, setAddingVibe] = useState(false);
  const [newVibeText, setNewVibeText] = useState('');

  const allVibes = [...VIBE_OPTIONS, ...customVibes];

  const toggleVibe = (tag: string) =>
    setVibes(v => v.includes(tag) ? v.filter(t => t !== tag) : [...v, tag]);

  const commitNewVibe = () => {
    const tag = newVibeText.trim().toLowerCase();
    setNewVibeText('');
    setAddingVibe(false);
    if (!tag) return;
    // If it matches an existing vibe (preset or custom), just select it
    if (allVibes.includes(tag)) {
      if (!vibes.includes(tag)) setVibes(v => [...v, tag]);
      return;
    }
    setCustomVibes(c => [...c, tag]);
    setVibes(v => [...v, tag]); // auto-select the new tag
  };

  const handleSave = () => {
    if (!rating) return;
    onSave(rating, hotTake.trim() || undefined, vibes.length ? vibes : undefined, format);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-earth-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <BookCover src={book.coverUrl} title={book.title} author={book.author} className="w-14" />
            <div>
              <h3 className="font-serif font-bold text-earth-800 text-lg leading-tight">{book.title}</h3>
              <p className="text-earth-500 text-sm">{book.author}</p>
            </div>
          </div>

          {/* Read vs Listened toggle */}
          <div className="mb-5">
            <p className="text-earth-700 font-medium text-sm mb-2">How did you experience it?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat('read')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${format === 'read' ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-700' : 'border-earth-200 text-earth-500 hover:border-earth-300'}`}
              >
                📖 Read it
              </button>
              <button
                type="button"
                onClick={() => setFormat('listened')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${format === 'listened' ? 'border-forest-500 bg-forest-50 text-forest-700' : 'border-earth-200 text-earth-500 hover:border-earth-300'}`}
              >
                🎧 Listened
              </button>
            </div>
          </div>

          <p className="text-earth-700 font-medium mb-3 text-sm">How was it?</p>
          <div className="flex gap-3 mb-5">
            <ThumbButton direction="up" selected={rating === 'thumbs_up'} onClick={() => setRating('thumbs_up')} label="Loved it" />
            <ThumbButton direction="side" selected={rating === 'so_so'} onClick={() => setRating('so_so')} label="It was okay" />
            <ThumbButton direction="down" selected={rating === 'thumbs_down'} onClick={() => setRating('thumbs_down')} label="Didn't like it" />
          </div>

          <div className="mb-5">
            <label className="text-earth-700 font-medium text-sm block mb-2">
              Hot take <span className="text-earth-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={hotTake}
              onChange={e => setHotTake(e.target.value)}
              maxLength={150}
              rows={2}
              placeholder="One line. No essays. Just the truth."
              className="w-full rounded-xl border border-earth-200 bg-earth-50 px-4 py-3 text-sm text-earth-800 placeholder-earth-400 resize-none focus:outline-none focus:border-terracotta-400"
            />
            <div className="text-right text-xs text-earth-400 mt-1">{hotTake.length}/150</div>
          </div>

          <div className="mb-6">
            <p className="text-earth-700 font-medium text-sm mb-2">Vibes <span className="text-earth-400 font-normal">(pick any)</span></p>
            <div className="flex flex-wrap gap-2">
              {allVibes.map(tag => (
                <VibeTag key={tag} tag={tag} selected={vibes.includes(tag)} onClick={() => toggleVibe(tag)} />
              ))}

              {/* Inline "add your own vibe" control */}
              {addingVibe ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={newVibeText}
                    onChange={e => setNewVibeText(e.target.value.slice(0, 32))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); commitNewVibe(); }
                      if (e.key === 'Escape') { setAddingVibe(false); setNewVibeText(''); }
                    }}
                    onBlur={() => { if (!newVibeText.trim()) { setAddingVibe(false); setNewVibeText(''); } }}
                    placeholder="your vibe…"
                    className="text-xs px-2.5 py-1 rounded-full border-2 border-terracotta-300 bg-terracotta-50 text-earth-800 placeholder-earth-400 focus:outline-none focus:border-terracotta-500 w-28"
                  />
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()} // prevent input blur before click
                    onClick={commitNewVibe}
                    disabled={!newVibeText.trim()}
                    className="text-xs px-2.5 py-1 rounded-full bg-terracotta-500 text-white font-medium hover:bg-terracotta-600 disabled:opacity-40 transition-colors"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingVibe(true)}
                  className="text-xs px-2.5 py-1 rounded-full border border-dashed border-earth-300 text-earth-400 hover:border-terracotta-400 hover:text-terracotta-500 transition-colors font-medium"
                >
                  + add your own
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-earth-300 text-earth-600 font-medium text-sm hover:bg-earth-50 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={!rating} className="flex-1 py-3 rounded-xl bg-terracotta-500 text-white font-medium text-sm hover:bg-terracotta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
