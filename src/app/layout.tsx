import "./globals.css";

export const metadata = {
  title: "Echoes Temple Builder",
  description: "Standalone temple-building prototype for Echoes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
