import { openai } from "./openai-client.ts";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export async function createEmbeddings(input: string[]): Promise<number[][]> {
    if (input.length === 0) {
        return [];
    }

    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input,
    });

    return response.data.map((item) => item.embedding);
}

export async function createEmbedding(input: string): Promise<number[]> {
    const [embedding] = await createEmbeddings([input]);

    if (!embedding) {
        throw new Error("Embedding could not be created.");
    }

    return embedding;
}
