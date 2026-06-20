# AskMyDocs

AskMyDocs is a full-stack AI document Q&A application. Users can register, upload documents, and ask questions against their own uploaded files. The backend extracts text, chunks documents, creates embeddings, stores vectors in PostgreSQL with pgvector, retrieves relevant chunks with vector similarity search, and generates grounded AI answers with citations.

## Features

* Email/password authentication with JWT
* Protected API routes
* User-scoped documents and chunks
* Upload `.txt` and text-based `.pdf` files
* Text extraction, chunking, embedding, and vector storage
* PostgreSQL + pgvector for similarity search
* Document status tracking: `processing`, `ready`, `failed`
* Document listing and deletion
* Streaming AI answers
* Citation-backed answers with retrieved source chunks
* Dark/light theme support
* Responsive chat-focused UI

## Tech Stack

### Backend

* Node.js
* Express.js
* TypeScript
* JWT authentication with `jose`
* Argon2 password hashing
* Multer file upload
* unpdf PDF text extraction
* OpenAI embeddings and chat generation
* Drizzle ORM and Drizzle Kit migrations

### Frontend

* Next.js
* TypeScript
* React Query
* React Hook Form
* Zod
* Tailwind CSS
* shadcn/ui
* next-themes

### Database

* PostgreSQL
* pgvector extension
* Vector column for document chunk embeddings
* HNSW vector index for similarity search

### Local Infrastructure

* Docker Compose
* PostgreSQL pgvector container
* Backend API container

## Project Structure

```txt
askmydocs/
  apps/
    api/
      src/
        config/
        db/
        modules/
          ai/
          ask/
          auth/
          documents/
      drizzle/
      Dockerfile
      drizzle.config.ts
      package.json

    web/
      src/
        app/
        components/
        features/
        lib/
      package.json

  packages/
    shared/

  docker-compose.yml
  pnpm-workspace.yaml
  package.json
  .env.example
  README.md
```

## Environment Variables

Create a `.env` file in the project root:

```env
# API
PORT=4000
DATABASE_URL=postgresql://askmydocs:askmydocs@localhost:5434/askmydocs
JWT_SECRET=replace-me-with-a-long-secret
FRONTEND_URL=http://localhost:3000

# AI
OPENAI_API_KEY=replace-me
OPENAI_CHAT_MODEL=gpt-4o-mini

# Web
NEXT_PUBLIC_API_URL=http://localhost:4000
```

For local development, `DATABASE_URL` points to the Docker-exposed PostgreSQL port on the host machine:

```txt
localhost:5434
```

Inside Docker Compose, the API container uses the internal service hostname:

```txt
db:5432
```

## Local Development Setup

Install dependencies:

```bash
pnpm install
```

Start PostgreSQL with pgvector:

```bash
docker compose up -d db
```

Run database migrations:

```bash
pnpm --filter api db:migrate
```

Start the backend locally:

```bash
pnpm dev:api
```

Start the frontend locally:

```bash
pnpm dev:web
```

Open the app:

```txt
http://localhost:3000/ask
```

Optional: open Drizzle Studio:

```bash
pnpm dev:db-studio
```

## Docker Setup

The Docker Compose setup currently runs:

* PostgreSQL with pgvector
* Backend API

The frontend is intentionally kept outside Docker for local development and is expected to be deployed to Vercel.

Start database:

```bash
docker compose up -d db
```

Build backend API image:

```bash
docker compose build api
```

Run migrations from inside the API container:

```bash
docker compose run --rm api pnpm --filter api db:migrate
```

Start backend API container:

```bash
docker compose up -d api
```

Check running containers:

```bash
docker ps
```

Check API health:

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

Run the frontend locally while backend and database run in Docker:

```bash
pnpm dev:web
```

Then open:

```txt
http://localhost:3000/ask
```

## Database Migrations

Migrations are stored in:

```txt
apps/api/drizzle/
```

Generate migrations:

```bash
pnpm --filter api db:generate
```

Run migrations:

```bash
pnpm --filter api db:migrate
```

The migrations create:

* `vector` extension
* `users` table
* `documents` table
* `chunks` table
* vector embedding column
* vector index for similarity search

## RAG Pipeline

AskMyDocs uses the following retrieval-augmented generation flow:

1. User uploads a `.txt` or text-based `.pdf` document.
2. Backend extracts text from the uploaded file.
3. Extracted text is normalized.
4. Text is split into semantic chunks.
5. Each chunk is embedded with OpenAI embeddings.
6. Chunks and embeddings are stored in PostgreSQL using pgvector.
7. User asks a question.
8. The question is embedded.
9. Backend performs vector similarity search over the authenticated user's chunks.
10. Top relevant chunks are sent to the AI model as context.
11. The model generates an answer using only the provided context.
12. The response is streamed to the frontend.
13. Citations are displayed under the AI answer and can be inspected in the source panel.

## Embeddings

The project uses:

```txt
text-embedding-3-small
```

Embedding dimension:

```txt
1536
```

The database vector column is configured to match this dimension.

## Retrieval Strategy

Current retrieval settings:

```txt
TOP_K = 4
MIN_SIMILARITY = 0.15
```

The API retrieves the most relevant chunks belonging only to the authenticated user. Documents from other users are never queried.

## Hallucination Prevention

The answer generation prompt instructs the model to:

* Answer only using retrieved context chunks
* Avoid outside knowledge
* Cite used chunks with `[1]`, `[2]`, etc.
* Say the following when the answer is not available in the uploaded documents:

```txt
I don't know based on the uploaded documents.
```

The backend also returns an empty citation list when no sufficiently relevant chunks are found.

## Authentication and Authorization

Authentication flow:

1. User registers with email and password.
2. Password is hashed with Argon2.
3. Backend returns a JWT.
4. Frontend stores the token.
5. Protected requests include:

```txt
Authorization: Bearer <token>
```

All document and chunk queries are scoped by the authenticated user's ID.

## API Endpoints

### Health

```txt
GET /health
```

### Auth

```txt
POST /auth/register
POST /auth/login
GET /auth/me
```

### Documents

```txt
GET /documents
POST /documents
DELETE /documents/:id
```

### Ask

```txt
POST /ask
POST /ask/stream
```

The `/ask/stream` endpoint streams answer deltas to the frontend.

## Frontend Pages

### `/login`

User login page.

### `/register`

User registration page.

### `/ask`

Main application screen. Includes:

* Document upload and list panel
* Chat interface
* Streaming AI answers
* Citation chips
* Source inspector panel

### `/documents`

Standalone document management page. Uses the same document panel logic as `/ask`.

### `/dashboard`

Simple account and navigation page.

## PDF Support

The current PDF implementation supports text-based PDFs.

Scanned PDFs or image-only PDFs are not OCR-processed.

## Known Limitations

* No OCR support for scanned PDFs
* Chat history is stored only in frontend state for the current session
* No document preview viewer
* No admin panel
* No background worker queue yet; document processing currently happens during the upload request
* Backend deployment URL must be configured manually for production frontend builds

## Deployment Plan

### Database

Use Neon PostgreSQL with pgvector enabled.

Production `DATABASE_URL` should point to Neon.

Run migrations against the production database:

```bash
DATABASE_URL="<neon-connection-string>" pnpm --filter api db:migrate
```

### Frontend

Deploy `apps/web` to Vercel.

Required frontend environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-api-url.example.com
```

### Backend

The backend can be deployed to one of the following:

* Render Web Service
* Railway
* Fly.io
* AWS App Runner
* AWS ECS/Fargate

For the take-home submission, a simple cloud web service is enough as long as the frontend can reach the backend over HTTPS.

## Suggested Demo Flow

1. Open the deployed frontend.
2. Register a new account.
3. Upload a `.txt` file.
4. Upload a text-based `.pdf` file.
5. Wait for documents to become `ready`.
6. Ask a question related to the uploaded document.
7. Show the streamed answer.
8. Click a citation and show the retrieved source chunk.
9. Ask an unrelated question and show the fallback answer.
10. Delete a document.
11. Briefly show Docker Compose running locally.
12. Briefly show the README setup instructions.

## Local Useful Commands

Start DB:

```bash
docker compose up -d db
```

Build API Docker image:

```bash
docker compose build api
```

Run migrations from Docker:

```bash
docker compose run --rm api pnpm --filter api db:migrate
```

Start API Docker container:

```bash
docker compose up -d api
```

Check API logs:

```bash
docker compose logs -f api
```

Stop containers:

```bash
docker compose down
```

Do not use this unless you intentionally want to remove database volume data:

```bash
docker compose down -v
```

Run frontend locally:

```bash
pnpm dev:web
```

Run Drizzle Studio:

```bash
pnpm dev:db-studio
```

## Submission Notes

The application satisfies the core challenge requirements:

* Authenticated users
* User-scoped documents
* Text/PDF upload
* Text extraction
* Chunking
* Embedding
* pgvector storage
* Similarity search
* Grounded AI answers
* Citations
* Streaming response
* Dockerized backend and database
* Documented local setup and migration flow
