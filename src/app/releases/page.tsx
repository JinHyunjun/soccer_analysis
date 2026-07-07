import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, ExternalLink, GitCommitHorizontal, Rocket } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { NOTION_RELEASE_PAGE_URL } from "@/content/releases";
import { getReleaseFeed } from "@/lib/notion-releases";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "릴리즈 노트",
  description: "SOCCER/KR에 배포된 기능, 수정 사항과 검증 결과를 버전별로 확인합니다.",
};

const sourceLabels = {
  notion: "Notion 최신 원본",
  cache: "Notion 캐시",
  snapshot: "내장 스냅샷",
};

export default async function ReleasesPage() {
  const feed = await getReleaseFeed();
  const currentRelease = feed.releases[0];

  return (
    <main>
      <SiteNav active="/releases" />
      <div className="page-shell info-page">
        <div className="release-heading">
          <div>
            <span className="eyebrow">CHANGELOG</span>
            <h1>릴리즈 노트</h1>
            <p>Notion에서 관리하고, 검증을 마친 변경만 운영 사이트에 자동 반영합니다.</p>
          </div>
          {currentRelease && (
            <div className="current-release-card">
              <Rocket size={18} />
              <span>현재 버전 · {sourceLabels[feed.source]}</span>
              <strong>v{currentRelease.version}</strong>
              <time dateTime={currentRelease.date}>{currentRelease.date}</time>
            </div>
          )}
        </div>

        <div className="notion-source-banner">
          <div><strong>Notion이 릴리즈 노트의 단일 원본입니다.</strong><span>최대 5분 캐시 · 연결 오류 시 마지막 정상 데이터 또는 스냅샷 표시</span></div>
          <a href={NOTION_RELEASE_PAGE_URL} target="_blank" rel="noreferrer">Notion 원본 <ExternalLink size={12} /></a>
        </div>

        <div className="release-layout">
          <aside className="release-index" aria-label="릴리즈 목록">
            <span className="eyebrow">VERSIONS</span>
            {feed.releases.map((release, index) => (
              <a href={`#v${release.version}`} key={release.version} className={index === 0 ? "release-current-link" : ""}>
                <strong>v{release.version}</strong><span>{release.date}</span>
              </a>
            ))}
            <Link href="/api/releases">JSON API 보기 →</Link>
          </aside>

          <div className="release-list">
            {feed.releases.map((release, index) => (
              <article className="release-card" id={`v${release.version}`} key={release.version}>
                <header>
                  <div className="release-version"><span>{index === 0 ? "CURRENT" : "RELEASE"}</span><strong>v{release.version}</strong></div>
                  <div><CalendarDays size={13} /><time dateTime={release.date}>{release.date}</time></div>
                </header>
                <h2>{release.title}</h2>
                <p className="release-summary">{release.summary}</p>
                <div className="release-body-grid">
                  <section>
                    <h3>변경 사항</h3>
                    <ul>{release.highlights.map((item) => <li key={item}>{item}</li>)}</ul>
                  </section>
                  <section>
                    <h3>검증</h3>
                    <ul className="validation-list">{release.validation.map((item) => <li key={item}><CheckCircle2 size={13} />{item}</li>)}</ul>
                  </section>
                </div>
                {(release.routes?.length || release.commits?.length) && (
                  <div className="release-meta">
                    {release.routes?.map((route) => <Link href={route} key={route}>{route}</Link>)}
                    {release.commits?.map((commit) => (
                      <a href={`https://github.com/JinHyunjun/soccer_analysis/commit/${commit}`} target="_blank" rel="noreferrer" key={commit}>
                        <GitCommitHorizontal size={12} />{commit}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
