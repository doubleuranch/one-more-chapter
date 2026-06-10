import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateInviteCode, signInWithEmail } from '../lib/supabase';

type Tab = 'signin' | 'invite';
type SignInStep = 'input' | 'sent';

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('signin');

  // Sign-in tab state
  const [email, setEmail] = useState('');
  const [signInStep, setSignInStep] = useState<SignInStep>('input');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState('');

  // Invite tab state
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setSignInLoading(true);
    setSignInError('');
    try {
      const { error } = await signInWithEmail(trimmed);
      if (error) {
        setSignInError(error.message);
      } else {
        setSignInStep('sent');
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
                {signInStep === 'input' ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <p className="text-sm text-earth-600">
                      We'll email you a magic link — no password needed.
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
                  </form>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <div className="text-3xl">✉️</div>
                    <p className="font-medium text-earth-800">Check your email!</p>
                    <p className="text-sm text-earth-500">
                      We sent a sign-in link to <strong className="text-earth-700">{email}</strong>.
                      Click it to get in — no password needed.
                    </p>
                    <button
                      onClick={() => { setSignInStep('input'); setEmail(''); }}
                      className="text-xs text-earth-400 hover:text-earth-600 underline mt-2"
                    >
                      Use a different email
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
