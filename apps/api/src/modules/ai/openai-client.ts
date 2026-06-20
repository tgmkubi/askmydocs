import OpenAI from "openai";
import { env } from "../../config/env.ts";

if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
}

export const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});
