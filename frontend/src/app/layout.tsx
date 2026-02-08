import type { Metadata } from "next";
import "./globals.css";
import MagicParticles from "@/components/MagicParticles";
import ArcaneClouds from "@/components/ArcaneClouds";
import GoldDustParticles from "@/components/GoldDustParticles";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Wizard Quest",
  description: "A magical creature collection adventure",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-indigo-950 antialiased">
        <AuthProvider>
          <ArcaneClouds />
          <GoldDustParticles count={50} />
          <MagicParticles />
          <div className="relative z-10 mx-auto max-w-[500px] min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
