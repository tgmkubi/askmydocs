"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { login, setToken } from "@/lib/api";
import {
    loginSchema,
    type LoginFormInput,
    type LoginFormValues,
} from "@/features/auth/schema";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirectTo") ?? "/ask";

    const form = useForm<LoginFormInput, unknown, LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "test@example.com",
            password: "password123",
        },
    });

    const loginMutation = useMutation({
        mutationFn: login,
        onSuccess: (data) => {
            setToken(data.token);
            router.push(redirectTo);
        },
    });

    function onSubmit(values: LoginFormValues) {
        loginMutation.mutate(values);
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>
                        Sign in to upload documents and ask questions.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                disabled={loginMutation.isPending}
                                {...form.register("email")}
                            />
                            {form.formState.errors.email ? (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.email.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                disabled={loginMutation.isPending}
                                {...form.register("password")}
                            />
                            {form.formState.errors.password ? (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.password.message}
                                </p>
                            ) : null}
                        </div>

                        {loginMutation.error ? (
                            <p className="text-sm text-destructive">
                                {loginMutation.error.message}
                            </p>
                        ) : null}

                        <Button
                            className="w-full"
                            type="submit"
                            disabled={loginMutation.isPending}
                        >
                            {loginMutation.isPending ? "Logging in..." : "Login"}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Link className="font-medium underline" href="/register">
                            Register
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </main>
    );
}
