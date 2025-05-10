import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Diff Digest | Developer & Marketing Release Notes",
  description: "Transform Git diffs into dual-tone release notes with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased min-h-screen`}>
        <div className="absolute top-0 z-[-2] h-screen w-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(76,130,251,0.3),rgba(10,10,40,0))]"></div>
        <header className="border-b border-blue-500/20 py-4 px-6 backdrop-blur-md bg-black/20 sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <a href="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                  Diff Digest
                </span>
                <span className="text-blue-400">✍️</span>
              </a>
            </div>
            <div>
              <a 
                href="https://github.com/Gunjiilkham/take-home" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-300 hover:text-blue-200 transition-colors flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </header>
        {children}
        <footer className="border-t border-blue-500/20 py-6 px-6 mt-16 backdrop-blur-md bg-black/30">
          <div className="container mx-auto text-center">
            <p className="text-sm text-blue-200/60">
              Built with <span className="text-pink-400">♥</span> using Next.js, Tailwind CSS, and OpenAI
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
