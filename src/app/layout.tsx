import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // Absolute base for og:image URLs (previews need full URLs); falls back to
  // Vercel's own URL when APP_URL isn't set.
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
  title: "Thursday Ball",
  description: "Track who's playing ball on Thursdays.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="min-h-dvh flex justify-center font-body text-text">
          <div className="w-full max-w-[430px] md:max-w-5xl min-h-dvh bg-bg flex flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
