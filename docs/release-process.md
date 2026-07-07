# 릴리즈 운영 규칙

운영 사이트의 릴리즈 노트는 [SOCCER/KR Notion 릴리즈 노트](https://app.notion.com/p/396cb889549081748930d92fd26da2b4)를 단일 원본으로 사용합니다. Web Worker가 Notion API를 읽어 D1에 5분 캐시하고, 장애 시에는 마지막 정상 캐시 또는 `src/content/releases.ts`의 검증된 스냅샷을 표시합니다.

- 화면: `/releases`
- JSON: `/api/releases`
- 현재 앱 버전과 장애용 스냅샷: `package.json`, `src/content/releases.ts`
- 자동 검사: `scripts/check-release-note.mjs`

## 신규 기능 배포 순서

1. 기능과 테스트를 구현한다.
2. 같은 변경에서 장애용 `src/content/releases.ts` 스냅샷과 앱 버전을 먼저 준비한다.
3. `package.json`과 `package-lock.json`의 버전을 최신 릴리즈와 맞춘다.
4. `npm run verify`로 릴리즈 가드, ESLint, 테스트, TypeScript를 확인한다.
5. `npm run build:cf`와 Wrangler dry-run을 통과시킨다.
6. Cloudflare에 배포한다.
7. 변경된 공개 경로를 실제 운영 URL에서 확인한다.
8. 검증 완료 후 Notion 릴리즈 노트 최상단에 같은 버전과 변경·검증 결과를 추가한다.
9. `/releases`, `/api/releases`가 최대 5분 안에 `source: notion`으로 새 버전을 표시하는지 확인한다.
10. 검증된 커밋만 GitHub `main`에 푸시한다.

기능 코드, Worker, 마이그레이션, Wrangler 설정 또는 패키지가 바뀌었는데 장애용 릴리즈 스냅샷이 함께 바뀌지 않으면 GitHub Actions가 실패합니다. 배포 완료 여부를 CI가 대신 판단할 수는 없으므로, 실제 배포 검증 직후 Notion 원본을 갱신하는 단계는 운영 체크리스트로 유지합니다.

## 최초 연결

1. Notion에서 내부 통합을 만들고 릴리즈 노트 페이지에 연결한다.
2. 토큰을 코드나 명령 인자에 넣지 말고 `npx wrangler secret put NOTION_TOKEN`의 대화형 입력으로 등록한다.
3. `npm run d1:migrate:remote`로 `release_note_cache` 테이블을 만든 뒤 웹 Worker를 배포한다.
