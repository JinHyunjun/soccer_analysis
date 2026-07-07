export type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  summary: string;
  highlights: readonly string[];
  validation: readonly string[];
  routes?: readonly string[];
  commits?: readonly string[];
};

export type ReleaseFeed = {
  releases: readonly ReleaseNote[];
  fetchedAt: string;
  source: "notion" | "cache" | "snapshot";
  stale: boolean;
};

export const NOTION_RELEASE_PAGE_ID = "396cb889-5490-8174-8930-d92fd26da2b4";
export const NOTION_RELEASE_PAGE_URL = "https://app.notion.com/p/396cb889549081748930d92fd26da2b4";

export const releases: readonly ReleaseNote[] = [
  {
    version: "0.5.0",
    date: "2026-07-07",
    title: "경기 데이터 신뢰도와 화면 전면 개선",
    summary: "승부차기 점수, 상세 통계 연결, 선수명과 리그·이적 화면의 혼동을 함께 해소했습니다.",
    highlights: [
      "정규·연장 점수와 승부차기 결과를 분리해 1-1(승부차기 3-4)처럼 정확히 표시",
      "API-Football 이벤트·팀 통계·선수 기록을 수집하고 공급자 간 동일 경기를 자동 연결",
      "골·카드·교체·VAR·승부차기를 경기 타임라인에 구분해 표시",
      "football-data.org 시즌 값을 명시하고 무료 호출 주기를 6시간으로 조정해 반복 400 오류 방지",
      "현재 피드의 선수 한국어 이름을 확대하고 개막 전 순위표를 ‘순위 미정’으로 표시",
      "순위표 너비와 뉴스·이적 소문 카드의 높이·그리드를 일관된 레이아웃으로 정리",
    ],
    validation: [
      "OpenLigaDB 승부차기 회귀 테스트",
      "API-Football 무료 요청 예산 테스트",
      "ESLint, Vitest, TypeScript, Cloudflare 프로덕션 빌드",
      "D1 마이그레이션 및 운영 화면·API 검증",
    ],
    routes: ["/", "/matches", "/standings", "/transfers", "/api/overview"],
    commits: [],
  },
  {
    version: "0.4.1",
    date: "2026-07-07",
    title: "Notion 릴리즈 노트 연동",
    summary: "Notion을 릴리즈 기록의 단일 원본으로 삼고 운영 사이트가 변경 내용을 자동으로 읽도록 전환했습니다.",
    highlights: [
      "SOCCER/KR 프로젝트 아래에 공개용 Notion 릴리즈 노트 생성",
      "Notion 블록을 읽어 /releases와 /api/releases에 반영하는 연동 추가",
      "Cloudflare D1에 5분 캐시를 저장해 Notion 장애 시 마지막 정상 데이터 유지",
      "Notion 미연결·오류 상황에서는 검증된 내장 스냅샷으로 안전하게 대체",
    ],
    validation: [
      "Notion 블록 파서 자동 테스트",
      "캐시·스냅샷 장애 처리 검증",
      "Cloudflare 배포 후 릴리즈 화면과 JSON API 확인",
    ],
    routes: ["/releases", "/api/releases"],
    commits: [],
  },
  {
    version: "0.4.0",
    date: "2026-07-07",
    title: "기술 공개와 릴리즈 기록",
    summary: "서비스의 기술 선택과 변경 이력을 운영 사이트에서 직접 확인할 수 있게 했습니다.",
    highlights: [
      "기술 스택과 데이터 흐름을 설명하는 /tech-stack 페이지 추가",
      "배포 이력을 한곳에서 확인하는 /releases 페이지와 /api/releases JSON 추가",
      "사이트 전역 내비게이션과 푸터에서 기술·릴리즈 페이지 연결",
      "기능 코드 변경 시 릴리즈 노트 누락을 차단하는 GitHub Actions 검사 추가",
    ],
    validation: [
      "Vitest 자동 테스트 22개",
      "ESLint 및 TypeScript",
      "Next.js·OpenNext 프로덕션 빌드",
      "Cloudflare Workers 배포 후 공개 URL 점검",
    ],
    routes: ["/tech-stack", "/releases", "/api/releases"],
    commits: [],
  },
  {
    version: "0.3.0",
    date: "2026-07-07",
    title: "다중 페이지와 한국어 현지화",
    summary: "홈 대시보드에서 경기·순위·이적 전용 화면으로 확장하고 한국어 이름 표기를 강화했습니다.",
    highlights: [
      "경기 전체 목록, 리그 전체 순위, 이적·뉴스 전용 페이지 추가",
      "유럽 5대 리그 구단, 월드컵 국가대표, 주요 선수 이름 한국어 현지화",
      "경기 카드와 순위표가 번역된 팀 이름을 일관되게 사용하도록 수정",
      "공통 상단 내비게이션과 모바일 대응 레이아웃 추가",
    ],
    validation: ["신규 공개 경로 HTTP 200", "한국어 팀·선수명 렌더링 확인"],
    routes: ["/matches", "/standings", "/transfers"],
    commits: ["867d963", "bfb3976"],
  },
  {
    version: "0.2.0",
    date: "2026-07-07",
    title: "월드컵에서 유럽 5대 리그로",
    summary: "월드컵 중심 화면을 프리미어리그·라리가·분데스리가·세리에 A·리그 1까지 확장했습니다.",
    highlights: [
      "football-data.org의 유럽 5대 리그 순위 수집 및 한국어 대회명 적용",
      "API-Football 무료 호출량에 맞춘 경기 상세 수집 예산 적용",
      "팀·선수·이적 조건부 upsert로 Cloudflare D1 반복 쓰기 절감",
      "홈 화면에 5대 리그 순위 카드 노출",
    ],
    validation: ["자동 테스트 19개", "공개 SSR HTML과 D1 데이터 교차 확인"],
    routes: ["/", "/api/overview"],
    commits: ["c3cd94c"],
  },
  {
    version: "0.1.1",
    date: "2026-07-07",
    title: "외부 API 연동 복구",
    summary: "football-data.org와 API-Football 운영 수집을 복구하고 예외 응답을 안전하게 처리했습니다.",
    highlights: [
      "football-data.org 경기·순위 수집 재활성화",
      "API-Football 이적·경기 통계 수집 재활성화",
      "미등록 구단의 null 팀 ID가 포함된 이적 건을 안전하게 건너뛰도록 수정",
    ],
    validation: ["두 공급자 실제 응답 200", "미국 1–4 벨기에 결과 교차 검증"],
    routes: [],
    commits: ["47feb2d", "392b011"],
  },
  {
    version: "0.1.0",
    date: "2026-07-06",
    title: "SOCCER/KR 첫 배포",
    summary: "Cloudflare 기반 한국어 축구 데이터 서비스의 첫 운영 버전입니다.",
    highlights: [
      "Next.js와 OpenNext 기반 Cloudflare Web Worker",
      "Cloudflare D1 축구 데이터 스키마와 마이그레이션",
      "30분 Cron 기반 수집 Worker와 관리자 동기화 API",
      "OpenLigaDB, BBC Football RSS, Transfermarkt 공식 RSS 연결",
    ],
    validation: ["Web·Ingest Worker 배포", "공개 health 및 overview API 확인"],
    routes: [],
    commits: ["0782595"],
  },
] as const;

export const currentRelease = releases[0];

export const FALLBACK_RELEASE_FEED: ReleaseFeed = {
  releases,
  fetchedAt: "2026-07-07T00:00:00.000Z",
  source: "snapshot",
  stale: true,
};
