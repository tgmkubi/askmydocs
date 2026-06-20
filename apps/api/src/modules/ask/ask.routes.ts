import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.ts";
import { chunks, documents } from "../../db/schema.ts";
import {
    requireAuth,
    type AuthenticatedRequest,
} from "../auth/auth.middleware.ts";
import { createEmbedding } from "../ai/embeddings.ts";
import {
    generateGroundedAnswer,
    streamGroundedAnswer,
} from "../ai/answers.ts";

export const askRouter = Router();

const askSchema = z.object({
    question: z.string().trim().min(3).max(1000),
});

const TOP_K = 4;
const MIN_SIMILARITY = 0.15;

function toPgVectorLiteral(vector: number[]): string {
    return `[${vector.join(",")}]`;
}

function sendSseEvent(
    res: import("express").Response,
    event: string,
    data: unknown
) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

askRouter.post("/", requireAuth, async (req, res, next) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const body = askSchema.parse(req.body);

        const questionEmbedding = await createEmbedding(body.question);
        const questionVector = toPgVectorLiteral(questionEmbedding);

        const retrievedChunks = await db
            .select({
                id: chunks.id,
                documentId: chunks.documentId,
                filename: documents.filename,
                content: chunks.content,
                chunkIndex: chunks.chunkIndex,
                distance: sql<number>`(${chunks.embedding} <=> ${questionVector}::vector)`,
                similarity: sql<number>`1 - (${chunks.embedding} <=> ${questionVector}::vector)`,
            })
            .from(chunks)
            .innerJoin(documents, eq(chunks.documentId, documents.id))
            .where(
                and(
                    eq(chunks.userId, authReq.user.id),
                    eq(documents.userId, authReq.user.id),
                    eq(documents.status, "ready")
                )
            )
            .orderBy(sql`${chunks.embedding} <=> ${questionVector}::vector`)
            .limit(TOP_K);

        const relevantChunks = retrievedChunks.filter(
            (chunk) => Number(chunk.similarity) >= MIN_SIMILARITY
        );

        if (relevantChunks.length === 0) {
            return res.json({
                answer: "I don't know based on the uploaded documents.",
                citations: [],
            });
        }

        const contextChunks = relevantChunks.map((chunk, index) => ({
            citationNumber: index + 1,
            filename: chunk.filename,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
        }));

        const answer = await generateGroundedAnswer({
            question: body.question,
            contextChunks,
        });

        return res.json({
            answer,
            citations: relevantChunks.map((chunk, index) => ({
                citationNumber: index + 1,
                documentId: chunk.documentId,
                filename: chunk.filename,
                chunkIndex: chunk.chunkIndex,
                content: chunk.content,
                similarity: Number(chunk.similarity),
            })),
        });
    } catch (error) {
        next(error);
    }
});

askRouter.post("/stream", requireAuth, async (req, res, next) => {
    let clientClosed = false;

    req.on("close", () => {
        clientClosed = true;
    });

    try {
        const authReq = req as AuthenticatedRequest;
        const body = askSchema.parse(req.body);

        const questionEmbedding = await createEmbedding(body.question);
        const questionVector = toPgVectorLiteral(questionEmbedding);

        const retrievedChunks = await db
            .select({
                id: chunks.id,
                documentId: chunks.documentId,
                filename: documents.filename,
                content: chunks.content,
                chunkIndex: chunks.chunkIndex,
                distance: sql<number>`(${chunks.embedding} <=> ${questionVector}::vector)`,
                similarity: sql<number>`1 - (${chunks.embedding} <=> ${questionVector}::vector)`,
            })
            .from(chunks)
            .innerJoin(documents, eq(chunks.documentId, documents.id))
            .where(
                and(
                    eq(chunks.userId, authReq.user.id),
                    eq(documents.userId, authReq.user.id),
                    eq(documents.status, "ready")
                )
            )
            .orderBy(sql`${chunks.embedding} <=> ${questionVector}::vector`)
            .limit(TOP_K);

        const relevantChunks = retrievedChunks.filter(
            (chunk) => Number(chunk.similarity) >= MIN_SIMILARITY
        );

        res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        });

        res.flushHeaders();

        if (relevantChunks.length === 0) {
            sendSseEvent(res, "metadata", {
                citations: [],
            });

            sendSseEvent(res, "delta", {
                delta: "I don't know based on the uploaded documents.",
            });

            sendSseEvent(res, "done", {});
            res.end();
            return;
        }

        const contextChunks = relevantChunks.map((chunk, index) => ({
            citationNumber: index + 1,
            filename: chunk.filename,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
        }));

        const citations = relevantChunks.map((chunk, index) => ({
            citationNumber: index + 1,
            documentId: chunk.documentId,
            filename: chunk.filename,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            similarity: Number(chunk.similarity),
        }));

        sendSseEvent(res, "metadata", {
            citations,
        });

        await streamGroundedAnswer({
            question: body.question,
            contextChunks,
            onDelta: (delta) => {
                if (!clientClosed) {
                    sendSseEvent(res, "delta", { delta });
                }
            },
        });

        if (!clientClosed) {
            sendSseEvent(res, "done", {});
            res.end();
        }
    } catch (error) {
        if (!res.headersSent) {
            next(error);
            return;
        }

        sendSseEvent(res, "error", {
            message:
                error instanceof Error ? error.message : "Streaming answer failed.",
        });

        res.end();
    }
});
