import type { Metadata } from "next";
import { Providers } from "./providers";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthenticatedNavbar } from "@/components/authenticated-navbar";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // metadataBase: new URL("https://askmydocs.com.tr"),

  title: {
    default: "Ask my docs",
    template: "%s | Ask my docs",
  },

  description:
    "An AI document Q&A app ( RAG). Upload documents, ask questions, get answers grounded in your documents — with citations.",

  openGraph: {
    siteName: "Ask my docs",
    locale: "en_US",
    type: "website",
  },

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Providers>
          <AuthenticatedNavbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
