import type { Metadata } from "next";
import "./globals.css";

const image = "https://bank-loan-dashboard-site.vercel.app/og.png";

export const metadata: Metadata = {
  title: "Loan Ledger | Historical Credit Outcomes",
  description:
    "Explore 39,786 historical LendingClub loans by issue year, grade, DTI band, purpose, and funded volume.",
  openGraph: {
    title: "Loan Ledger | Historical Credit Outcomes",
    description: "An interactive view of historical lending and observed charge-off outcomes.",
    images: [image],
  },
  twitter: { card: "summary_large_image", images: [image] },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
