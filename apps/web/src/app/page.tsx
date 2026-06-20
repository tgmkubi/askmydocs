import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="text-3xl font-semibold">AskMyDocs</h1>
        <p className="text-sm text-gray-600">
          Upload documents and ask grounded questions with citations.
        </p>

        <div className="flex gap-3">
          <Link className="rounded bg-black px-4 py-2 text-white" href="/login">
            Login
          </Link>
          <Link className="rounded border px-4 py-2" href="/register">
            Register
          </Link>
        </div>
      </main>
    </div>
  );
}
