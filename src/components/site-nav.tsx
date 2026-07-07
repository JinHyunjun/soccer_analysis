import Link from "next/link";
import { Database } from "lucide-react";

const navItems = [
  { href: "/matches", label: "경기" },
  { href: "/standings", label: "순위표" },
  { href: "/transfers", label: "이적·뉴스" },
  { href: "/tech-stack", label: "기술 스택" },
  { href: "/releases", label: "릴리즈" },
];

export function SiteNav({ active }: { active: string }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="SOCCER KR 홈">
        <span className="brand-ball">S</span>
        <span>SOCCER<span className="brand-accent">/KR</span></span>
      </Link>
      <nav aria-label="주요 메뉴">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={active === item.href ? "nav-active" : ""}
            aria-current={active === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link className="header-cta" href="/api/health">
          <Database size={15} /> 데이터 상태
        </Link>
      </div>
    </header>
  );
}
