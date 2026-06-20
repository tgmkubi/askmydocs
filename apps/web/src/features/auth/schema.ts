import { z } from "zod/v4";

export const loginSchema = z.object({
    email: z
        .email("Please enter a valid email address.")
        .trim()
        .transform((value) => value.toLowerCase()),
    password: z.string().min(1, "Password is required."),
});

export type LoginFormInput = z.input<typeof loginSchema>;
export type LoginFormValues = z.output<typeof loginSchema>;

export const registerSchema = z.object({
    email: z
        .email("Please enter a valid email address.")
        .trim()
        .transform((value) => value.toLowerCase()),
    password: z.string().min(8, "Password must be at least 8 characters."),
});

export type RegisterFormInput = z.input<typeof registerSchema>;
export type RegisterFormValues = z.output<typeof registerSchema>;
