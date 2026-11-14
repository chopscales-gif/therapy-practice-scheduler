import type { Metadata, Viewport } from "next";
import { Alegreya, Alegreya_Sans } from "next/font/google";
import { DemoBar } from "@/components/demo-bar";
import { fmtDateTime } from "@/lib/time";
import { demoClock } from "@/server/session";
import "./globals.css";

const alegreyaSans = Alegreya_Sans({ variable: "--font-alegreya-sans", subsets: ["latin"], weight: ["400", "500", "700"], style: ["normal", "italic"] });
const alegreya = Alegreya({ variable: "--font-alegreya", subsets: ["latin"], style: ["normal", "italic"] });

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
    <html lang="en" className={`${alegreyaSans.variable} ${alegreya.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <DemoBar clock={now && fmtDateTime(now)} />
        {children}
      </body>
    </html>
  );
}
