import { useState, useRef } from 'react';
import type { User } from '../types';
import { AVATAR_COLORS } from '../data/mockData';
import UserAvatar from './UserAvatar';

async function resizeImage(file: File, maxDim = 200): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = url;
  });
}

interface Props {
  user: User;
  onSave: (updates: Partial<Pick<User, 'displayName' | 'bio' | 'tagline' | 'avatarUrl' | 'avatarColor' | 'favoriteAuthor' | 'favoriteBook'>>) => void;
  onClose: () => void;
}

export default function EditProfileModal({ user, onSave, onClose }: Props) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [tagline, setTagline] = useState(user.tagline ?? '');
  const [favoriteAuthor, setFavoriteAuthor] = useState(user.favoriteAuthor ?? '');
  const [favoriteBook, setFavoriteBook] = useState(user.favoriteBook ?? '');
  const [avatarColor, setAvatarColor] = useState(user.avatarColor);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const resized = await resizeImage(file, 200);
    setAvatarUrl(resized);
    setUploading(false);
  };

  const handleSave = () => {
    if (!displayName.trim()) return;
    onSave({
      displayName: displayName.trim(),
      bio: bio.trim(),
      tagline: tagline.slice(0, 50),
      avatarUrl,
      avatarColor,
      favoriteAuthor: favoriteAuthor.trim() || undefined,
      favoriteBook: favoriteBook.trim() || undefined,
    });
    onClose();
  };

  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || user.avatarInitials;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-earth-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif font-bold text-earth-800 text-lg">Edit profile</h3>
            <button onClick={onClose} className="text-earth-400 hover:text-earth-600 text-xl leading-none">✕</button>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-5">
            <div className="relative mb-3">
              <UserAvatar initials={initials} color={avatarColor} src={avatarUrl} size="lg" />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-terracotta-500 text-white rounded-full flex items-center justify-center text-sm shadow hover:bg-terracotta-600 transition-colors"
                title="Upload photo"
              >
                {uploading ? '…' : '📷'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {avatarUrl && (
              <button onClick={() => setAvatarUrl(undefined)} className="text-xs text-earth-400 hover:text-red-500 mb-2">
                Remove photo
              </button>
            )}
            {!avatarUrl && (
              <div className="flex gap-2 flex-wrap justify-center">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAvatarColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${avatarColor === c ? 'border-earth-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Display name */}
          <div className="mb-4">
            <label className="text-sm font-medium text-earth-700 block mb-1.5">Name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm text-earth-800 focus:outline-none focus:border-terracotta-400 bg-earth-50"
            />
          </div>

          {/* Tagline */}
          <div className="mb-4">
            <label className="text-sm font-medium text-earth-700 block mb-1.5">
              Tagline <span className="text-earth-400 font-normal">(50 chars)</span>
            </label>
            <input
              value={tagline}
              onChange={e => setTagline(e.target.value.slice(0, 50))}
              placeholder="Your reading vibe in one line…"
              className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm text-earth-800 focus:outline-none focus:border-terracotta-400 bg-earth-50"
            />
            <div className="text-right text-xs text-earth-400 mt-1">{tagline.length}/50</div>
          </div>

          {/* Bio */}
          <div className="mb-4">
            <label className="text-sm font-medium text-earth-700 block mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder="A little about your reading life…"
              className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm text-earth-800 focus:outline-none focus:border-terracotta-400 bg-earth-50 resize-none"
            />
          </div>

          {/* Favorite author */}
          <div className="mb-4">
            <label className="text-sm font-medium text-earth-700 block mb-1.5">
              Favorite author <span className="text-earth-400 font-normal">(optional)</span>
            </label>
            <input
              value={favoriteAuthor}
              onChange={e => setFavoriteAuthor(e.target.value)}
              placeholder="e.g. Donna Tartt"
              className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm text-earth-800 focus:outline-none focus:border-terracotta-400 bg-earth-50"
            />
          </div>

          {/* Favorite book */}
          <div className="mb-6">
            <label className="text-sm font-medium text-earth-700 block mb-1.5">
              Favorite book <span className="text-earth-400 font-normal">(optional)</span>
            </label>
            <input
              value={favoriteBook}
              onChange={e => setFavoriteBook(e.target.value)}
              placeholder="e.g. The Secret History"
              className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm text-earth-800 focus:outline-none focus:border-terracotta-400 bg-earth-50"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-earth-300 text-earth-600 font-medium text-sm hover:bg-earth-50 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="flex-1 py-3 rounded-xl bg-terracotta-500 text-white font-medium text-sm hover:bg-terracotta-600 transition-colors">
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
