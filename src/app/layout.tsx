import type { Metadata } from "next";
import { Figtree} from "next/font/google";
import "./globals.css";
import React from "react";

const figTree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Blue Pacific 2050 Data & Target Tracker: BM Data Visualisation 2025 Pacific Data Competition Entry",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body
        className={`${figTree.variable} ${figTree.variable} antialiased`}
      >
      <div className="min-w-96 min-h-64 w-full overflow-x-auto">
        {children}
      </div>
      </body>
    </html>
  );
}
