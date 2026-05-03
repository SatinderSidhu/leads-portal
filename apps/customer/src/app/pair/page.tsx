import { getCustomerSession } from "../../lib/session";
import { prisma } from "@leads-portal/database";
import PairConfirmClient from "./PairConfirmClient";

export const dynamic = "force-dynamic";

export default async function PairPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await getCustomerSession();

  // Invalid / missing token
  if (!token) {
    return <PairError title="Missing pairing code" body="Open this page from the QR code on the kiosk." />;
  }

  const pairing = await prisma.pairingSession.findUnique({
    where: { token },
    select: { status: true, expiresAt: true },
  });

  if (!pairing) {
    return <PairError title="Invalid pairing code" body="Try scanning the QR code on the kiosk again." />;
  }

  const expired = pairing.status === "PENDING" && pairing.expiresAt < new Date();
  if (expired || pairing.status === "EXPIRED") {
    return <PairError title="Pairing code expired" body="Tap 'Try again' on the kiosk to get a fresh code." />;
  }

  if (pairing.status === "LINKED" || pairing.status === "REDEEMED") {
    return (
      <PairSuccess
        title="You're signed in"
        body="Return to the kiosk — it'll continue automatically."
      />
    );
  }

  // Status is PENDING — need user action
  if (!session) {
    // Send to login with returnTo back here
    const returnTo = encodeURIComponent(`/pair?token=${token}`);
    return (
      <PairLoggedOut returnTo={returnTo} />
    );
  }

  // Authed → show explicit confirm
  return <PairConfirmClient token={token} userName={session.name} userEmail={session.email} />;
}

/* ── Server-rendered states ── */

function PairShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2870a8] via-[#01358d] to-[#101b63] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        {children}
      </div>
    </div>
  );
}

function PairError({ title, body }: { title: string; body: string }) {
  return (
    <PairShell>
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm text-gray-600">{body}</p>
    </PairShell>
  );
}

function PairSuccess({ title, body }: { title: string; body: string }) {
  return (
    <PairShell>
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm text-gray-600">{body}</p>
    </PairShell>
  );
}

function PairLoggedOut({ returnTo }: { returnTo: string }) {
  return (
    <PairShell>
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-[#01358d]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in to continue on the kiosk</h1>
      <p className="text-sm text-gray-600 mb-6">
        You&apos;re about to sign in to <strong>KITLabs App Factory</strong> on the kiosk. Choose a sign-in method below.
      </p>
      <div className="space-y-2">
        <a
          href={`/api/auth/google?returnTo=${returnTo}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-medium text-sm hover:bg-gray-50 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </a>
      </div>
      <p className="text-xs text-gray-400 mt-6">
        After signing in, you&apos;ll get a chance to confirm before the kiosk continues.
      </p>
    </PairShell>
  );
}
