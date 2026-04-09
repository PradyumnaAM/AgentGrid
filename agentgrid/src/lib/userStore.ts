import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function createUser(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
    },
  });
  return { id: user.id, name: user.name, email: user.email };
}

export async function verifyUser(email: string, password: string): Promise<{ id: string; name: string; email: string } | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, name: user.name, email: user.email };
}
