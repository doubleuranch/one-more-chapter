import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseKey)

// Sign in with magic link — no password needed
export async function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + '/feed',
    },
  })
}

// Sign up with email + password (requires email confirmations OFF in Supabase Auth settings)
export async function signUpWithPassword(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

// Check if an invite code exists (shared/reusable code — no used_by check)
export async function validateInviteCode(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('id, expires_at')
    .ilike('code', code)
    .maybeSingle()
  if (error || !data) return false
  if (data.expires_at && new Date(data.expires_at) < new Date()) return false
  return true
}

// Mark an invite code as used after a user completes registration
export async function consumeInviteCode(code: string, userId: string) {
  return supabase
    .from('invite_codes')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('code', code.toUpperCase())
}
