import { auth } from '@/auth';
import { LandingAnimated } from '@/components/landing/LandingAnimated';

export default async function LandingPage() {
  const session = await auth();
  return (
    <LandingAnimated
      isLoggedIn={!!session?.user}
      userFirstName={session?.user?.name?.split(' ')[0]}
    />
  );
}
