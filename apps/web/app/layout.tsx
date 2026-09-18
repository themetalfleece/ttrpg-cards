import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@ttrpg-cards/ui/theme.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "TTRPG Cards",
  description: "Lay out and print tabletop spell & item cards.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
