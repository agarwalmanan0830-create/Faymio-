import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "sonner";
import "./globals.css";
export const metadata: Metadata = {
  title: "Faymio — The Professional World of Entertainment",
  description:
    "A clear view of your campaigns, talent, and what comes next. The professional operations workspace for creative teams.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster richColors position="bottom-right" closeButton />
      </body>
    </html>
  );
}
