"use client";

import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Playproof, PlayproofProvider } from "playproof/react";

function Shield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}

function Gamepad2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="6" x2="10" y1="11" y2="11"/>
      <line x1="8" x2="8" y1="9" y2="13"/>
      <line x1="15" x2="15.01" y1="12" y2="12"/>
      <line x1="18" x2="18.01" y1="10" y2="10"/>
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>
    </svg>
  );
}

function Zap(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
    </svg>
  );
}

function BarChart3(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16"/>
      <path d="M7 16h8"/>
      <path d="M7 11h12"/>
      <path d="M7 6h3"/>
    </svg>
  );
}

function Bot(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 8V4H8"/>
      <rect width="16" height="12" x="4" y="8" rx="2"/>
      <path d="M2 14h2"/>
      <path d="M20 14h2"/>
      <path d="M15 13v2"/>
      <path d="M9 13v2"/>
    </svg>
  );
}

function Code2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m18 16 4-4-4-4"/>
      <path d="m6 8-4 4 4 4"/>
      <path d="m14.5 4-5 16"/>
    </svg>
  );
}

function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  );
}

function CheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}

const features = [
  {
    icon: Gamepad2,
    title: "Verification Deployments",
    description:
      "Replace CAPTCHAs with fast, branded deployments users complete in seconds.",
  },
  {
    icon: Bot,
    title: "Advanced Bot Detection",
    description: "AI-powered behavioral analysis distinguishes humans from bots through mouse movements and click patterns.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Sub-second verification with edge computing. No frustrating waiting or multiple challenges.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Monitor verification rates, bot attempts, and user experience metrics from your dashboard.",
  },
  {
    icon: Code2,
    title: "Simple Integration",
    description: "Drop-in SDK with just 3 lines of code. Works with React, Vue, and vanilla JavaScript.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "No fingerprinting or tracking. GDPR compliant by design with minimal data collection.",
  },
];

const deploymentTypes = [
  { name: "Mini Golf", description: "Precision-focused putting experience." },
  { name: "Basketball", description: "High-tempo shot selection." },
  { name: "Archery", description: "Targeted accuracy flow." },
  { name: "Bubble Pop", description: "Rapid pattern recognition." },
];

export default function LandingPage() {
  const { isSignedIn } = useUser();
  const [themeColors, setThemeColors] = useState({
    primary: "#e54d4d",
    secondary: "#f5f5f6",
    background: "#ffffff",
    surface: "#ffffff",
    text: "#0a0a0b",
    textMuted: "#737381",
    accent: "#f5f5f6",
    success: "#10b981",
    error: "#dc2626",
    border: "#e5e5e8",
  });

  // Detect theme and update colors from CSS variables
  useEffect(() => {
    const updateTheme = () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      // Helper to get computed color value (converts oklch to rgb)
      const getColor = (varName: string, fallback: string) => {
        const value = computedStyle.getPropertyValue(varName).trim();
        if (!value) return fallback;
        
        // If it's oklch, we need to convert it - but for now, use fallback colors
        // The browser will handle oklch conversion, so we can use a test element
        const testEl = document.createElement('div');
        testEl.style.color = value;
        testEl.style.position = 'absolute';
        testEl.style.visibility = 'hidden';
        document.body.appendChild(testEl);
        const rgb = getComputedStyle(testEl).color;
        document.body.removeChild(testEl);
        
        // If we got a valid rgb, use it, otherwise use fallback
        return rgb && rgb !== 'rgba(0, 0, 0, 0)' ? rgb : fallback;
      };
      
      const isDark = document.documentElement.classList.contains('dark');
      
      // Use theme-appropriate fallbacks
      if (isDark) {
        setThemeColors({
          primary: "#ef5a5a",
          secondary: "#27272a",
          background: "#0a0a0b",
          surface: "#18181b",
          text: "#fafafa",
          textMuted: "#a1a1aa",
          accent: "#27272a",
          success: "#10b981",
          error: "#f87171",
          border: "#27272a",
        });
      } else {
        setThemeColors({
          primary: "#e54d4d",
          secondary: "#f5f5f6",
          background: "#ffffff",
          surface: "#ffffff",
          text: "#0a0a0b",
          textMuted: "#737381",
          accent: "#f5f5f6",
          success: "#10b981",
          error: "#dc2626",
          border: "#e5e5e8",
        });
      }
    };

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Scroll animations
  const heroRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const deploymentsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
          }
        });
      },
      { threshold: 0.1 }
    );

    [heroRef, featuresRef, deploymentsRef].forEach((ref) => {
      if (ref.current) {
        ref.current.classList.add('opacity-0', 'translate-y-8', 'transition-all', 'duration-700');
        observer.observe(ref.current);
      }
    });

    // Trigger hero animation immediately
    if (heroRef.current) {
      setTimeout(() => {
        heroRef.current?.classList.add('opacity-100', 'translate-y-0');
        heroRef.current?.classList.remove('opacity-0', 'translate-y-8');
      }, 100);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 md:py-16 lg:py-20"
      >
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            <div className="h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div className="absolute right-0 top-1/4">
            <div className="h-[400px] w-[400px] rounded-full bg-chart-2/10 blur-3xl" />
          </div>
        </div>

        <h1 className="max-w-4xl text-center text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Human Verification with Generative{" "}
          <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
            Minigames
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-center text-lg text-muted-foreground md:text-xl">
          PlayProof replaces CAPTCHAs with engaging deployments. Better security,
          happier users, and advanced behavioral analysis to catch bots.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          {!isSignedIn ? (
            <>
              <SignUpButton mode="modal">
                <Button size="lg" className="gap-2">
                  Get Started Free
                  <ArrowRight className="size-4" />
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </SignInButton>
            </>
          ) : (
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                Go to Dashboard
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">99.9%</div>
            <div className="text-sm text-muted-foreground">Bot Detection Rate</div>
          </div>
          <Separator orientation="vertical" className="hidden h-12 md:block" />
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">&lt;5000ms</div>
            <div className="text-sm text-muted-foreground">Avg. Verification Time</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        ref={featuresRef}
        className="border-t bg-muted/30 flex min-h-screen flex-col items-center justify-center px-6 py-8"
      >
        <div className="mx-auto max-w-6xl w-full">
          <div className="text-center">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything you need to protect your app
            </h2>
            <p className="mt-4 text-muted-foreground">
              Built for developers who care about user experience and security.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="border-none bg-card/50 backdrop-blur transition-all duration-300 hover:bg-card hover:shadow-lg hover:scale-105 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Deployments Showcase */}
      <section 
        ref={deploymentsRef}
        className="flex min-h-screen flex-col items-center justify-center px-6 py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="outline" className="mb-4">Deployments</Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Verification that users actually enjoy
              </h2>
              <p className="mt-4 text-muted-foreground">
                Our deployment library keeps verification efficient and branded.
                Each deployment completes in seconds while collecting behavioral
                signals to detect bots.
              </p>

              <div className="mt-8 space-y-4">
                {deploymentTypes.map((deployment, index) => (
                  <div 
                    key={deployment.name} 
                    className="flex items-center gap-4 transition-all hover:translate-x-2 hover:opacity-80"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CheckCircle className="size-5 shrink-0 text-primary" />
                    <div>
                      <div className="font-medium">{deployment.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {deployment.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deployment Preview Card */}
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
              <CardHeader>
                <CardTitle>Deployment Preview</CardTitle>
                <CardDescription>Try the bubble pop game</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full min-h-[400px] flex items-center justify-center bg-muted/30 rounded-lg p-4 transition-all hover:bg-muted/50">
                  <PlayproofProvider client_key="">
                    <Playproof
                      gameId="bubble-pop"
                      gameDuration={10000}
                      confidenceThreshold={0.7}
                      theme={themeColors}
                      onSuccess={(result) => {
                        console.log("Verification passed:", result);
                      }}
                      onFailure={(result) => {
                        console.log("Verification failed:", result);
                      }}
                    />
                  </PlayproofProvider>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Average completion time</span>
                    <span className="font-medium">3-5 seconds</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Success rate</span>
                    <span className="font-medium text-primary">98.5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30 flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to upgrade your verification?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join developers who have replaced frustrating CAPTCHAs with engaging deployments.
            Get started in minutes with our simple SDK.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {!isSignedIn ? (
              <>
                <SignUpButton mode="modal">
                  <Button size="lg" className="gap-2">
                    Start Building
                    <ArrowRight className="size-4" />
                  </Button>
                </SignUpButton>
                <a href="https://github.com/asaha96/Playproof" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="lg">
                    View on GitHub
                  </Button>
                </a>
              </>
            ) : (
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">
                  Go to Dashboard
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2 font-semibold">
            <Shield className="size-5 text-primary" />
            PlayProof
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PlayProof. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Docs</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
