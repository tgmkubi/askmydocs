"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { getToken } from "@/lib/api";
import { AppNavbar } from "@/components/app-navbar";

const AUTH_PAGES = ["/login", "/register"];

export function AuthenticatedNavbar() {
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        setIsAuthenticated(Boolean(getToken()));
    }, [pathname]);

    if (AUTH_PAGES.includes(pathname)) {
        return null;
    }

    if (!isAuthenticated) {
        return null;
    }

    return <AppNavbar />;
}
