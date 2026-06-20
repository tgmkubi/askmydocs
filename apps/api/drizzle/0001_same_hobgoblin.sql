CREATE TYPE "public"."document_status" AS ENUM('processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"chunk_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"status" "document_status" DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_document_id_idx" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "chunks_user_id_idx" ON "chunks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chunks_embedding_hnsw_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");