import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { Navbar05 } from "@/components/ui/shadcn-io/navbar-05";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stores Map - Croatia",
  description: "Interactive map of stores in Croatia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navigationLinks = [
    { href: "/", label: "Home" },
    { href: "/users", label: "Users" },
    { href: "/stores", label: "Stores" },
  ];

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <Navbar05 navigationLinks={navigationLinks} />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
