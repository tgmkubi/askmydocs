import { Router } from "express";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.ts";
import { users } from "../../db/schema.ts";
import { signAccessToken } from "./jwt.ts";
import { requireAuth, type AuthenticatedRequest } from "./auth.middleware.ts";

export const authRouter = Router();

const registerSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
});

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

authRouter.post("/register", async (req, res, next) => {
    try {
        const body = registerSchema.parse(req.body);
        const email = body.email.toLowerCase().trim();

        const existingUsers = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (existingUsers.length > 0) {
            return res.status(409).json({ message: "Email is already registered" });
        }

        const passwordHash = await argon2.hash(body.password);

        const [createdUser] = await db
            .insert(users)
            .values({
                email,
                passwordHash,
            })
            .returning({
                id: users.id,
                email: users.email,
                createdAt: users.createdAt,
            });

        const token = await signAccessToken({
            sub: createdUser.id,
            email: createdUser.email,
        });

        return res.status(201).json({
            user: createdUser,
            token,
        });
    } catch (error) {
        next(error);
    }
});

authRouter.post("/login", async (req, res, next) => {
    try {
        const body = loginSchema.parse(req.body);
        const email = body.email.toLowerCase().trim();

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const passwordIsValid = await argon2.verify(
            user.passwordHash,
            body.password
        );

        if (!passwordIsValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = await signAccessToken({
            sub: user.id,
            email: user.email,
        });

        return res.json({
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.createdAt,
            },
            token,
        });
    } catch (error) {
        next(error);
    }
});

authRouter.get("/me", requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;

    return res.json({
        user: authReq.user,
    });
});