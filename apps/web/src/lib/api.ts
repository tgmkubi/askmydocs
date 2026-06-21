const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AuthUser = {
    id: string;
    email: string;
    createdAt?: string;
};

export type AuthResponse = {
    user: AuthUser;
    token: string;
};

export type DocumentStatus = "processing" | "ready" | "failed";

export type UserDocument = {
    id: string;
    filename: string;
    status: DocumentStatus;
    errorMessage: string | null;
    createdAt: string;
    chunksCount: number;
};

export type AskCitation = {
    citationNumber: number;
    documentId: string;
    filename: string;
    chunkIndex: number;
    content: string;
    similarity: number;
};

export type AskResponse = {
    answer: string;
    citations: AskCitation[];
};

const TOKEN_KEY = "askmydocs_token";

function getCookie(name: string) {
    if (typeof document === "undefined") {
        return null;
    }

    const value = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")[1];

    return value ? decodeURIComponent(value) : null;
}

function setAuthCookie(token: string) {
    if (typeof document === "undefined") {
        return;
    }

    const maxAge = 60 * 60 * 24 * 7;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";

    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(
        token
    )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function clearAuthCookie() {
    if (typeof document === "undefined") {
        return;
    }

    document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getToken() {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem(TOKEN_KEY) ?? getCookie(TOKEN_KEY);
}

export function setToken(token: string) {
    if (typeof window === "undefined") {
        return;
    }

    localStorage.setItem(TOKEN_KEY, token);
    setAuthCookie(token);
}

export function clearToken() {
    if (typeof window === "undefined") {
        return;
    }

    localStorage.removeItem(TOKEN_KEY);
    clearAuthCookie();
}

/* export function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("askmydocs_token");
}

export function setToken(token: string) {
    localStorage.setItem("askmydocs_token", token);
}

export function clearToken() {
    localStorage.removeItem("askmydocs_token");
} */

export async function register(input: {
    email: string;
    password: string;
}): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Register failed");
    }

    return response.json();
}

export async function login(input: {
    email: string;
    password: string;
}): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Login failed");
    }

    return response.json();
}

export async function getMe(): Promise<{ user: AuthUser }> {
    const token = getToken();

    const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error("Unauthorized");
    }

    return response.json();
}

function getAuthHeader() {
    const token = getToken();
    if (!token) throw new Error("You are not logged in.");

    return {
        Authorization: `Bearer ${token}`,
    };
}

export async function getDocuments(): Promise<{ documents: UserDocument[] }> {
    const response = await fetch(`${API_URL}/documents`, {
        headers: getAuthHeader(),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Failed to fetch documents");
    }

    return response.json();
}

export async function uploadDocument(
    file: File
): Promise<{ document: UserDocument; chunksCount: number }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/documents`, {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error ?? error?.message ?? "Upload failed");
    }

    return response.json();
}

export async function deleteDocument(input: {
    documentId: string;
}): Promise<{ deletedDocumentId: string }> {
    const response = await fetch(`${API_URL}/documents/${input.documentId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Delete failed");
    }

    return response.json();
}

export async function askQuestion(input: {
    question: string;
}): Promise<AskResponse> {
    const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Question failed");
    }

    return response.json();
}


type AskStreamInput = {
    question: string;
    onDelta: (delta: string) => void;
    onCitations: (citations: AskCitation[]) => void;
    signal?: AbortSignal;
};

function parseSseMessage(rawMessage: string): {
    event: string;
    data: unknown;
} | null {
    const lines = rawMessage.split("\n");

    let event = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
        if (line.startsWith("event:")) {
            event = line.slice("event:".length).trim();
        }

        if (line.startsWith("data:")) {
            dataLines.push(line.slice("data:".length).trimStart());
        }
    }

    if (dataLines.length === 0) {
        return null;
    }

    return {
        event,
        data: JSON.parse(dataLines.join("\n")),
    };
}

export async function askQuestionStream(input: AskStreamInput): Promise<void> {
    const response = await fetch(`${API_URL}/ask/stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
        body: JSON.stringify({
            question: input.question,
        }),
        signal: input.signal,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Question failed");
    }

    if (!response.body) {
        throw new Error("Streaming is not supported by this browser.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();

        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });

        const messages = buffer.split("\n\n");
        buffer = messages.pop() ?? "";

        for (const message of messages) {
            const parsed = parseSseMessage(message);

            if (!parsed) {
                continue;
            }

            if (parsed.event === "metadata") {
                const data = parsed.data as { citations: AskCitation[] };
                input.onCitations(data.citations);
            }

            if (parsed.event === "delta") {
                const data = parsed.data as { delta: string };
                input.onDelta(data.delta);
            }

            if (parsed.event === "error") {
                const data = parsed.data as { message: string };
                throw new Error(data.message);
            }

            if (parsed.event === "done") {
                return;
            }
        }
    }
}
