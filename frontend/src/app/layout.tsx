import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "English Studio",
  description:
    "Hệ thống học tiếng Anh thông minh với từ vựng 3D Flashcard, luyện đặt câu thời gian thực, bài kiểm tra tương tác và video phụ đề song ngữ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-bg-base text-text-main min-h-screen flex flex-col antialiased selection:bg-primary-500 selection:text-text-main`}
      >
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-border-main bg-bg-card/90 backdrop-blur-md py-6 text-center text-xs text-primary-500/60 font-medium">
            <p>© 2026 English Studio. By Meow</p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
