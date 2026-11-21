import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "SocialFlow AI — Intelligent Multi-Platform Social Media Automation System",
  description:
    "Write, review, schedule, and track social posts for LinkedIn, YouTube, Instagram, and Facebook.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <body className="font-sans min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider defaultTheme="light">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
