import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, "../../../../.env"),
});

const envSchema = z.object({
    PORT: z.string().default("4000"),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
    FRONTEND_URL: z.string().default("http://localhost:3000"),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
});

export const env = envSchema.parse(process.env);