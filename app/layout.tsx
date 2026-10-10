import type { Metadata, Viewport } from "next";
import { Inter, Lora, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], style: ["normal", "italic"] });
// Source Han Serif (Noto Serif SC) for Chinese. Not preloaded: Google serves
// it in unicode-range slices, so readers only download the glyphs on screen.
const notoSerifSC = Noto_Serif_SC({ variable: "--font-noto-serif-sc", weight: ["400", "600"], preload: false, display: "swap" });

export const metadata: Metadata = {
  title: { default: "Inkwell", template: "%s · Inkwell" },
  description: "For the words that need somewhere to go. A private journal and a quiet place to share your writing.",
};

export const viewport: Viewport = { themeColor: "#F4EFE6" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} ${notoSerifSC.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
