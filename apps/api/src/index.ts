import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { env } from "./config/env.ts";
import { authRouter } from "./modules/auth/auth.routes.ts";
import { documentsRouter } from "./modules/documents/documents.routes.ts";
import { askRouter } from "./modules/ask/ask.routes.ts";
import multer from "multer";

const app = express();

const allowedOrigins = env.FRONTEND_URL.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/documents", documentsRouter);
app.use("/ask", askRouter);

app.use((req, res) => {
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.path}`,
    });
});

app.use(
    (
        error: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) => {
        console.error(error);

        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation error",
                issues: error.issues,
            });
        }

        if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    message: "File size must be less than 5MB",
                });
            }
            if (error.code === "LIMIT_FILE_COUNT") {
                return res.status(400).json({
                    message: "File count must be less than 1",
                });
            }
            if (error.code === "LIMIT_UNEXPECTED_FILE") {
                return res.status(400).json({
                    message: "Unexpected file",
                });
            }
            return res.status(400).json({
                message: `File upload error: ${error.code} ${error.message}`,
            });
        }

        if (error instanceof Error) {
            return res.status(500).json({
                message: "Internal server error",
                cause: error.cause,
            });
        }

        return res.status(500).json({
            message: "Internal server error",
        });
    }
);

const port = Number(env.PORT);

app.listen(port, "0.0.0.0", () => {
    console.log(`API running on http://0.0.0.0:${port}`);
});
