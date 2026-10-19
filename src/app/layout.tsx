import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Dock } from "@/components/Dock";
import { Footer } from "@/components/Footer";
import { SmoothScroll } from "@/components/SmoothScroll";
import { SocialLinks } from "@/components/SocialLinks";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Aaryan Baral — Backend Engineer", template: "%s · Aaryan Baral" },
  description:
    "Backend engineer building reliable distributed systems with .NET and PostgreSQL. This portfolio is itself a live system — explore it.",
};

export const viewport: Viewport = {
  themeColor: "#060606",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script below sets CSS variables on <html> before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SmoothScroll />
        {/* Pages are full-bleed; text containers use .page-container, which clears the vertical dock. */}
        <div className="flex flex-1 flex-col">
          {children}
          <Footer />
        </div>
        <Dock />
        <SocialLinks variant="dock" />
      </body>
    </html>
  );
}
