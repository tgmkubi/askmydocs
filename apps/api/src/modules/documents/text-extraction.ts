import { extractText, getDocumentProxy } from "unpdf";

const SUPPORTED_MIME_TYPES = ["text/plain", "application/pdf"];

type UploadedDocumentFile = {
    mimetype: string;
    buffer: Buffer;
};

export function isSupportedDocumentMimeType(mimeType: string): boolean {
    return SUPPORTED_MIME_TYPES.includes(mimeType);
}

export async function extractTextFromUploadedFile(
    file: UploadedDocumentFile
): Promise<string> {
    if (file.mimetype === "text/plain") {
        return file.buffer.toString("utf-8");
    }

    if (file.mimetype === "application/pdf") {
        const pdf = await getDocumentProxy(new Uint8Array(file.buffer));
        const result = await extractText(pdf, { mergePages: true });

        return result.text;
    }

    throw new Error("Unsupported file type.");
}
