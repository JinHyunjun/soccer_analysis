import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, GitCommitHorizontal, Rocket } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { currentRelease, releases } from "@/content/releases";

export const metadata: Metadata = {
  title: "릴리즈 노트",
  description: "SOCCER/KR에 배포된 기능, 수정 사항과 검증 결과를 버전별로 확인합니다.",
};

export default function ReleasesPage() {
  return (
    <main>
      <SiteNav active="/releases" />
      <div className="page-shell info-page">
        <div className="release-heading">
          <div>
            <span className="eyebrow">CHANGELOG</span>
            <h1>릴리즈 노트</h1>
            <p>검증을 마치고 운영 사이트에 반영된 변경만 기록합니다.</p>
          </div>
          <div className="current-release-card">
            <Rocket size={18} />
            <span>현재 버전</span>
            <strong>v{currentRelease.version}</strong>
            <time dateTime={currentRelease.date}>{currentRelease.date}</time>
          </div>
        </div>

        <div className="release-layout">
          <aside className="release-index" aria-label="릴리즈 목록">
            <span className="eyebrow">VERSIONS</span>
            {releases.map((release, index) => (
              <a href={`#v${release.version}`} key={release.version} className={index === 0 ? "release-current-link" : ""}>
                <strong>v{release.version}</strong><span>{release.date}</span>
              </a>
            ))}
            <Link href="/api/releases">JSON API 보기 →</Link>
          </aside>

          <div className="release-list">
            {releases.map((release, index) => (
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
