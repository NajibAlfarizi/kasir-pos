import prisma from './prisma';

const ADMIN_EMAIL = 'admin@kasir.com';
const ADMIN_PASSWORD = '123456';
const ADMIN_NAME = 'Admin';

export async function ensureAdminExists() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: ADMIN_NAME,
      },
    });
  }
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (user.password !== password) return null;
  return { id: user.id, email: user.email, name: user.name };
}
