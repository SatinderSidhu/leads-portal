import type { Metadata } from "next";
import "./globals.css";
import NavBar from "../components/NavBar";

export const metadata: Metadata = {
  title: "App Factory — KITLabs",
  description: "Turn your app idea into reality. Describe your concept, visualize it, and build it — all in one place.",
  metadataBase: new URL("https://appfactory.kitlabs.us"),
  openGraph: {
    title: "App Factory — Turn Your App Idea Into Reality",
    description: "Describe your app concept, watch AI design interactive screens, and submit for building — all in one guided experience. By KITLabs.",
    url: "https://appfactory.kitlabs.us",
    siteName: "App Factory by KITLabs",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "App Factory — KITLabs",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "App Factory — Turn Your App Idea Into Reality",
    description: "Describe your app concept, watch AI design interactive screens, and submit for building. By KITLabs.",
    images: ["/api/og"],
  },
  icons: {
    icon: "/kitlabs-logo.jpg",
    apple: "/kitlabs-logo.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
