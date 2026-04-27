import { cookies } from 'next/headers';
import { createServerSupabase } from './supabase';

function getAllowlist() {
  const raw = process.env.ADMIN_EMAIL_ALLOWLIST ?? '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedEmail(email: string | null | undefined) {
  const allowlist = getAllowlist();
  if (allowlist.length === 0) return false;
  if (!email) return false;
  return allowlist.includes(email.toLowerCase());
}

export async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_access_token')?.value;
  if (!token) return null;

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  if (!isAllowedEmail(data.user.email)) return null;
  return data.user;
}

export async function requireAdminUser() {
  const user = await getAdminUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
