import type { Metadata } from "next";
import {
  Boxes,
  Cloud,
  Code2,
  Database,
  GitBranch,
  RefreshCw,
  ShieldCheck,
  TestTube2,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "기술 스택",
  description: "SOCCER/KR의 프론트엔드, Cloudflare 인프라, 데이터 수집과 검증 구조를 소개합니다.",
};

const stackGroups = [
  {
    icon: Code2,
    eyebrow: "WEB APPLICATION",
    title: "웹 애플리케이션",
    items: ["Next.js 16.2 · App Router", "React 19.2 · TypeScript 5.9", "OpenNext for Cloudflare 1.20", "CSS · Lucide React"],
    note: "서버 렌더링 화면과 JSON API를 같은 코드베이스에서 제공합니다.",
  },
  {
    icon: Cloud,
    eyebrow: "EDGE RUNTIME",
    title: "Cloudflare",
    items: ["Workers · Static Assets", "D1 · SQLite", "Cron Triggers", "Wrangler 4 · Observability"],
    note: "웹과 수집 Worker를 분리해 외부 공급자 장애가 사용자 화면으로 번지지 않게 합니다.",
  },
  {
    icon: RefreshCw,
    eyebrow: "DATA PIPELINE",
    title: "데이터 수집",
    items: ["OpenLigaDB", "football-data.org", "API-Football", "BBC · Transfermarkt RSS"],
    note: "공급자 응답을 검증·정규화한 뒤 D1에 저장하고 마지막 성공 데이터를 계속 제공합니다.",
  },
  {
    icon: TestTube2,
    eyebrow: "QUALITY GATE",
    title: "품질과 배포",
    items: ["Vitest 4", "ESLint 9", "TypeScript strict", "GitHub Actions · Wrangler"],
    note: "테스트·정적 검사·프로덕션 빌드와 릴리즈 노트 검사를 통과한 변경만 배포합니다.",
  },
];

const principles = [
  { icon: ShieldCheck, title: "출처와 권리", body: "공식 API와 RSS를 우선하며 원문 전체나 비공개 엔드포인트를 복제하지 않습니다." },
  { icon: Database, title: "D1 우선 읽기", body: "사용자 요청마다 외부 API를 호출하지 않고 검증된 D1 데이터를 읽어 속도와 안정성을 확보합니다." },
  { icon: Boxes, title: "무료 한도 보호", body: "호출 예산과 조건부 upsert로 외부 API 및 D1 무료 사용량을 통제합니다." },
  { icon: GitBranch, title: "변경 이력 공개", body: "기능과 검증 결과를 릴리즈 데이터에 함께 기록하고 운영 사이트와 JSON API에서 공개합니다." },
];

export default function TechStackPage() {
  return (
    <main>
      <SiteNav active="/tech-stack" />
      <div className="page-shell info-page">
        <section className="info-hero">
          <div>
            <span className="eyebrow">TECHNOLOGY</span>
            <h1>작게 시작하고,<br /><em>운영 가능하게 설계했습니다.</em></h1>
          </div>
          <p>SOCCER/KR은 별도 서버 없이 Cloudflare의 엣지 실행 환경과 D1을 사용합니다. 무료 한도 안에서도 데이터 출처, 장애 격리, 검증 과정을 숨기지 않는 것이 기술 선택의 기준입니다.</p>
        </section>

        <section className="stack-grid" aria-label="기술 스택">
          {stackGroups.map(({ icon: Icon, ...group }) => (
            <article className="stack-card" key={group.title}>
              <Icon size={22} />
              <span className="eyebrow">{group.eyebrow}</span>
              <h2>{group.title}</h2>
              <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
              <p>{group.note}</p>
            </article>
          ))}
        </section>

        <section className="architecture-panel">
          <div className="section-heading compact">
            <div><span className="eyebrow">DATA FLOW</span><h2>데이터가 화면에 도착하는 과정</h2></div>
          </div>
          <div className="architecture-flow" aria-label="데이터 흐름">
            <div><strong>공식 API · RSS</strong><span>경기 · 순위 · 이적 · 뉴스</span></div>
            <b>→</b>
            <div><strong>Ingest Worker</strong><span>검증 · 정규화 · 호출 제어</span></div>
            <b>→</b>
            <div><strong>Cloudflare D1</strong><span>조건부 저장 · 마지막 성공 보존</span></div>
            <b>→</b>
            <div><strong>Web Worker</strong><span>Next.js SSR · JSON API</span></div>
          </div>
        </section>

        <section className="principle-grid" aria-label="기술 원칙">
          {principles.map(({ icon: Icon, ...principle }) => (
            <article key={principle.title}>
              <Icon size={18} />
              <div><h3>{principle.title}</h3><p>{principle.body}</p></div>
            </article>
          ))}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
