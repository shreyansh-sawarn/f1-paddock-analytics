import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "F1 Schedule | LightsOuts Clone",
  description: "Real-time F1 schedule and local timezone conversions.",
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
        <div className="layout-wrapper">
          <Sidebar />
          <main className="main-content">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <ThemeToggle />
            </div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
