import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="brand footer-brand">
        <span className="brand-ball">S</span>
        <span>SOCCER<span className="brand-accent">/KR</span></span>
      </div>
      <p>무료 데이터로 시작하되, 출처와 권리를 흐리지 않습니다.</p>
      <div>
        <Link href="/matches">경기</Link>
        <Link href="/standings">순위표</Link>
        <Link href="/transfers">이적·뉴스</Link>
        <Link href="/tech-stack">기술 스택</Link>
        <Link href="/releases">릴리즈 노트</Link>
        <Link href="/api/health">API 상태</Link>
      </div>
    </footer>
  );
}
