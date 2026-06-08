import './globals.css';

export const metadata = {
  title: 'Platinum Township | Immersive 3D Walkthrough',
  description: 'Experience Platinum Township through an immersive virtual walkthrough with 360° panoramic views and interactive scene exploration.',
  keywords: 'Platinum Township, 3D walkthrough, virtual tour, panorama, real estate',
  icons: { icon: '/Logo.png', apple: '/Logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/Logo.png" />
        {/* Preload the entry panorama so Three.js can paint it immediately */}
        <link rel="preload" href="/panoramas/Scene 2_1.jpg" as="image" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
