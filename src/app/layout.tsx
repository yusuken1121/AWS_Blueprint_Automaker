import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AWS SAA 学習効率最大化システム',
  description: 'Gemini 3 Pro による深い推論とNotion連携で、設計思想を最短距離で習得',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

