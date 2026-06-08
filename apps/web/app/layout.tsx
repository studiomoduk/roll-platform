import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Palava — Made to Order",
  description:
    "Choose an archive style and print. We make it to order, one garment at a time, with no stock held.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-ink/10">
          <div className="container-narrow flex items-center justify-between py-5">
            <Link href="/" className="font-serif text-xl tracking-tight">
              Palava <span className="text-clay">·</span> Made to Order
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/" className="hover:text-clay">
                Archive
              </Link>
              <Link href="/admin" className="hover:text-clay">
                Studio
              </Link>
            </nav>
          </div>
        </header>
        <main className="min-h-[70vh] py-10">{children}</main>
        <footer className="border-t border-ink/10 py-8 text-center text-xs text-ink/50">
          Palava Micro Factory — made to order, cut to length.
        </footer>
      </body>
    </html>
  );
}
