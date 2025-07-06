"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { useAuth } from "@/context/auth-context";
import { ClipboardList } from "lucide-react";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/create");
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    const user = await signInWithGoogle();
    if (user) {
      router.push("/create");
    }
  };

  if (loading || user) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mx-auto flex items-center gap-2 mb-4">
                <ClipboardList className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">Committee</span>
            </div>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in to create and manage your tournaments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignIn} className="w-full">
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5C308.6 106.5 280.3 96 248 96c-84.3 0-152.3 67.8-152.3 151.8s68 152.3 152.3 152.3c99.9 0 130.6-78.7 134.4-119.8H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
