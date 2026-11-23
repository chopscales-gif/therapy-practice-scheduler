import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { DemoBar } from "@/components/demo-bar";
import { LiveUpdates } from "@/components/live-updates";
import { PracticeProvider } from "@/components/practice-context";
import { StoryProvider } from "@/components/story";
import { fmtDateTime } from "@/lib/time";
import { currentPractice, demoClock } from "@/server/session";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], style: ["normal", "italic"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], style: ["normal", "italic"], axes: ["SOFT", "opsz"] });

export const metadata: Metadata = {
  title: { default: "Therapy practice scheduler (demo)", template: "%s | Therapy practice scheduler (demo)" },
  description:
    "A demonstration build by ChopMedia: online booking, reminders and a waitlist that fills cancelled appointments for a small therapy practice. Fictional practice, sample data.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [now, practice] = await Promise.all([demoClock(), currentPractice()]);
  return (
    <html lang="en" className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <PracticeProvider practice={practice}>
          <StoryProvider>
            <DemoBar clock={now && fmtDateTime(now)} practice={practice} />
            {children}
          </StoryProvider>
        </PracticeProvider>
        <LiveUpdates />
      </body>
    </html>
  );
}
