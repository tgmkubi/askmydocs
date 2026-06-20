import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env.js";

export type AccessTokenPayload = {
    sub: string;
    email: string;
};

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function signAccessToken(
    payload: AccessTokenPayload
): Promise<string> {
    return new SignJWT({
        email: payload.email,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(payload.sub)
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secret);
}

export async function verifyAccessToken(
    token: string
): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, secret);

    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
        throw new Error("Invalid token payload");
    }

    return {
        sub: payload.sub,
        email: payload.email,
    };
}
