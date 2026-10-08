import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Painel | Loca7Moto", template: "%s | Loca7Moto" },
  description: "Gestão de locações e recebimentos da Loca7Moto.",
  robots: { index:false, follow:false },
};
export const viewport: Viewport = {
  themeColor: "#0c2f62",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="pt-BR"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head><body>{children}</body></html>;
}
