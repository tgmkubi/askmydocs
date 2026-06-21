import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { chunks, documents } from "../../db/schema.ts";
import {
    requireAuth,
    type AuthenticatedRequest,
} from "../auth/auth.middleware.ts";
import { createEmbeddings } from "../ai/embeddings.ts";
import { chunkText } from "./chunking.ts";
import {
    extractTextFromUploadedFile,
    isSupportedDocumentMimeType,
} from "./text-extraction.ts";

const documentIdParamSchema = z.object({
    id: z.uuid(),
});

export const documentsRouter = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB,
        files: 1,
    },
    fileFilter: (_req, file, callback) => {
        if (!isSupportedDocumentMimeType(file.mimetype)) {
            return callback(
                new Error("Only .txt and .pdf files are supported.")
            );
        }

        callback(null, true);
    },
});

documentsRouter.get("/", requireAuth, async (req, res, next) => {
    try {
        const authReq = req as AuthenticatedRequest;

        const userDocuments = await db
            .select({
                id: documents.id,
                filename: documents.filename,
                status: documents.status,
                errorMessage: documents.errorMessage,
                createdAt: documents.createdAt,
                chunksCount: sql<number>`cast(count(${chunks.id}) as int)`,
            })
            .from(documents)
            .leftJoin(chunks, eq(chunks.documentId, documents.id))
            .where(eq(documents.userId, authReq.user.id))
            .groupBy(
                documents.id,
                documents.filename,
                documents.status,
                documents.errorMessage,
                documents.createdAt
            )
            .orderBy(desc(documents.createdAt));

        return res.json({
            documents: userDocuments,
        });
    } catch (error) {
        next(error);
    }
});

documentsRouter.post(
    "/",
    requireAuth,
    upload.single("file"),
    async (req, res, next) => {
        const authReq = req as AuthenticatedRequest;

        try {
            if (!req.file) {
                return res.status(400).json({
                    message: "File is required.",
                });
            }

            const [createdDocument] = await db
                .insert(documents)
                .values({
                    userId: authReq.user.id,
                    filename: req.file.originalname,
                    status: "processing",
                })
                .returning({
                    id: documents.id,
                    filename: documents.filename,
                    status: documents.status,
                    createdAt: documents.createdAt,
                });

            try {
                const extractedText = await extractTextFromUploadedFile(req.file);
                const textChunks = chunkText(extractedText);

                if (textChunks.length === 0) {
                    throw new Error("No extractable text found in the uploaded document.");
                }

                const embeddings = await createEmbeddings(textChunks);

                await db.transaction(async (tx) => {
                    await tx.insert(chunks).values(
                        textChunks.map((content, index) => ({
                            documentId: createdDocument.id,
                            userId: authReq.user.id,
                            content,
                            embedding: embeddings[index],
                            chunkIndex: index,
                        }))
                    );

                    await tx
                        .update(documents)
                        .set({
                            status: "ready",
                            errorMessage: null,
                        })
                        .where(
                            and(
                                eq(documents.id, createdDocument.id),
                                eq(documents.userId, authReq.user.id)
                            )
                        );
                });

                return res.status(201).json({
                    document: {
                        ...createdDocument,
                        status: "ready",
                    },
                    chunksCount: textChunks.length,
                });
            } catch (processingError) {
                const message =
                    processingError instanceof Error
                        ? processingError.message
                        : "Document processing failed.";

                await db
                    .update(documents)
                    .set({
                        status: "failed",
                        errorMessage: message,
                    })
                    .where(
                        and(
                            eq(documents.id, createdDocument.id),
                            eq(documents.userId, authReq.user.id)
                        )
                    );

                return res.status(500).json({
                    message: "Document processing failed.",
                    error: message,
                    documentId: createdDocument.id,
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

documentsRouter.delete("/:id", requireAuth, async (req, res, next) => {
    try {
        const authReq = req as AuthenticatedRequest;

        const paramsResult = documentIdParamSchema.safeParse(req.params);

        if (!paramsResult.success) {
            return res.status(400).json({
                message: "Invalid document id.",
            });
        }

        const documentId = paramsResult.data.id;

        const [deletedDocument] = await db
            .delete(documents)
            .where(
                and(
                    eq(documents.id, documentId),
                    eq(documents.userId, authReq.user.id)
                )
            )
            .returning({
                id: documents.id,
            });

        if (!deletedDocument) {
            return res.status(404).json({
                message: "Document not found.",
            });
        }

        return res.json({
            deletedDocumentId: deletedDocument.id,
        });
    } catch (error) {
        next(error);
    }
});
