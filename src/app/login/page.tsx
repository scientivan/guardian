import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { EntryFrame } from "@/components/app/EntryFrame";
import { Section } from "@/components/app/ui";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { DemoSignIn } from "@/components/auth/DemoSignIn";
import { appDestination } from "@/lib/auth-redirect";
import { authOptions, googleAuthConfigured } from "@/server/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const params = await searchParams;
  const destination = appDestination(params.callbackUrl);
  const configured = googleAuthConfigured();
  if (process.env.NEXTAUTH_SECRET && await getServerSession(authOptions)) redirect(destination);

  return (
    <EntryFrame title="Welcome to Guardian" working={["clerk"]}>
      <Section title="Open your app" agent="clerk">
        <p className="mb-6 max-w-lg text-lg leading-relaxed text-lead">Sign in with Google to manage your care cases, or explore Guardian with a demo account.</p>
        {params.error && <p role="alert" className="mb-5 rounded-xl bg-danger-soft p-4 text-sm text-danger-ink">Sign-in didn’t finish. Try again with your Google account.</p>}
        {configured ? (
          <GoogleSignIn callbackUrl={destination} />
        ) : (
          <p role="status" className="mb-5 rounded-xl bg-warn-soft p-4 text-sm text-warn-ink">Google sign-in is being set up. Please try again once setup is complete.</p>
        )}
        <div className="mt-4"><DemoSignIn /></div>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-serpent-dark hover:underline">Back to Guardian</Link>
      </Section>
    </EntryFrame>
  );
}
