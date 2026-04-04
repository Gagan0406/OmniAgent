import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omni Copilot",
  description:
    "AI copilot with unified access to Gmail, Calendar, Notion, Slack, and more.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
