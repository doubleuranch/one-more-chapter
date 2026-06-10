import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AVATAR_COLORS } from '../data/mockData';
import UserAvatar from '../components/UserAvatar';
import { signInWithEmail } from '../lib/supabase';

type Step = 'profile' | 'sent';

export default function Register() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { currentUser, initialized } = useApp();

  // Redirect if already signed in
  useEffect(() => {
    if (initialized && currentUser) navigate('/feed', { replace: true });
  }, [initialized, currentUser, navigate]);

  const [step, setStep] = useState<Step>('profile');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim() || !email.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Store profile data so onAuthStateChange can apply it after magic link click
      localStorage.setItem('omc_pending_profile', JSON.stringify({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        avatarColor,
        avatarInitials: initials,
        inviteCode: inviteCode?.toUpperCase() ?? '',
      }));

      const { error: authError } = await signInWithEmail(email.trim().toLowerCase());
      if (authError) {
        localStorage.removeItem('omc_pending_profile');
        setError(authError.message);
      } else {
        setStep('sent');
      }
    } catch {
      localStorage.removeItem('omc_pending_profile');
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'sent') {
    return (
      <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">✉️</div>
          <h2 className="font-serif font-bold text-earth-800 text-2xl">Check your email!</h2>
          <p className="text-earth-500 text-sm">
            We sent a sign-in link to <strong className="text-earth-700">{email}</strong>.
            Click it and you'll land straight in the club.
          </p>
          <div className="flex justify-center pt-2">
            <UserAvatar initials={initials} color={avatarColor} size="lg" />
          </div>
          <p className="text-xs text-earth-400">
            Can't find it? Check your spam folder, or{' '}
            <button
              onClick={() => setStep('profile')}
              className="underline hover:text-earth-600"
            >
              go back and try again
            </button>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-3xl mb-2">🎉</div>
          <h1 className="font-serif font-bold text-earth-800 text-3xl">Join the club</h1>
          <p className="text-earth-500 mt-2 text-sm">
            Invite code accepted: <strong className="text-forest-600">{inviteCode}</strong>
          </p>
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
              placeholder="Erin W."
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
                placeholder="erin"
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
            <p className="text-xs text-earth-400 mt-1.5">We'll send a magic link — no password needed.</p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-terracotta-500 text-white rounded-xl font-medium text-sm hover:bg-terracotta-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Sending link…' : 'Start reading →'}
          </button>
        </form>
      </div>
    </div>
  );
}
