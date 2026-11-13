import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { DemoBar } from "@/components/demo-bar";
import { fmtDateTime } from "@/lib/time";
import { demoClock } from "@/server/session";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Therapy practice scheduler (demo)", template: "%s | Therapy practice scheduler (demo)" },
  description:
    "A demonstration build by ChopMedia: online booking, reminders and a waitlist that fills cancelled appointments for a small therapy practice. Fictional practice, sample data.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const now = await demoClock();
  return (
    <html lang="en" className={`${figtree.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <DemoBar clock={now && fmtDateTime(now)} />
        {children}
      </body>
    </html>
  );
}
