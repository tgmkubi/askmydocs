"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type KeyboardEvent,
} from "react";
import { useMutation } from "@tanstack/react-query";
import {
    Bot,
    FileText,
    Files,
    Send,
    Sparkles,
    Square,
    User,
    X,
} from "lucide-react";

import { askQuestionStream, type AskCitation } from "@/lib/api";
import { DocumentsPanel } from "@/features/documents/documents-panel";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: AskCitation[];
    status?: "streaming" | "complete" | "error" | "cancelled";
};

type UseAutoResizeTextareaProps = {
    minHeight: number;
    maxHeight: number;
};

function createMessageId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;

            if (!textarea) {
                return;
            }

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;

            const nextHeight = Math.max(
                minHeight,
                Math.min(textarea.scrollHeight, maxHeight)
            );

            textarea.style.height = `${nextHeight}px`;
        },
        [maxHeight, minHeight]
    );

    useEffect(() => {
        adjustHeight(true);
    }, [adjustHeight]);

    return {
        textareaRef,
        adjustHeight,
    };
}

function isAbortError(error: unknown) {
    return error instanceof DOMException && error.name === "AbortError";
}

function CitationButton({
    citation,
    isSelected,
    onSelect,
}: {
    citation: AskCitation;
    isSelected: boolean;
    onSelect: (citation: AskCitation) => void;
}) {
    return (
        <button
            type="button"
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background/60 text-foreground hover:bg-muted"
            )}
            onClick={() => onSelect(citation)}
        >
            [{citation.citationNumber}] {citation.filename} ·{" "}
            {citation.similarity.toFixed(3)}
        </button>
    );
}

function SourcePanel({
    citation,
    onClear,
}: {
    citation: AskCitation | null;
    onClear: () => void;
}) {
    return (
        <div className="flex h-full min-h-0 flex-col bg-background">
            <div className="flex items-start justify-between gap-3 border-b p-4">
                <div>
                    <h2 className="font-semibold">Source inspector</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Selected citation context.
                    </p>
                </div>

                {citation ? (
                    <Button variant="ghost" size="icon" onClick={onClear}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear selected source</span>
                    </Button>
                ) : null}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4">
                    {!citation ? (
                        <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
                            Click a citation under an assistant answer to inspect the exact
                            retrieved chunk.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-2xl border bg-card p-4">
                                <div className="mb-3 flex items-start gap-2">
                                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {citation.filename}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Citation [{citation.citationNumber}] · Chunk{" "}
                                            {citation.chunkIndex}
                                        </p>
                                    </div>
                                </div>

                                <Badge variant="secondary">
                                    Similarity {citation.similarity.toFixed(3)}
                                </Badge>
                            </div>

                            <div className="rounded-2xl border bg-card p-4">
                                <p className="mb-3 text-sm font-medium">Retrieved context</p>
                                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                    {citation.content}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

export default function AskPage() {
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedCitation, setSelectedCitation] =
        useState<AskCitation | null>(null);
    const [isDocumentsSheetOpen, setIsDocumentsSheetOpen] = useState(false);
    const [isSourceSheetOpen, setIsSourceSheetOpen] = useState(false);

    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 52,
        maxHeight: 180,
    });

    function updateAssistantMessage(
        messageId: string,
        updater: (message: ChatMessage) => ChatMessage
    ) {
        setMessages((currentMessages) =>
            currentMessages.map((message) =>
                message.id === messageId ? updater(message) : message
            )
        );
    }

    function handleCitationSelect(citation: AskCitation) {
        setSelectedCitation(citation);
    }

    const askMutation = useMutation({
        mutationFn: async (input: {
            question: string;
            assistantMessageId: string;
        }) => {
            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            await askQuestionStream({
                question: input.question,
                signal: abortController.signal,
                onDelta: (delta) => {
                    updateAssistantMessage(input.assistantMessageId, (message) => ({
                        ...message,
                        content: message.content + delta,
                        status: "streaming",
                    }));
                },
                onCitations: (nextCitations) => {
                    updateAssistantMessage(input.assistantMessageId, (message) => ({
                        ...message,
                        citations: nextCitations,
                    }));

                    if (nextCitations.length > 0) {
                        setSelectedCitation(nextCitations[0]);
                    }
                },
            });
        },
        onSuccess: (_data, variables) => {
            updateAssistantMessage(variables.assistantMessageId, (message) => ({
                ...message,
                status: "complete",
            }));
        },
        onError: (error, variables) => {
            updateAssistantMessage(variables.assistantMessageId, (message) => {
                if (isAbortError(error)) {
                    return {
                        ...message,
                        content: message.content || "Request cancelled.",
                        status: "cancelled",
                    };
                }

                return {
                    ...message,
                    content:
                        message.content ||
                        (error instanceof Error
                            ? error.message
                            : "Something went wrong while generating the answer."),
                    status: "error",
                };
            });
        },
        onSettled: () => {
            abortControllerRef.current = null;
        },
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    }, [messages]);

    function sendMessage() {
        const trimmedQuestion = question.trim();

        if (!trimmedQuestion || askMutation.isPending) {
            return;
        }

        const userMessage: ChatMessage = {
            id: createMessageId(),
            role: "user",
            content: trimmedQuestion,
            status: "complete",
        };

        const assistantMessage: ChatMessage = {
            id: createMessageId(),
            role: "assistant",
            content: "",
            citations: [],
            status: "streaming",
        };

        setMessages((currentMessages) => [
            ...currentMessages,
            userMessage,
            assistantMessage,
        ]);

        setQuestion("");
        setSelectedCitation(null);
        adjustHeight(true);

        askMutation.mutate({
            question: trimmedQuestion,
            assistantMessageId: assistantMessage.id,
        });
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        sendMessage();
    }

    function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    function handleCancel() {
        abortControllerRef.current?.abort();
    }

    return (
        <main className="h-[calc(100vh-4rem)] overflow-hidden bg-background">
            <div className="grid h-full grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_380px]">
                <aside className="hidden min-h-0 overflow-hidden border-r bg-muted/20 lg:block">
                    <div className="h-full overflow-y-auto p-4">
                        <DocumentsPanel compact showHeader={false} />
                    </div>
                </aside>

                <section className="flex min-h-0 flex-col">
                    <header className="border-b bg-background/95 px-4 py-4 backdrop-blur">
                        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5" />
                                    <h1 className="text-xl font-semibold">Ask your documents</h1>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Chat with uploaded documents using streamed RAG answers.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Sheet
                                    open={isDocumentsSheetOpen}
                                    onOpenChange={setIsDocumentsSheetOpen}
                                >
                                    <SheetTrigger asChild>
                                        <Button className="lg:hidden" variant="outline" size="sm">
                                            <Files className="h-4 w-4" />
                                            Documents
                                        </Button>
                                    </SheetTrigger>

                                    <SheetContent
                                        side="left"
                                        className="w-[92vw] overflow-y-auto sm:max-w-md"
                                    >
                                        <SheetHeader>
                                            <SheetTitle>Documents</SheetTitle>
                                        </SheetHeader>

                                        <div className="mt-4">
                                            <DocumentsPanel compact showHeader={false} />
                                        </div>
                                    </SheetContent>
                                </Sheet>

                                <Sheet
                                    open={isSourceSheetOpen}
                                    onOpenChange={setIsSourceSheetOpen}
                                >
                                    <SheetTrigger asChild>
                                        <Button
                                            className="xl:hidden"
                                            variant="outline"
                                            size="sm"
                                            disabled={!selectedCitation}
                                        >
                                            <FileText className="h-4 w-4" />
                                            Source
                                        </Button>
                                    </SheetTrigger>

                                    <SheetContent side="right" className="w-[92vw] p-0 sm:max-w-md">
                                        <SourcePanel
                                            citation={selectedCitation}
                                            onClear={() => setSelectedCitation(null)}
                                        />
                                    </SheetContent>
                                </Sheet>
                            </div>
                        </div>
                    </header>

                    <ScrollArea className="flex-1">
                        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
                            {messages.length === 0 ? (
                                <div className="flex min-h-[45vh] items-center justify-center">
                                    <div className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
                                        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                                            <Bot className="h-5 w-5" />
                                        </div>
                                        <h2 className="text-lg font-medium">
                                            Start asking your documents
                                        </h2>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Upload documents from the left panel, then ask questions
                                            here. Sources will appear under answers and in the right
                                            panel.
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            {messages.map((message) => {
                                const isUser = message.role === "user";
                                const isAssistant = message.role === "assistant";
                                const isStreaming = message.status === "streaming";
                                const hasCitations =
                                    isAssistant &&
                                    Array.isArray(message.citations) &&
                                    message.citations.length > 0;

                                return (
                                    <article
                                        key={message.id}
                                        className={cn(
                                            "flex gap-3",
                                            isUser ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {isAssistant ? (
                                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                                                <Bot className="h-4 w-4" />
                                            </div>
                                        ) : null}

                                        <div
                                            className={cn(
                                                "max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[75%]",
                                                isUser
                                                    ? "bg-primary text-primary-foreground"
                                                    : "border bg-card text-card-foreground"
                                            )}
                                        >
                                            {isAssistant && !message.content && isStreaming ? (
                                                <p className="text-muted-foreground">Thinking...</p>
                                            ) : (
                                                <p className="whitespace-pre-wrap leading-6">
                                                    {message.content}
                                                    {isStreaming ? (
                                                        <span className="ml-1 animate-pulse">▌</span>
                                                    ) : null}
                                                </p>
                                            )}

                                            {message.status === "error" ? (
                                                <Badge className="mt-3" variant="destructive">
                                                    Error
                                                </Badge>
                                            ) : null}

                                            {message.status === "cancelled" ? (
                                                <Badge className="mt-3" variant="secondary">
                                                    Cancelled
                                                </Badge>
                                            ) : null}

                                            {hasCitations ? (
                                                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                                                    {message.citations?.map((citation) => (
                                                        <CitationButton
                                                            key={`${citation.documentId}-${citation.chunkIndex}`}
                                                            citation={citation}
                                                            isSelected={
                                                                selectedCitation?.documentId ===
                                                                citation.documentId &&
                                                                selectedCitation?.chunkIndex ===
                                                                citation.chunkIndex
                                                            }
                                                            onSelect={handleCitationSelect}
                                                        />
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>

                                        {isUser ? (
                                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                                                <User className="h-4 w-4" />
                                            </div>
                                        ) : null}
                                    </article>
                                );
                            })}

                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    <footer className="border-t bg-background/95 p-4 backdrop-blur">
                        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
                            <div className="rounded-2xl border bg-card p-2 shadow-sm">
                                <Textarea
                                    ref={textareaRef}
                                    value={question}
                                    disabled={askMutation.isPending}
                                    placeholder="Ask a question about your documents..."
                                    className="min-h-[52px] resize-none border-0 bg-transparent px-3 py-3 shadow-none focus-visible:ring-0"
                                    onKeyDown={handleTextareaKeyDown}
                                    onChange={(event) => {
                                        setQuestion(event.target.value);
                                        adjustHeight();
                                    }}
                                />

                                <div className="flex items-center justify-between gap-3 px-2 pb-1">
                                    <p className="text-xs text-muted-foreground">
                                        Press Enter to send, Shift + Enter for a new line.
                                    </p>

                                    <div className="flex items-center gap-2">
                                        {askMutation.isPending ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={handleCancel}
                                            >
                                                <Square className="h-4 w-4" />
                                                <span className="sr-only">Cancel response</span>
                                            </Button>
                                        ) : null}

                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={!question.trim() || askMutation.isPending}
                                        >
                                            <Send className="h-4 w-4" />
                                            <span className="sr-only">Send question</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {askMutation.error ? (
                                <p className="mt-2 text-xs text-destructive">
                                    {askMutation.error.message}
                                </p>
                            ) : null}
                        </form>
                    </footer>
                </section>

                <aside className="hidden min-h-0 border-l bg-muted/20 xl:block">
                    <SourcePanel
                        citation={selectedCitation}
                        onClear={() => setSelectedCitation(null)}
                    />
                </aside>
            </div>
        </main>
    );
}
