"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Upload } from "lucide-react";

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
        <div className={cn("space-y-4", className)}>
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

            <Card>
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

                <CardContent className={compact ? "space-y-4 p-4 pt-0" : "space-y-4"}>
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
                            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                                Selected: <span className="font-medium">{selectedFile.name}</span>
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

            <Card className={compact ? "overflow-hidden" : undefined}>
                <CardHeader className={compact ? "space-y-1 p-4" : undefined}>
                    <CardTitle className={compact ? "text-base" : undefined}>
                        Your documents
                    </CardTitle>
                    <CardDescription>
                        {compact
                            ? "Available context for chat."
                            : "Uploaded documents are listed with status and chunk count."}
                    </CardDescription>
                </CardHeader>

                <CardContent className={compact ? "p-0" : undefined}>
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

                    <ScrollArea className={compact ? "h-[calc(100vh-25rem)] min-h-72" : "max-h-[480px]"}>
                        <div className={compact ? "space-y-2 p-4 pt-0" : "space-y-3"}>
                            {documents.map((document) => (
                                <article
                                    key={document.id}
                                    className={cn(
                                        "rounded-lg border",
                                        compact ? "p-3" : "p-4"
                                    )}
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />

                                                <h3 className="truncate font-medium">
                                                    {document.filename}
                                                </h3>

                                                <Badge variant={getStatusBadgeVariant(document.status)}>
                                                    {getStatusLabel(document.status)}
                                                </Badge>
                                            </div>

                                            <div className="space-y-1 text-sm text-muted-foreground">
                                                {!compact ? (
                                                    <p>
                                                        Created at{" "}
                                                        {new Date(document.createdAt).toLocaleString()}
                                                    </p>
                                                ) : null}
                                                <p>Chunks: {document.chunksCount}</p>
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
