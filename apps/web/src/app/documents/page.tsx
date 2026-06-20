import { DocumentsPanel } from "@/features/documents/documents-panel";

export default function DocumentsPage() {
    return (
        <main className="min-h-screen bg-background p-6">
            <div className="mx-auto max-w-3xl">
                <DocumentsPanel />
            </div>
        </main>
    );
}
