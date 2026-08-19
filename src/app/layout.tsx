import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thursday Ball",
  description: "Track who's playing ball on Thursdays.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="min-h-dvh flex justify-center font-body text-text">
          <div className="w-full max-w-[430px] min-h-dvh bg-bg border-x border-divider flex flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
