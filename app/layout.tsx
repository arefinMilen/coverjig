import type { Metadata } from "next";
import { Playfair_Display, DM_Mono } from "next/font/google";
import { BookDesignerProvider } from "@/context/BookDesignerContext";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "BookCover Studio",
  description: "Design stunning 2D book covers with ease",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmMono.variable}`}suppressHydrationWarning>
      <body>
        <BookDesignerProvider>{children}</BookDesignerProvider>
      </body>
    </html>
  );
}