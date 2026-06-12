import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AVATAR_COLORS } from '../data/mockData';
import UserAvatar from '../components/UserAvatar';
import { validateInviteCode, signUpWithPassword } from '../lib/supabase';

export default function Register() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { currentUser, initialized } = useApp();

  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already signed in
  useEffect(() => {
    if (initialized && currentUser) navigate('/feed', { replace: true });
  }, [initialized, currentUser, navigate]);

  // Validate the invite code on load
  useEffect(() => {
    if (!inviteCode) { setCodeValid(false); return; }
    validateInviteCode(inviteCode).then(setCodeValid);
  }, [inviteCode]);

  const initials = displayName.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim() || !email.trim() || !password) return;
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');

    try {
      // Store profile so onAuthStateChange can apply it after signup
      localStorage.setItem('omc_pending_profile', JSON.stringify({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        avatarColor,
        avatarInitials: initials,
      }));

      const { error: authError } = await signUpWithPassword(
        email.trim().toLowerCase(),
        password,
        {
          username: username.trim().toLowerCase(),
          display_name: displayName.trim(),
          avatar_initials: initials,
          avatar_color: avatarColor,
        },
      );
      if (authError) {
        localStorage.removeItem('omc_pending_profile');
        setError(authError.message);
      }
      // On success, onAuthStateChange fires → applies profile → navigates to /feed
    } catch {
      localStorage.removeItem('omc_pending_profile');
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Still checking the code
  if (codeValid === null) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center">
        <p className="text-earth-400 text-sm animate-pulse">Checking invite…</p>
      </div>
    );
  }

  // Invalid code
  if (!codeValid) {
    return (
      <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center px-4 gap-4">
        <div className="text-3xl">🔒</div>
        <h2 className="font-serif font-bold text-earth-800 text-xl">Invalid invite link</h2>
        <p className="text-earth-500 text-sm text-center">
          This link isn't valid. Ask a club member for the correct invite link.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-3xl mb-2">🎉</div>
          <h1 className="font-serif font-bold text-earth-800 text-3xl">Join the club</h1>
          <p className="text-earth-500 mt-2 text-sm">Create your account to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-earth-200 shadow-sm p-6 space-y-5">

          {/* Avatar preview + color picker */}
          <div className="flex justify-center">
            <UserAvatar initials={initials} color={avatarColor} size="lg" />
          </div>
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

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-earth-700 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm text-earth-800 placeholder-earth-300 focus:outline-none focus:border-terracotta-400 bg-earth-50"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-earth-700 block mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                autoComplete="new-password"
                className="w-full border border-earth-200 rounded-xl px-4 py-3 pr-10 text-sm text-earth-800 placeholder-earth-300 focus:outline-none focus:border-terracotta-400 bg-earth-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-600 text-xs"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-terracotta-500 text-white rounded-xl font-medium text-sm hover:bg-terracotta-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Start reading →'}
          </button>
        </form>

        <p className="text-center text-xs text-earth-400 mt-4">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="underline hover:text-earth-600">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
