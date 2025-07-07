"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { signInWithGoogle, signInAnonymously, signUpWithEmailPassword, signInWithEmailPassword } from "@/lib/firebase/auth";
import { useAuth } from "@/context/auth-context";
import { ClipboardList, Loader, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const signUpSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});


function LoginContent() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/profile';
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const signUpForm = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { displayName: "", email: "", password: "" },
    });

    const signInForm = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema),
        defaultValues: { email: "", password: "" },
    });

    useEffect(() => {
        if (!loading && user) {
            router.push(returnUrl);
        }
    }, [user, loading, router, returnUrl]);

    const handleGoogleSignIn = () => startTransition(async () => {
        const user = await signInWithGoogle();
        if (user) router.push(returnUrl);
    });

    const handleAnonymousSignIn = () => startTransition(async () => {
        const user = await signInAnonymously();
        if (user) router.push(returnUrl);
    });

    const onSignUp = (values: z.infer<typeof signUpSchema>) => startTransition(async () => {
        try {
            const user = await signUpWithEmailPassword(values.email, values.password, values.displayName);
            if (user) router.push(returnUrl);
        } catch (error: any) {
            console.error(error);
            const errorCode = error.code;
            if (errorCode === 'auth/email-already-in-use') {
                signUpForm.setError('email', { message: 'This email is already in use.' });
            } else {
                toast({ variant: 'destructive', title: 'Sign Up Failed', description: "An unexpected error occurred." });
            }
        }
    });

    const onSignIn = (values: z.infer<typeof signInSchema>) => startTransition(async () => {
        try {
            const user = await signInWithEmailPassword(values.email, values.password);
            if (user) router.push(returnUrl);
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Sign In Failed', description: "Invalid email or password." });
        }
    });

    if (loading || user) {
        return (
             <div className="flex h-screen w-screen items-center justify-center">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        );
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
            <CardDescription>Sign in or create an account to continue.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="signin">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="signin">
                        <Form {...signInForm}>
                            <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4 pt-4">
                                <FormField control={signInForm.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={signInForm.control} name="password" render={({ field }) => (
                                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <Button type="submit" disabled={isPending} className="w-full">
                                    {isPending && <Loader className="mr-2 animate-spin" />} Sign In
                                </Button>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="signup">
                        <Form {...signUpForm}>
                            <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4 pt-4">
                                <FormField control={signUpForm.control} name="displayName" render={({ field }) => (
                                    <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="Your Name" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={signUpForm.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={signUpForm.control} name="password" render={({ field }) => (
                                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <Button type="submit" disabled={isPending} className="w-full">
                                    {isPending && <Loader className="mr-2 animate-spin" />} Create Account
                                </Button>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                        </span>
                    </div>
                </div>
                <div className="space-y-3">
                        <Button onClick={handleGoogleSignIn} variant="outline" className="w-full" disabled={isPending}>
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5C308.6 106.5 280.3 96 248 96c-84.3 0-152.3 67.8-152.3 151.8s68 152.3 152.3 152.3c99.9 0 130.6-78.7 134.4-119.8H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
                        Continue with Google
                    </Button>
                    <Button onClick={handleAnonymousSignIn} variant="secondary" className="w-full" disabled={isPending}>
                        <User className="mr-2 h-4 w-4" /> Continue as Guest
                    </Button>
                </div>
            </CardContent>
        </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-screen items-center justify-center">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
