import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "./jwt.ts";

export type AuthenticatedUser = {
    id: string;
    email: string;
};

export type AuthenticatedRequest = Request & {
    user: AuthenticatedUser;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authorization = req.header("authorization");

    if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authorization.slice("Bearer ".length);

    try {
        const payload = await verifyAccessToken(token);

        (req as AuthenticatedRequest).user = {
            id: payload.sub,
            email: payload.email,
        };

        next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}