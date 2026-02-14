import "./globals.css";
import Providers from "./providers";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono"
});

export const metadata = {
  title: "On-Chain Governance Lab",
  description: "Decentralized governance and voting dashboard"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${plexMono.variable} bg-ink text-white`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
