import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "SHIVORIX Internship Portal", description: "Learn • Build • Grow with SHIVORIX" };

function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>SHIVORIX · GROWTH · VISION · SUCCESS</span>
      <a href="https://www.shivorixai.com/home" target="_blank" rel="noreferrer">Official website ↗</a>
      <div className="footer-legal">
        <span>© 2026 @shivorix</span>
        <span>Founder: Sneha Gupta</span>
        <span>All rights reserved to SHIVORIX.</span>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<SiteFooter /></body></html>;
}
