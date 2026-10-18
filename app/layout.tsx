import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "SHIVORIX Internship Portal", description: "Learn • Build • Grow with SHIVORIX" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
