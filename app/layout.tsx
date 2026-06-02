import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ToonTalk - Chat with Everything",
  description: "A cartoon-styled WhatsApp clone where you chat with anything but humans.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-fredoka bg-yellow-50">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
