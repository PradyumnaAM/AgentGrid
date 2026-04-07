import path from 'path';
import fs from 'fs/promises';
import bcrypt from 'bcryptjs';

const USERS_FILE = path.resolve(process.cwd(), 'data', 'users.json');

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export async function createUser(name: string, email: string, password: string): Promise<StoredUser> {
  const users = await readUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email already registered');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user: StoredUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    email: email.toLowerCase(),
    passwordHash,
  };
  users.push(user);
  await writeUsers(users);
  return user;
}

export async function verifyUser(email: string, password: string): Promise<{ id: string; name: string; email: string } | null> {
  const users = await readUsers();
  const user = users.find((u) => u.email === email.toLowerCase());
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, name: user.name, email: user.email };
}
