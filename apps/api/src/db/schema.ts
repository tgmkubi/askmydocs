import {
    index,
    integer,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
    vector,
} from "drizzle-orm/pg-core";

export const documentStatusEnum = pgEnum("document_status", [
    "processing",
    "ready",
    "failed",
]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export const documents = pgTable(
    "documents",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        filename: text("filename").notNull(),
        status: documentStatusEnum("status").notNull().default("processing"),
        errorMessage: text("error_message"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("documents_user_id_idx").on(table.userId),
        index("documents_status_idx").on(table.status),
    ]
);

export const chunks = pgTable(
    "chunks",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        documentId: uuid("document_id")
            .notNull()
            .references(() => documents.id, { onDelete: "cascade" }),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        content: text("content").notNull(),
        embedding: vector("embedding", { dimensions: 1536 }).notNull(),
        chunkIndex: integer("chunk_index").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("chunks_document_id_idx").on(table.documentId),
        index("chunks_user_id_idx").on(table.userId),
        index("chunks_embedding_hnsw_idx").using(
            "hnsw",
            table.embedding.op("vector_cosine_ops")
        ),
    ]
);