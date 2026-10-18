import Link from "next/link";

// Placeholder so the landing-page links work. The case screens (docs/API.md "Screens") come next.
export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-6">
      <span className="rounded-md bg-firstlight px-2.5 py-1 text-xs font-semibold text-serpent-dark">Demo data</span>
      <h1 className="font-serif text-5xl text-lead">Case {caseId}</h1>
      <p className="text-lg text-ink-2">The case screens are being built next: overview, bill explanation, payments, chat, refunds and the audit log.</p>
      <Link href="/" className="font-semibold text-serpent hover:text-serpent-dark">
        ← Back to the home page
      </Link>
    </main>
  );
}
