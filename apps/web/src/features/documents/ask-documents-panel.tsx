"use client";

import { FormEvent, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

type AskDocumentsPanelProps = {
    className?: string;
};

function getStatusLabel(status: UserDocument["status"]) {
    if (status === "ready") return "Ready";
    if (status === "failed") return "Failed";
    return "Processing";
}

function getStatusBadgeVariant(status: UserDocument["status"]) {
    if (status === "failed") return "destructive";
    return "secondary";
}

function StatusIcon({ status }: { status: UserDocument["status"] }) {
    if (status === "ready") {
        return <CheckCircle2 className="h-3 w-3" />;
    }

    if (status === "failed") {
        return <AlertCircle className="h-3 w-3" />;
    }

    return <Clock3 className="h-3 w-3" />;
}

export function AskDocumentsPanel({ className }: AskDocumentsPanelProps) {
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
        <div className={cn("flex h-full min-h-0 flex-col", className)}>
            <section className="shrink-0 border-b p-4">
                <div className="mb-4">
                    <h2 className="font-semibold">Upload document</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Add files to the chat context.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-2">
                        <Label htmlFor="ask-sidebar-document-file">Document file</Label>

                        <Input
                            id="ask-sidebar-document-file"
                            ref={fileInputRef}
                            type="file"
                            accept=".txt,.pdf,text/plain,application/pdf"
                            className="h-9 rounded-full text-xs"
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
                        <div className="rounded-lg border bg-muted/40 p-2">
                            <div className="flex min-w-0 items-start gap-2">
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <p
                                    className="line-clamp-2 min-w-0 break-all text-xs font-medium"
                                    title={selectedFile.name}
                                >
                                    {selectedFile.name}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No file selected yet.</p>
                    )}

                    {uploadMutation.error ? (
                        <p className="text-sm text-destructive">
                            {uploadMutation.error.message}
                        </p>
                    ) : null}

                    {uploadMutation.data ? (
                        <p className="text-xs text-muted-foreground">
                            Uploaded and created{" "}
                            <span className="font-medium">
                                {uploadMutation.data.chunksCount}
                            </span>{" "}
                            chunks.
                        </p>
                    ) : null}

                    <Button
                        className="w-full"
                        type="submit"
                        size="sm"
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
            </section>

            <section className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-b px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="font-semibold">Your documents</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Available context for chat.
                            </p>
                        </div>

                        {documents.length > 0 ? (
                            <Badge variant="outline">{documents.length}</Badge>
                        ) : null}
                    </div>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-2 p-3">
                        {documentsQuery.isLoading ? (
                            <p className="p-2 text-sm text-muted-foreground">
                                Loading documents...
                            </p>
                        ) : null}

                        {documentsQuery.isError ? (
                            <p className="p-2 text-sm text-destructive">
                                Could not load documents. Please log in again.
                            </p>
                        ) : null}

                        {!documentsQuery.isLoading && documents.length === 0 ? (
                            <p className="p-2 text-sm text-muted-foreground">
                                No documents uploaded yet.
                            </p>
                        ) : null}

                        {documents.map((document) => (
                            <article
                                key={document.id}
                                className="group rounded-xl border bg-background/70 p-3 transition-colors hover:bg-muted/40"
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-2">
                                        <p
                                            className="line-clamp-2 break-all text-sm font-medium leading-5"
                                            title={document.filename}
                                        >
                                            {document.filename}
                                        </p>

                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <Badge
                                                variant={getStatusBadgeVariant(document.status)}
                                                className="gap-1 text-[11px]"
                                            >
                                                <StatusIcon status={document.status} />
                                                {getStatusLabel(document.status)}
                                            </Badge>

                                            <span className="text-xs text-muted-foreground">
                                                {document.chunksCount} chunks
                                            </span>
                                        </div>

                                        {document.errorMessage ? (
                                            <p className="line-clamp-2 text-xs text-destructive">
                                                {document.errorMessage}
                                            </p>
                                        ) : null}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100"
                                        disabled={deleteMutation.isPending}
                                        onClick={() =>
                                            deleteMutation.mutate({ documentId: document.id })
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete document</span>
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                </ScrollArea>
            </section>
        </div>
    );
}
