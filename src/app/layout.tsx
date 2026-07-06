import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOCCER KR — 축구를 한국어로",
  description: "경기, 리그, 이적, 가십과 선수 가치 정보를 한눈에 보는 한국어 축구 데이터 서비스",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
