import type { Metadata } from "next";
import { Providers } from "./providers";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppNavbar } from "@/components/app-navbar";

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

  /* twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [
      { url: "/favicon-5312.png", type: "image/png" },
    ],
    shortcut: ["/favicon-5312.png"],
    apple: [
      { url: "/favicon-5312.png" },
    ],
  }, */
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
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppNavbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
