import { env } from "../../config/env.ts";
import { openai } from "./openai-client.ts";

export type AnswerContextChunk = {
    citationNumber: number;
    filename: string;
    chunkIndex: number;
    content: string;
};

function buildContext(contextChunks: AnswerContextChunk[]): string {
    return contextChunks
        .map(
            (chunk) => `
[${chunk.citationNumber}]
Document: ${chunk.filename}
Chunk index: ${chunk.chunkIndex}
Content:
${chunk.content}
`.trim()
        )
        .join("\n\n---\n\n");
}

function buildInstructions(): string {
    return `
You are AskMyDocs, a document question-answering assistant.

Rules:
- Answer only using the provided context chunks.
- If the answer is not present in the context, say: "I don't know based on the uploaded documents."
- Do not use outside knowledge.
- Keep the answer concise.
- When you use information from a chunk, cite it with [1], [2], etc.
`.trim();
}

function buildInput(input: {
    question: string;
    contextChunks: AnswerContextChunk[];
}): string {
    return `
Question:
${input.question}

Context chunks:
${buildContext(input.contextChunks)}
`.trim();
}

export async function generateGroundedAnswer(input: {
    question: string;
    contextChunks: AnswerContextChunk[];
}): Promise<string> {
    const response = await openai.responses.create({
        model: env.OPENAI_CHAT_MODEL,
        instructions: buildInstructions(),
        input: buildInput(input),
    });

    return response.output_text.trim();
}

export async function streamGroundedAnswer(input: {
    question: string;
    contextChunks: AnswerContextChunk[];
    onDelta: (delta: string) => void;
}): Promise<void> {
    const stream = await openai.responses.create({
        model: env.OPENAI_CHAT_MODEL,
        instructions: buildInstructions(),
        input: buildInput(input),
        stream: true,
    });

    for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
            input.onDelta(event.delta);
        }
    }
}
