# AskMyDocs

AskMyDocs is a full-stack document Q&A app. A user can register, upload `.txt` or text-based `.pdf` files, and ask questions against only their own documents. The API extracts text, chunks it, creates OpenAI embeddings, stores vectors in PostgreSQL with pgvector, retrieves relevant chunks, and streams grounded answers with citations to the Next.js UI.

## Demo Video

[Watch the demo video](https://drive.google.com/file/d/1tDE_5qCcl29r_MblVRc9zIr9vEMZp5KA/view?usp=drive_link)

## Live App

Frontend: [https://askmydocs-eight.vercel.app](https://askmydocs-eight.vercel.app)

Backend API: [https://askmydocs-api.onrender.com](https://askmydocs-api.onrender.com)

Database: Neon PostgreSQL with pgvector


## Stack

This is a pnpm workspace with two apps:

```txt
apps/api  - Express.js API, Drizzle, PostgreSQL, pgvector, OpenAI
apps/web  - Next.js 16, React Query, shadcn/ui, Tailwind CSS
```

Backend choices:

* Node.js, Express.js, TypeScript
* JWT auth with `jose`
* Argon2 password hashing
* Multer for upload handling
* `unpdf` for text-based PDF extraction
* Drizzle ORM and Drizzle Kit migrations

Frontend choices:

* Next.js 16 and React 19
* React Query for server state, invalidation, and polling
* React Hook Form and Zod for auth forms
* shadcn/ui, Tailwind CSS, lucide-react

Database choices:

* PostgreSQL
* pgvector extension
* `vector(1536)` embedding column
* HNSW index with `vector_cosine_ops`

## AI, Embeddings, Chunking, and Retrieval

AskMyDocs uses OpenAI for both embeddings and answer generation.

| Area                 | Choice                              | Why                                                                                             |
| -------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| Embedding model      | `text-embedding-3-small`            | Good balance of retrieval quality, speed, and cost for a document Q&A app.                      |
| Embedding dimensions | `1536`                              | Default vector size for `text-embedding-3-small`; stored as `vector(1536)` in PostgreSQL.       |
| Chat model           | `gpt-4o-mini`                       | Cost-efficient and fast enough for streamed chat responses.                                     |
| Vector database      | PostgreSQL + pgvector               | Keeps documents, metadata, users, and vectors in one database.                                  |
| Similarity metric    | Cosine distance with pgvector `<=>` | Suitable for comparing semantic similarity between embedded text chunks and embedded questions. |

The chat model can be changed with:

```env
OPENAI_CHAT_MODEL=gpt-4o-mini
```

### Chunking Strategy

Documents are normalized before chunking. The normalizer removes common PDF text artifacts, joins broken line breaks, trims repeated whitespace, and removes simple page markers.

Current chunking settings:

```txt
Chunk size: 1200 characters
Chunk overlap: 220 characters
```

I chose this strategy because each chunk should be focused enough for accurate retrieval, but still large enough to preserve useful local context. The 220-character overlap helps reduce the risk of losing meaning when an answer spans the boundary between two chunks.

Very long paragraphs are split by sentence first. If a sentence or paragraph is still too long, the system falls back to word-based splitting.

### Retrieval and Grounding

When a user asks a question:

1. The API embeds the question with `text-embedding-3-small`.
2. It searches only chunks owned by the authenticated user.
3. It orders results by pgvector cosine distance using `<=>`.
4. It converts distance to similarity with `1 - distance`.
5. It keeps the top matches and filters weak matches.
6. It sends the remaining chunks to OpenAI as context.
7. The streamed response includes citation metadata for the retrieved chunks.

Current retrieval settings:

```txt
TOP_K = 4
MIN_SIMILARITY = 0.15
```

### Hallucination Prevention

Hallucination prevention is handled in two places:

* The API returns `I don't know based on the uploaded documents.` when no chunk passes the similarity threshold.
* The model instructions say to answer only from the provided context, avoid outside knowledge, and cite used chunks with `[1]`, `[2]`, etc.

This keeps the answer grounded in the user's uploaded documents instead of relying on the model's general knowledge.


## Environment

Create a root `.env` file:

```bash
cp .env.example .env
```

Do not commit real `.env` files or API keys.

## Run Locally with Docker

After creating your `.env` file and filling in the required values, build the Docker images:

```bash
docker compose build
```

Start PostgreSQL first:

```bash
docker compose up -d db
```

Run the database migrations:

```bash
docker compose run --rm migrate
```

Start the full local stack:

```bash
docker compose up -d
```

The app will be available at:

```txt
http://localhost:3000
```

The API health check is available at:

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

### Optional: Drizzle Studio

Start Drizzle Studio:

```bash
docker compose --profile tools up -d db-studio
```

Open the Drizzle Studio URL printed in the terminal, usually:

```txt
https://local.drizzle.studio?host=localhost&port=4983
```

Stop only Drizzle Studio:

```bash
docker compose stop db-studio
```

Stop all running Docker Compose services without deleting containers or volumes:

```bash
docker compose stop
```

Remove containers and the Compose network when you are done:

```bash
docker compose down
```

Only remove the local database volume if you intentionally want to delete local data:

```bash
docker compose down -v
```

## Run Locally for Development

Start only the database:

```bash
docker compose up -d db
```

Run migrations from the local API package:

```bash
pnpm db:migrate
```

Start the API:

```bash
pnpm dev:api
```

Start the frontend in another terminal:

```bash
pnpm dev:web
```

Open:

```txt
http://localhost:3000
```

## Migrations

Migration files are committed in:

```txt
apps/api/drizzle/
```

They create the pgvector extension, users, documents, chunks, `document_status`, the `vector(1536)` embedding column, and the HNSW index.

Useful commands:

```bash
pnpm db:generate
pnpm db:migrate
```

Run production migrations against Neon with a direct connection string:

```bash
DATABASE_URL="<neon-direct-connection-string>" pnpm db:migrate
```

## API Overview

Auth:

```txt
POST /auth/register
POST /auth/login
GET  /auth/me
```

Documents:

```txt
GET    /documents
POST   /documents
DELETE /documents/:id
```

Ask:

```txt
POST /ask
POST /ask/stream
```

`/ask/stream` uses Server-Sent Events and emits metadata, text deltas, errors, and a final done event.

## Auth and Tenant Safety

The frontend stores the returned JWT and sends it as:

```txt
Authorization: Bearer <token>
```

The API is the real security boundary. Protected routes use `requireAuth`, and document/chunk queries include the authenticated user id. The frontend also protects `/ask`, `/documents`, and `/dashboard` for a better user experience.

## Deployment Notes

Frontend:

* Platform: Vercel
* Root directory: `apps/web`
* Build command: `pnpm build`
* Output directory: `.next`
* Required env: `NEXT_PUBLIC_API_URL`

Backend:

* Platform: Render
* Service exposes port `4000`
* Required env: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`

Database:

* Platform: Neon
* pgvector must be available
* Use pooled connection for runtime
* Use direct connection for migrations

## Current Limitations

* PDF support is text extraction only; scanned PDFs need OCR and are not supported.
* Chat history is kept in frontend state and is not persisted.
* Document processing runs during upload instead of a separate worker queue.
* Very large files should be handled with stricter limits or background processing in production.
