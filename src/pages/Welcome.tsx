import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AVATAR_COLORS } from '../data/mockData';
import UserAvatar from '../components/UserAvatar';

export default function Welcome() {
  const navigate = useNavigate();
  const { currentUser, initialized, needsProfileSetup, completeProfileSetup } = useApp();

  // Redirect if already fully set up
  useEffect(() => {
    if (initialized && currentUser && !needsProfileSetup) {
      navigate('/feed', { replace: true });
    }
    // No session at all → go to login
    if (initialized && !currentUser && !needsProfileSetup) {
      navigate('/login', { replace: true });
    }
  }, [initialized, currentUser, needsProfileSetup, navigate]);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initials = displayName.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim()) return;
    setLoading(true);
    setError('');
    try {
      await completeProfileSetup(displayName, username, avatarColor);
      navigate('/feed', { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-3xl mb-2">📚</div>
          <h1 className="font-serif font-bold text-earth-800 text-3xl">Welcome to the club!</h1>
          <p className="text-earth-500 mt-2 text-sm">
            Set up your profile and you're in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-earth-200 shadow-sm p-6 space-y-5">

          {/* Avatar preview */}
          <div className="flex justify-center">
            <UserAvatar initials={initials} color={avatarColor} size="lg" />
          </div>

          {/* Color picker */}
          <div className="flex gap-2 justify-center flex-wrap">
            {AVATAR_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  avatarColor === color ? 'border-earth-800 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Display name */}
          <div>
            <label className="text-sm font-medium text-earth-700 block mb-1.5">Your name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Sarah M."
              required
              className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm text-earth-800 placeholder-earth-300 focus:outline-none focus:border-terracotta-400 bg-earth-50"
            />
          </div>

          {/* Username */}
          <div>
            <label className="text-sm font-medium text-earth-700 block mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-400 text-sm">@</span>
              <input
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="sarah"
                required
                className="w-full border border-earth-200 rounded-xl pl-7 pr-4 py-3 text-sm text-earth-800 placeholder-earth-300 focus:outline-none focus:border-terracotta-400 bg-earth-50"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-terracotta-500 text-white rounded-xl font-medium text-sm hover:bg-terracotta-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Setting up…' : 'Enter the club →'}
          </button>
        </form>
      </div>
    </div>
  );
}
