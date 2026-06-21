"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
    Bot,
    FileText,
    LayoutDashboard,
    LogOut,
    Menu,
} from "lucide-react";

import { CHAT_STORAGE_KEY } from "@/lib/storage-keys";
import { clearToken } from "@/lib/api";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
    },
    {
        href: "/documents",
        label: "Documents",
        icon: FileText,
    },
    {
        href: "/ask",
        label: "Ask",
        icon: Bot,
    },
];

function isActivePath(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();

    const isAuthPage = pathname === "/login" || pathname === "/register";

    if (isAuthPage) {
        return null;
    }

    function handleLogout() {
        localStorage.removeItem(CHAT_STORAGE_KEY);
        queryClient.clear();
        clearToken();
        router.push("/login");
    }

    return (
        <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-muted">
                        <Bot className="h-4 w-4" />
                    </div>
                    <span>AskMyDocs</span>
                </Link>

                <nav className="hidden items-center gap-1 md:flex">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isActivePath(pathname, item.href);

                        return (
                            <Button
                                key={item.href}
                                asChild
                                variant={isActive ? "secondary" : "ghost"}
                            >
                                <Link href={item.href} className="gap-2">
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            </Button>
                        );
                    })}
                </nav>

                <div className="hidden items-center gap-2 md:flex">
                    <ThemeToggle />

                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </div>

                <div className="flex items-center gap-2 md:hidden">
                    <ThemeToggle />

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Menu className="h-4 w-4" />
                                <span className="sr-only">Open navigation menu</span>
                            </Button>
                        </SheetTrigger>

                        <SheetContent side="right" className="w-72">
                            <SheetHeader>
                                <SheetTitle>AskMyDocs</SheetTitle>
                            </SheetHeader>

                            <div className="mt-6 space-y-2">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = isActivePath(pathname, item.href);

                                    return (
                                        <Button
                                            key={item.href}
                                            asChild
                                            className="w-full justify-start"
                                            variant={isActive ? "secondary" : "ghost"}
                                        >
                                            <Link href={item.href} className="gap-2">
                                                <Icon className="h-4 w-4" />
                                                {item.label}
                                            </Link>
                                        </Button>
                                    );
                                })}

                                <Separator className="my-4" />

                                <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
