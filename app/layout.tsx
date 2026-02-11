import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#F8F6F3",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Sarvam Podcast Generator | Transform PDFs into Multi-Speaker Podcasts",
  description: "Transform any PDF document into an engaging multi-speaker podcast in Indian languages. Powered by Sarvam AI's Document Intelligence, Sarvam-M, and Text-to-Speech APIs.",
  keywords: ["Sarvam AI", "Podcast Generator", "PDF to Audio", "Text to Speech", "Indian Languages", "TTS", "AI Podcast"],
  authors: [{ name: "Sarvam AI" }],
  creator: "Sarvam AI",
  publisher: "Sarvam AI",
  metadataBase: new URL("https://sarvam-podcast-generator.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://sarvam-podcast-generator.vercel.app",
    siteName: "Sarvam Podcast Generator",
    title: "Sarvam Podcast Generator | Transform PDFs into Multi-Speaker Podcasts",
    description: "Transform any PDF document into an engaging multi-speaker podcast in Indian languages. Powered by Sarvam AI.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Sarvam Podcast Generator - Transform PDFs into Podcasts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sarvam Podcast Generator | Transform PDFs into Multi-Speaker Podcasts",
    description: "Transform any PDF document into an engaging multi-speaker podcast in Indian languages. Powered by Sarvam AI.",
    images: ["/og-image.svg"],
    creator: "@sarvamai",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", type: "image/svg+xml", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F8F6F3]`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
