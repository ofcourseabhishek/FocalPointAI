import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { SmoothScrolling } from "@/components/SmoothScrolling";

const neueHaasGrotesk = localFont({
  src: [
    {
      path: "../fonts/neuehaasgrotdisp-55roman-trial.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/neuehaasgrotdisp-65medium-trial.otf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans", // We map it to the same variable globals.css uses for font-sans
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Snapgrade | See Beyond the Frame",
  description: "Snapgrade reveals the choices behind every photograph.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${neueHaasGrotesk.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-[#e4e4e2]">
        <SmoothScrolling>{children}</SmoothScrolling>
      </body>
    </html>
  );
}
