"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Bot, Users, Trophy, SwatchBook, ListChecks } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import AuthButton from '@/components/auth-button';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <ClipboardList className="h-6 w-6 text-primary" />
            <span className="text-lg">Committee</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4">
             <ThemeToggle />
             <AuthButton />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                <div className="space-y-6 text-center lg:text-left">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl">
                        The Ultimate Tournament Platform
                    </h1>
                    <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        Create, manage, and share stunning tournament brackets with ease. Powered by AI for intelligent fixture generation.
                    </p>
                    <div className="flex flex-col gap-4 min-[400px]:flex-row justify-center lg:justify-start">
                        <Button size="lg" asChild>
                          <Link href="/create">Get Started for Free</Link>
                        </Button>
                    </div>
                </div>
                <div data-ai-hint="tournament bracket esports">
                    <img
                        src="https://placehold.co/1200x800.png"
                        alt="Tournament bracket illustration"
                        className="mx-auto aspect-[3/2] overflow-hidden rounded-xl object-cover object-center shadow-2xl"
                    />
                </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/40">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Powerful Features, Effortlessly Simple</h2>
              <p className="mt-2 text-muted-foreground">Everything you need to run a successful tournament.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="mb-4 bg-primary/10 text-primary p-3 rounded-full w-fit">
                    <Bot className="h-6 w-6" />
                  </div>
                  <CardTitle>AI Fixture Generation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Automatically generate fair and balanced fixtures for round-robin, single-elimination, or hybrid tournaments. Our AI handles the complexity.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="mb-4 bg-primary/10 text-primary p-3 rounded-full w-fit">
                     <SwatchBook className="h-6 w-6" />
                  </div>
                  <CardTitle>Flexible Tournament Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Whether it's a simple knockout bracket or a complex group stage, Committee supports multiple formats to fit your needs.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="mb-4 bg-primary/10 text-primary p-3 rounded-full w-fit">
                    <Users className="h-6 w-6" />
                  </div>
                  <CardTitle>AI-Powered Team Logos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Bring your teams to life by generating unique, professional logos with a single click using generative AI.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <div className="mb-4 bg-primary/10 text-primary p-3 rounded-full w-fit">
                        <ListChecks className="h-6 w-6" />
                    </div>
                  <CardTitle>Live Score Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Update match scores in real-time. Points tables and knockout brackets update automatically as results come in.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <div className="mb-4 bg-primary/10 text-primary p-3 rounded-full w-fit">
                        <Trophy className="h-6 w-6" />
                    </div>
                  <CardTitle>Champion Celebration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Crown your winner in style. A dedicated champion view glorifies the tournament victor at the end of the competition.
                  </p>
                </CardContent>
              </Card>
               <Card>
                <CardHeader>
                    <div className="mb-4 bg-primary/10 text-primary p-3 rounded-full w-fit">
                         <SwatchBook className="h-6 w-6" />
                    </div>
                  <CardTitle>Light & Dark Modes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    A beautiful interface that looks great in any lighting condition, with full support for both light and dark themes.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 border-t">
        <div className="container text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Committee. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
