"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, KeyRound, Mail, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center p-4">
       <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
                &larr; Back to Home
            </Link>
            <ThemeToggle />
        </div>
        <Card className="w-full max-w-lg">
            <CardHeader className="items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? ""} />
                    <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-3xl">{user.displayName}</CardTitle>
                <CardDescription>This is your personal profile page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4 rounded-md border p-3">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Display Name</p>
                        <p className="font-medium">{user.displayName}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4 rounded-md border p-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Email Address</p>
                        <p className="font-medium">{user.email}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4 rounded-md border p-3">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground">User ID</p>
                        <p className="font-mono text-xs">{user.uid}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
