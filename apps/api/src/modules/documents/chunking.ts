const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 220;

export function normalizeText(text: string): string {
    return text
        .replace(/\r\n/g, "\n")
        .replace(/-\n/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{2,}/g, "\n\n")
        .replace(/\n/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/Page\s+\d+\s+of\s+\d+/gi, "")
        .trim();
}

function splitLongTextByWords(text: string, maxLength: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];

    let current = "";

    for (const word of words) {
        const next = current ? `${current} ${word}` : word;

        if (next.length > maxLength && current) {
            chunks.push(current);
            current = word;
        } else {
            current = next;
        }
    }

    if (current) {
        chunks.push(current);
    }

    return chunks;
}

function splitParagraphIntoSentences(paragraph: string): string[] {
    return paragraph
        .replace(/([.!?])\s+/g, "$1\n")
        .split("\n")
        .map((sentence) => sentence.trim())
        .filter(Boolean);
}

function splitIntoSemanticUnits(text: string, maxLength: number): string[] {
    const paragraphs = text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    const units: string[] = [];

    for (const paragraph of paragraphs) {
        if (paragraph.length <= maxLength) {
            units.push(paragraph);
            continue;
        }

        const sentences = splitParagraphIntoSentences(paragraph);

        for (const sentence of sentences) {
            if (sentence.length <= maxLength) {
                units.push(sentence);
            } else {
                units.push(...splitLongTextByWords(sentence, maxLength));
            }
        }
    }

    return units;
}

function getOverlapText(text: string, overlapLength: number): string {
    if (text.length <= overlapLength) {
        return text;
    }

    const sentences = splitParagraphIntoSentences(text);
    let overlap = "";

    for (let index = sentences.length - 1; index >= 0; index--) {
        const sentence = sentences[index];
        const next = overlap ? `${sentence} ${overlap}` : sentence;

        if (next.length > overlapLength && overlap) {
            break;
        }

        overlap = next;
    }

    if (overlap) {
        return overlap;
    }

    const words = text.split(/\s+/);
    let wordOverlap = "";

    for (let index = words.length - 1; index >= 0; index--) {
        const next = wordOverlap ? `${words[index]} ${wordOverlap}` : words[index];

        if (next.length > overlapLength && wordOverlap) {
            break;
        }

        wordOverlap = next;
    }

    return wordOverlap.trim();
}

export function chunkText(
    rawText: string,
    chunkSize = DEFAULT_CHUNK_SIZE,
    overlap = DEFAULT_CHUNK_OVERLAP
): string[] {
    const text = normalizeText(rawText);

    if (!text) {
        return [];
    }

    const semanticUnits = splitIntoSemanticUnits(text, chunkSize);
    const chunks: string[] = [];

    let currentChunk = "";

    for (const unit of semanticUnits) {
        if (!currentChunk) {
            currentChunk = unit;
            continue;
        }

        const separator = currentChunk.includes("\n\n") ? "\n\n" : " ";
        const nextChunk = `${currentChunk}${separator}${unit}`;

        if (nextChunk.length <= chunkSize) {
            currentChunk = nextChunk;
            continue;
        }

        chunks.push(currentChunk.trim());

        const overlapText = getOverlapText(currentChunk, overlap);
        const candidateWithOverlap = overlapText
            ? `${overlapText} ${unit}`
            : unit;

        currentChunk =
            candidateWithOverlap.length <= chunkSize ? candidateWithOverlap : unit;
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}
