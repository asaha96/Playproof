import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  SignInButton,
  SignUpButton,
  SignOutButton,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

function Shield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}

export default async function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Shield className="size-5 text-primary" />
          PlayProof
        </Link>
        <div className="flex items-center gap-3">
          {!userId ? (
            <>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Get Started</Button>
              </SignUpButton>
            </>
          ) : (
            <>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
              <UserButton />
              <SignOutButton>
                <Button variant="ghost" size="sm">Sign Out</Button>
              </SignOutButton>
            </>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
