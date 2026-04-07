import type { NextAuthConfig } from 'next-auth';

// Edge-compatible auth config (no Node.js APIs)
// Used by middleware for session checking only
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');
      if (isDashboard && !isLoggedIn) return false;
      return true;
    },
  },
};
