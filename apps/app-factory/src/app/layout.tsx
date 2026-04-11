import type { Metadata } from "next";
import "./globals.css";
import NavBar from "../components/NavBar";

export const metadata: Metadata = {
  title: "App Factory — KITLabs",
  description: "Turn your app idea into reality. Describe your concept, visualize it, and build it — all in one place.",
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
