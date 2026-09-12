import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'IPO Family', description: 'IPO updates and family applications, together on your device.', manifest: '/manifest.json', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'IPO Family' }, icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f7f8f3' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
