import { Inter } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "F1 Paddock Analytics",
  description: "Real-time F1 schedule, archive, and analytics.",
  appleWebApp: {
    title: "F1 Paddock Analytics",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  document.documentElement.setAttribute('data-theme', savedTheme || systemTheme);
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className={inter.className}>
        <AppLayout>{children}</AppLayout>
        <SpeedInsights />
      </body>
    </html>
  );
}
