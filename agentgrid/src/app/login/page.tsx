import Link from 'next/link';
import { Bot, ArrowRight } from 'lucide-react';
import { signIn } from '@/auth';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AuthError } from 'next-auth';

interface LoginPageProps {
  searchParams?: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) redirect('/dashboard');
  const params = searchParams ? await searchParams : undefined;
  const error = params?.error;
  const errorMessage =
    error === 'credentials'
      ? 'Invalid email or password. Please try again.'
      : error === 'oauth'
        ? 'Unable to sign in with OAuth. Please try again.'
        : error === 'auth'
          ? 'Authentication failed. Please try again.'
          : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.2),transparent_35%),radial-gradient(circle_at_85%_90%,rgba(56,189,248,0.14),transparent_35%)]" />
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_20px_80px_-35px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04]">
            <Bot className="h-4 w-4 text-violet-300" />
          </div>
          <div>
            <p className="text-base font-semibold">Welcome back</p>
            <p className="text-sm text-zinc-400">Sign in to continue to AgentGrid</p>
          </div>
        </div>

        {/* Google OAuth */}
        <form
          action={async () => {
            'use server';
            try {
              await signIn('google', { redirectTo: '/dashboard' });
            } catch {
              redirect('/login?error=oauth');
            }
          }}
        >
          <button
            type="submit"
            className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.10]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <div className="relative mb-4 flex items-center gap-3">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <form
          action={async (formData: FormData) => {
            'use server';
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            try {
              await signIn('credentials', { email, password, redirectTo: '/dashboard' });
            } catch (error) {
              if (error instanceof AuthError) {
                if (error.type === 'CredentialsSignin') {
                  redirect('/login?error=credentials');
                }
                redirect('/login?error=auth');
              }
              throw error;
            }
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-zinc-300">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none ring-violet-400/40 transition focus:ring-2"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-zinc-300">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none ring-violet-400/40 transition focus:ring-2"
            />
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            Sign In
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-violet-300 hover:text-violet-200">
            Create one
          </Link>
        </p>
        <Link
          href="/"
          className="mt-3 block text-center text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}
