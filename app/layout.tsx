import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizPop — Le quiz entre amis",
  description:
    "Crée une partie, partage ton code et défie tes amis dans un quiz interactif.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}