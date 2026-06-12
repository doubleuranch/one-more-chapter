import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateInviteCode, signInWithPassword, signInWithEmail } from '../lib/supabase';

type Tab = 'signin' | 'invite';
type SignInMode = 'password' | 'magic';
type MagicStep = 'input' | 'sent';

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('signin');

  // Password sign-in
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState('');

  // Magic link fallback
  const [signInMode, setSignInMode] = useState<SignInMode>('password');
  const [magicStep, setMagicStep] = useState<MagicStep>('input');

  // Invite tab state
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) return;
    setSignInLoading(true);
    setSignInError('');
    try {
      const { error } = await signInWithPassword(trimmedEmail, password);
      if (error) {
        setSignInError(
          error.message.toLowerCase().includes('invalid')
            ? 'Wrong email or password — give it another try.'
            : error.message
        );
      } else {
        navigate('/feed');
      }
    } catch {
      setSignInError('Something went wrong. Please try again.');
    } finally {
      setSignInLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;
    setSignInLoading(true);
    setSignInError('');
    try {
      const { error } = await signInWithEmail(trimmedEmail);
      if (error) {
        setSignInError(error.message);
      } else {
        setMagicStep('sent');
      }
    } catch {
      setSignInError('Something went wrong. Please try again.');
    } finally {
      setSignInLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    setInviteLoading(true);
    setInviteError('');
    try {
      const valid = await validateInviteCode(code);
      if (valid) {
        navigate(`/register/${code}`);
      } else {
        setInviteError("That code isn't valid or has already been used. Check the link your friend sent you.");
      }
    } catch {
      setInviteError('Something went wrong. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const switchMode = (mode: SignInMode) => {
    setSignInMode(mode);
    setSignInError('');
    setMagicStep('input');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-4xl mb-3">📚</div>
          <h1 className="font-serif font-bold text-earth-800 text-4xl leading-tight">
            One More<br />Chapter
          </h1>
          <p className="text-earth-500 mt-3 text-base">Books are better with your people.</p>
        </div>

        <div className="bg-white rounded-2xl border border-earth-200 shadow-sm overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-earth-100">
            <button
              onClick={() => setTab('signin')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'signin' ? 'text-terracotta-600 border-b-2 border-terracotta-500 -mb-px' : 'text-earth-400 hover:text-earth-600'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setTab('invite')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'invite' ? 'text-terracotta-600 border-b-2 border-terracotta-500 -mb-px' : 'text-earth-400 hover:text-earth-600'
              }`}
            >
              I have an invite
            </button>
          </div>

          <div className="p-5">

            {/* ── Sign in tab ── */}
            {tab === 'signin' && (
              <>
                {signInMode === 'password' ? (
                  <form onSubmit={handlePasswordSignIn} className="space-y-4">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      autoComplete="email"
                      className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm text-earth-800 placeholder-earth-300 focus:outline-none focus:border-terracotta-400 bg-earth-50"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      autoComplete="current-password"
                      className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm text-earth-800 placeholder-earth-300 focus:outline-none focus:border-terracotta-400 bg-earth-50"
                    />
                    {signInError && (
                      <p className="text-xs text-red-500">{signInError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={signInLoading}
                      className="w-full py-3 bg-terracotta-500 text-white rounded-xl font-medium text-sm hover:bg-terracotta-600 transition-colors disabled:opacity-60"
                    >
                      {signInLoading ? 'Signing in…' : 'Sign in →'}
                    </button>
                    <p className="text-center text-xs text-earth-400">
                      Forgot your password?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('magic')}
                        className="text-terracotta-500 hover:underline"
                      >
                        Send a magic link instead
                      </button>
                    </p>
                  </form>
                ) : magicStep === 'input' ? (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <p className="text-sm text-earth-600">
                      We'll email you a sign-in link — no password needed.
                    </p>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      autoComplete="email"
                      className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm text-earth-800 placeholder-earth-300 focus:outline-none focus:border-terracotta-400 bg-earth-50"
                    />
                    {signInError && (
                      <p className="text-xs text-red-500">{signInError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={signInLoading}
                      className="w-full py-3 bg-terracotta-500 text-white rounded-xl font-medium text-sm hover:bg-terracotta-600 transition-colors disabled:opacity-60"
                    >
                      {signInLoading ? 'Sending…' : 'Send magic link →'}
                    </button>
                    <p className="text-center text-xs text-earth-400">
                      <button
                        type="button"
                        onClick={() => switchMode('password')}
                        className="text-terracotta-500 hover:underline"
                      >
                        ← Back to password sign-in
                      </button>
                    </p>
                  </form>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <div className="text-3xl">✉️</div>
                    <p className="font-medium text-earth-800">Check your email!</p>
                    <p className="text-sm text-earth-500">
                      We sent a sign-in link to <strong className="text-earth-700">{email}</strong>.
                      Click it to get in.
                    </p>
                    <button
                      onClick={() => switchMode('password')}
                      className="text-xs text-earth-400 hover:text-earth-600 underline mt-2"
                    >
                      ← Back to sign in
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── Invite tab ── */}
            {tab === 'invite' && (
              <form onSubmit={handleInvite} className="space-y-4">
                <p className="text-sm text-earth-600">
                  Got a link from a friend? Enter your invite code to join the club.
                </p>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="BOOKCLUB2024"
                  required
                  className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm text-earth-800 placeholder-earth-300 focus:outline-none focus:border-terracotta-400 bg-earth-50 uppercase tracking-widest"
                />
                {inviteError && (
                  <p className="text-xs text-red-500">{inviteError}</p>
                )}
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full py-3 bg-terracotta-500 text-white rounded-xl font-medium text-sm hover:bg-terracotta-600 transition-colors disabled:opacity-60"
                >
                  {inviteLoading ? 'Checking…' : 'Join the club →'}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
