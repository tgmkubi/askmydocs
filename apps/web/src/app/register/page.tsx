"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { register, setToken } from "@/lib/api";
import {
    registerSchema,
    type RegisterFormInput,
    type RegisterFormValues,
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

export default function RegisterPage() {
    const router = useRouter();

    const form = useForm<RegisterFormInput, unknown, RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: "test@example.com",
            password: "password123",
        },
    });

    const registerMutation = useMutation({
        mutationFn: register,
        onSuccess: (data) => {
            setToken(data.token);
            router.push("/ask");
        },
    });

    function onSubmit(values: RegisterFormValues) {
        registerMutation.mutate(values);
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Create account</CardTitle>
                    <CardDescription>
                        Register to upload documents and ask grounded questions.
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
                                disabled={registerMutation.isPending}
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
                                autoComplete="new-password"
                                disabled={registerMutation.isPending}
                                {...form.register("password")}
                            />
                            {form.formState.errors.password ? (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.password.message}
                                </p>
                            ) : null}
                        </div>

                        {registerMutation.error ? (
                            <p className="text-sm text-destructive">
                                {registerMutation.error.message}
                            </p>
                        ) : null}

                        <Button
                            className="w-full"
                            type="submit"
                            disabled={registerMutation.isPending}
                        >
                            {registerMutation.isPending ? "Creating account..." : "Register"}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link className="font-medium underline" href="/login">
                            Login
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </main>
    );
}
