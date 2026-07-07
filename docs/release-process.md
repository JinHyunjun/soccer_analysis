# 릴리즈 운영 규칙

운영 사이트의 릴리즈 노트는 `src/content/releases.ts`를 단일 원본으로 사용합니다.

- 화면: `/releases`
- JSON: `/api/releases`
- 현재 앱 버전: `package.json`
- 자동 검사: `scripts/check-release-note.mjs`

## 신규 기능 배포 순서

1. 기능과 테스트를 구현한다.
2. 같은 변경에서 `src/content/releases.ts` 최상단에 새 버전 또는 변경 내용을 기록한다.
3. `package.json`과 `package-lock.json`의 버전을 최신 릴리즈와 맞춘다.
4. `npm run verify`로 릴리즈 가드, ESLint, 테스트, TypeScript를 확인한다.
5. `npm run build:cf`와 Wrangler dry-run을 통과시킨다.
6. Cloudflare에 배포한다.
7. `/releases`, `/api/releases`와 변경된 공개 경로를 실제 운영 URL에서 확인한다.
8. 검증된 커밋만 GitHub `main`에 푸시한다.

기능 코드, Worker, 마이그레이션, Wrangler 설정 또는 패키지가 바뀌었는데 릴리즈 노트가 함께 바뀌지 않으면 GitHub Actions가 실패합니다. 문서만 고치는 변경과 테스트만 보강하는 변경은 새 릴리즈를 강제하지 않습니다.
