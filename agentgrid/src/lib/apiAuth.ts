import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

export async function requireAuth(): Promise<
  { user: AuthUser; error: null } | { user: null; error: NextResponse }
> {
  const session = await auth();
  const user = session?.user as (AuthUser & { id?: string }) | undefined;

  if (!user?.id) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user: { id: user.id, name: user.name, email: user.email }, error: null };
}
