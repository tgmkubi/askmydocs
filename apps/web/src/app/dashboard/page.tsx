"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { CHAT_STORAGE_KEY } from "@/lib/storage-keys";
import { clearToken, getMe } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const meQuery = useQuery({
        queryKey: ["me"],
        queryFn: getMe,
        retry: false,
    });

    function handleLogout() {
        localStorage.removeItem(CHAT_STORAGE_KEY);
        queryClient.clear();
        clearToken();
        router.push("/login");
    }

    if (meQuery.isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background p-6">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Loading dashboard...</CardTitle>
                        <CardDescription>
                            Checking your current session.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </main>
        );
    }

    if (meQuery.isError) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background p-6">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>You are not logged in</CardTitle>
                        <CardDescription>
                            Please sign in again to manage your documents.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Button onClick={() => router.push("/login")}>Go to login</Button>
                    </CardContent>
                </Card>
            </main>
        );
    }

    const userEmail = meQuery.data?.user.email ?? "Unknown user";

    return (
        <main className="min-h-screen bg-background p-6">
            <div className="mx-auto max-w-3xl space-y-6">

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <CardTitle>Dashboard</CardTitle>
                                <CardDescription>
                                    Manage your uploaded documents and ask grounded questions.
                                </CardDescription>
                            </div>

                            <Badge variant="secondary">Signed in</Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        <div className="rounded-lg border bg-muted/40 p-4">
                            <p className="text-sm text-muted-foreground">Logged in as</p>
                            <p className="mt-1 font-medium">{userEmail}</p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/documents")}
                            >
                                Manage documents
                            </Button>

                            <Button variant="outline" onClick={() => router.push("/ask")}>
                                Ask questions
                            </Button>

                            <Button variant="destructive" onClick={handleLogout}>
                                Logout
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
