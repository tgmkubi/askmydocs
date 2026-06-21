# AskMyDocs

AskMyDocs is a full-stack AI document Q&A application. Users can register, upload documents, and ask questions against their own uploaded files. The backend extracts text, chunks documents, creates embeddings, stores vectors in PostgreSQL with pgvector, retrieves relevant chunks with vector similarity search, and generates grounded AI answers with citations.

## Live Deployment

Frontend:

```txt
https://askmydocs-eight.vercel.app
```

Backend API:

```txt
https://askmydocs-api.onrender.com
```

Database:

```txt
Neon PostgreSQL with pgvector
```

## Features

* Email/password authentication with JWT
* Protected API routes
* User-scoped documents and chunks
* Protected frontend navigation with Next.js Proxy
* Upload `.txt` and text-based `.pdf` files
* Text extraction, semantic chunking, embedding, and vector storage
* PostgreSQL + pgvector for similarity search
* Document status tracking: `processing`, `ready`, `failed`
* Document listing and deletion
* Streaming AI answers
* Citation-backed answers with retrieved source chunks
* Source inspector panel for citations
* Dark/light theme support
* Responsive chat-focused UI
* Full Docker Compose local setup

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

* Next.js 16
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

### Infrastructure

* Docker Compose for local full-stack setup
* Neon PostgreSQL for production database
* Render for production backend API
* Vercel for production frontend

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
        proxy.ts
      Dockerfile
      package.json

  packages/
    shared/

  docker-compose.yml
  pnpm-workspace.yaml
  package.json
  .env.example
  README.md
```

## Requirements

Recommended local versions:

```txt
Node.js 22+
pnpm 10.24.0
Docker Desktop
```

This project uses pnpm workspaces.

Enable the expected pnpm version with Corepack:

```bash
corepack prepare pnpm@10.24.0 --activate
```

Install dependencies:

```bash
pnpm install
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

For local development from the host machine, `DATABASE_URL` points to the Docker-exposed PostgreSQL port:

```txt
localhost:5434
```

Inside Docker Compose, the API container uses the internal service hostname:

```txt
db:5432
```

## Important Environment Notes

### Local Docker frontend

When the frontend is built inside Docker, use:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

The browser runs outside Docker and cannot resolve Docker service names such as:

```txt
http://api:4000
```

### Production Vercel frontend

When deployed to Vercel, use:

```env
NEXT_PUBLIC_API_URL=https://askmydocs-api.onrender.com
```

`NEXT_PUBLIC_*` variables are used by browser-side code and must be available during the frontend build.

### Production Render backend

Render API should use:

```env
DATABASE_URL=<neon-pooled-connection-string>
JWT_SECRET=<strong-production-secret>
FRONTEND_URL=https://askmydocs-eight.vercel.app
OPENAI_API_KEY=<openai-api-key>
OPENAI_CHAT_MODEL=gpt-4o-mini
PORT=4000
NODE_ENV=production
```

For local and production frontend support at the same time:

```env
FRONTEND_URL=http://localhost:3000,https://askmydocs-eight.vercel.app
```

## Full Docker Local Setup

The project can run locally with Docker Compose.

This starts:

* PostgreSQL with pgvector
* Backend API
* Next.js frontend

Build and start the default services:

```bash
docker compose up --build
```

Open the frontend:

```txt
http://localhost:3000
```

API health check:

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

If this is your first time starting the local database, run migrations:

```bash
docker compose run --rm api pnpm --filter api db:migrate
```

Then restart the services if needed:

```bash
docker compose up -d
```

## Docker Services

Default services:

```txt
db
api
web
```

Optional tool service:

```txt
db-studio
```

The `db-studio` service is not started by default. It is available through the `tools` profile.

Start Drizzle Studio:

```bash
docker compose --profile tools up db-studio
```

Then open the URL printed in the terminal, usually:

```txt
https://local.drizzle.studio?host=localhost&port=4983
```

Stop Drizzle Studio:

```bash
docker compose stop db-studio
```

Stop all Docker services:

```bash
docker compose down
```

Do not use this unless you intentionally want to remove local database volume data:

```bash
docker compose down -v
```

## Hybrid Local Development Setup

You can also run only the database in Docker and run API/frontend from your terminal.

Start PostgreSQL with pgvector:

```bash
docker compose up -d db
```

Run migrations:

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

Optional: open Drizzle Studio locally:

```bash
pnpm dev:db-studio
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

Run migrations locally:

```bash
pnpm --filter api db:migrate
```

Run migrations inside Docker:

```bash
docker compose run --rm api pnpm --filter api db:migrate
```

Run migrations against production Neon database:

```bash
DATABASE_URL="<neon-direct-connection-string>" pnpm --filter api db:migrate
```

The migrations create:

* `vector` extension
* `users` table
* `documents` table
* `chunks` table
* `document_status` enum
* vector embedding column
* HNSW vector index for similarity search

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
4. Frontend stores the token in local storage and cookie.
5. Next.js Proxy checks the auth cookie for protected page navigation.
6. Protected API requests include:

```txt
Authorization: Bearer <token>
```

Protected frontend routes:

```txt
/ask
/documents
/dashboard
```

Important note:

The frontend proxy is only an early navigation guard. Real authorization is enforced by the backend API. Even if a user manually changes the cookie value, backend API requests still require a valid JWT.

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

The upload limit is intended to be suitable for small and medium text-based documents. Very large PDFs may need a background worker or queue-based processing in a production-grade system.

## Known Limitations

* No OCR support for scanned PDFs
* Chat history is stored only in frontend state for the current session
* No document preview viewer
* No admin panel
* No background worker queue yet; document processing currently happens during the upload request
* Very large documents may require async background processing
* Backend deployment URL must be configured manually for production frontend builds

## Deployment

### Database: Neon

The production database runs on Neon PostgreSQL with pgvector enabled.

Production runtime should use the pooled Neon connection string:

```env
DATABASE_URL=<neon-pooled-connection-string>
```

Migration commands should use the direct Neon connection string:

```bash
DATABASE_URL="<neon-direct-connection-string>" pnpm --filter api db:migrate
```

### Backend: Render

The backend is deployed as a Render Web Service.

Important Render environment variables:

```env
DATABASE_URL=<neon-pooled-connection-string>
JWT_SECRET=<strong-production-secret>
FRONTEND_URL=https://askmydocs-eight.vercel.app
OPENAI_API_KEY=<openai-api-key>
OPENAI_CHAT_MODEL=gpt-4o-mini
PORT=4000
NODE_ENV=production
```

After changing environment variables, redeploy the Render service.

Health check:

```txt
https://askmydocs-api.onrender.com/health
```

### Frontend: Vercel

The frontend is deployed to Vercel from the monorepo.

Vercel project settings:

```txt
Framework Preset: Next.js
Root Directory: apps/web
Install Command: pnpm install
Build Command: pnpm build
Output Directory: .next
```

Required Vercel environment variable:

```env
NEXT_PUBLIC_API_URL=https://askmydocs-api.onrender.com
```

Production frontend:

```txt
https://askmydocs-eight.vercel.app
```

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

Install dependencies:

```bash
pnpm install
```

Run local frontend:

```bash
pnpm dev:web
```

Run local API:

```bash
pnpm dev:api
```

Run local Drizzle Studio:

```bash
pnpm dev:db-studio
```

Run full Docker setup:

```bash
docker compose up --build
```

Run migrations from Docker:

```bash
docker compose run --rm api pnpm --filter api db:migrate
```

Run optional Drizzle Studio from Docker:

```bash
docker compose --profile tools up db-studio
```

Check API logs:

```bash
docker compose logs -f api
```

Stop Docker services:

```bash
docker compose down
```

Remove local database volume only if intentionally needed:

```bash
docker compose down -v
```

Run production build checks:

```bash
pnpm --filter api build
pnpm --filter web build
docker compose build
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
* Dockerized database, backend, and frontend
* Optional Dockerized Drizzle Studio
* Deployed frontend, backend, and database
* Documented local setup and migration flow
