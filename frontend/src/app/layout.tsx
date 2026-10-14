import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

// SF Pro é a fonte do sistema em dispositivos Apple (primeira da pilha em
// globals.css); Inter é o substituto livre mais próximo para os demais.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MyTabletop",
  description: "Virtual Tabletop RPG self-hosted",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-bg text-text">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
