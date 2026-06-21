"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    FileText,
    Trash2,
    Upload,
} from "lucide-react";

import {
    deleteDocument,
    getDocuments,
    uploadDocument,
    type UserDocument,
} from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type DocumentsPanelProps = {
    compact?: boolean;
    showHeader?: boolean;
    className?: string;
};

function getStatusBadgeVariant(status: UserDocument["status"]) {
    if (status === "failed") return "destructive";
    return "secondary";
}

function getStatusLabel(status: UserDocument["status"]) {
    if (status === "ready") return "Ready";
    if (status === "failed") return "Failed";
    return "Processing";
}

function StatusIcon({ status }: { status: UserDocument["status"] }) {
    if (status === "ready") {
        return <CheckCircle2 className="h-3.5 w-3.5" />;
    }

    if (status === "failed") {
        return <AlertCircle className="h-3.5 w-3.5" />;
    }

    return <Clock3 className="h-3.5 w-3.5" />;
}

export function DocumentsPanel({
    compact = false,
    showHeader = true,
    className,
}: DocumentsPanelProps) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const documentsQuery = useQuery({
        queryKey: ["documents"],
        queryFn: getDocuments,
        retry: false,
        staleTime: 0,
        refetchOnMount: "always",
        refetchInterval: (query) => {
            const data = query.state.data as { documents: UserDocument[] } | undefined;

            return data?.documents.some((document) => document.status === "processing")
                ? 2000
                : false;
        },
    });

    const uploadMutation = useMutation({
        mutationFn: uploadDocument,
        onSuccess: () => {
            setSelectedFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDocument,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
    });

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!selectedFile) {
            return;
        }

        uploadMutation.mutate(selectedFile);
    }

    const documents = documentsQuery.data?.documents ?? [];

    return (
        <div
            className={cn(
                compact ? "flex min-h-0 flex-col gap-4" : "space-y-4",
                className
            )}
        >
            {showHeader ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className={compact ? "text-lg font-semibold" : "text-2xl font-semibold"}>
                            Documents
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Upload .txt or text-based .pdf documents for retrieval.
                        </p>
                    </div>

                    {!compact ? (
                        <Button asChild variant="outline">
                            <Link href="/dashboard">Dashboard</Link>
                        </Button>
                    ) : null}
                </div>
            ) : null}

            <Card size={compact ? "sm" : "default"} className={compact ? "shrink-0" : undefined}>
                <CardHeader className={compact ? "space-y-1 p-4" : undefined}>
                    <CardTitle className={compact ? "text-base" : undefined}>
                        Upload document
                    </CardTitle>
                    <CardDescription>
                        {compact
                            ? "Upload files for chat context."
                            : "Files are extracted, chunked, embedded, and stored with pgvector."}
                    </CardDescription>
                </CardHeader>

                <CardContent className={compact ? "space-y-3 p-4 pt-0" : "space-y-4"}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor={compact ? "ask-document-file" : "document-file"}>
                                Document file
                            </Label>

                            <Input
                                id={compact ? "ask-document-file" : "document-file"}
                                ref={fileInputRef}
                                type="file"
                                accept=".txt,.pdf,text/plain,application/pdf"
                                className={compact ? "h-9 rounded-full text-xs" : undefined}
                                disabled={uploadMutation.isPending}
                                onChange={(event) => {
                                    const file = event.target.files?.[0] ?? null;
                                    setSelectedFile(file);
                                }}
                            />

                            <p className="text-xs text-muted-foreground">
                                Supported formats: .txt and text-based .pdf
                            </p>
                        </div>

                        {selectedFile ? (
                            <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate">
                                    Selected:{" "}
                                    <span className="font-medium">{selectedFile.name}</span>
                                </span>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No file selected yet.
                            </p>
                        )}

                        {uploadMutation.error ? (
                            <p className="text-sm text-destructive">
                                {uploadMutation.error.message}
                            </p>
                        ) : null}

                        {uploadMutation.data ? (
                            <p className="text-sm text-muted-foreground">
                                Uploaded and created{" "}
                                <span className="font-medium">
                                    {uploadMutation.data.chunksCount}
                                </span>{" "}
                                chunks.
                            </p>
                        ) : null}

                        <Button
                            className={compact ? "w-full" : undefined}
                            type="submit"
                            disabled={!selectedFile || uploadMutation.isPending}
                        >
                            <Upload className="h-4 w-4" />
                            {uploadMutation.isPending
                                ? "Uploading..."
                                : selectedFile
                                    ? "Upload document"
                                    : "Choose a file first"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card
                size={compact ? "sm" : "default"}
                className={compact ? "min-h-0 flex-1 overflow-hidden" : undefined}
            >
                <CardHeader className={compact ? "space-y-1 border-b p-4" : undefined}>
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className={compact ? "text-base" : undefined}>
                            Your documents
                        </CardTitle>

                        {documents.length > 0 ? (
                            <Badge variant="outline">{documents.length}</Badge>
                        ) : null}
                    </div>
                    <CardDescription>
                        {compact
                            ? "Available context for chat."
                            : "Uploaded documents are listed with status and chunk count."}
                    </CardDescription>
                </CardHeader>

                <CardContent className={compact ? "flex min-h-0 flex-1 flex-col p-0" : undefined}>
                    {documentsQuery.isLoading ? (
                        <p className={compact ? "p-4 text-sm text-muted-foreground" : "text-sm text-muted-foreground"}>
                            Loading documents...
                        </p>
                    ) : null}

                    {documentsQuery.isError ? (
                        <p className={compact ? "p-4 text-sm text-destructive" : "text-sm text-destructive"}>
                            Could not load documents. Please log in again.
                        </p>
                    ) : null}

                    {!documentsQuery.isLoading && documents.length === 0 ? (
                        <p className={compact ? "p-4 text-sm text-muted-foreground" : "text-sm text-muted-foreground"}>
                            No documents uploaded yet.
                        </p>
                    ) : null}

                    <ScrollArea className={compact ? "min-h-0 flex-1" : "max-h-[480px]"}>
                        <div className={compact ? "space-y-2 p-4 pt-0" : "space-y-3"}>
                            {documents.map((document) => (
                                <article
                                    key={document.id}
                                    className={cn(
                                        "w-full min-w-0 overflow-hidden rounded-lg border bg-background/60 transition-colors hover:bg-muted/40",
                                        compact ? "p-3" : "p-4"
                                    )}
                                >
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                        </div>

                                        <div className="min-w-0 flex-1 overflow-hidden space-y-2">
                                            <div className="min-w-0">
                                                <h3
                                                    className="block max-w-full truncate text-sm font-medium"
                                                    title={document.filename}
                                                >
                                                    {document.filename}
                                                </h3>
                                            </div>

                                            <div
                                                className={cn(
                                                    "min-w-0 items-center gap-2 text-sm text-muted-foreground",
                                                    compact ? "flex overflow-hidden" : "flex flex-wrap"
                                                )}
                                            >
                                                <Badge
                                                    variant={getStatusBadgeVariant(document.status)}
                                                    className="shrink-0 gap-1"
                                                >
                                                    <StatusIcon status={document.status} />
                                                    {getStatusLabel(document.status)}
                                                </Badge>

                                                {!compact ? (
                                                    <span>
                                                        Created at{" "}
                                                        {new Date(document.createdAt).toLocaleString()}
                                                    </span>
                                                ) : null}
                                                <span className={compact ? "shrink-0 text-xs" : undefined}>
                                                    Chunks: {document.chunksCount}
                                                </span>
                                            </div>

                                            {document.errorMessage ? (
                                                <p className="text-sm text-destructive">
                                                    {document.errorMessage}
                                                </p>
                                            ) : null}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size={compact ? "icon" : "sm"}
                                            className={cn("shrink-0", compact ? "h-8 w-8" : undefined)}
                                            disabled={deleteMutation.isPending}
                                            onClick={() =>
                                                deleteMutation.mutate({ documentId: document.id })
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            {!compact ? "Delete" : <span className="sr-only">Delete</span>}
                                        </Button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
