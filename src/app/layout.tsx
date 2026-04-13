import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProviderDev from "@/components/auth/AuthProviderDev";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Carbon Tracker - Digital Footprint Monitor",
    template: "%s | Carbon Tracker",
  },
  description:
    "Track your digital carbon footprint and make a positive environmental impact. Monitor your online activities, set reduction goals, and earn achievements.",
  keywords: [
    "carbon footprint",
    "digital carbon",
    "environmental impact",
    "sustainability",
    "carbon tracking",
    "eco-friendly",
    "green technology",
  ],
  authors: [{ name: "Carbon Tracker Team" }],
  creator: "Carbon Tracker",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌱</text></svg>",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌱</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
  openGraph: {
    title: "Carbon Tracker - Digital Footprint Monitor",
    description:
      "Track your digital carbon footprint and make a positive environmental impact",
    type: "website",
    locale: "en_US",
    siteName: "Carbon Tracker",
  },
  twitter: {
    card: "summary",
    title: "Carbon Tracker - Digital Footprint Monitor",
    description:
      "Track your digital carbon footprint and make a positive environmental impact",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="Carbon Tracker" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Carbon Tracker" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProviderDev>{children}</AuthProviderDev>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}