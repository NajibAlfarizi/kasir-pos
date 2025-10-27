// API route untuk autentikasi admin

import { authenticate, ensureAdminExists } from '@/lib/auth';

export async function POST(req: Request) {
  await ensureAdminExists();
  const { email, password } = await req.json();
  const user = await authenticate(email, password);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Email atau password salah' }), { status: 401 });
  }
  // Simulasi session: return user info (implementasi session/cookie bisa ditambah)
  return new Response(JSON.stringify({ user }), { status: 200 });
}
