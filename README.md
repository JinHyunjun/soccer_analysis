# SOCCER/KR

해외 축구의 경기·리그·이적·가십·선수 가치 정보를 한국어 맥락으로 모으는 Cloudflare 기반 서비스입니다.

- 프로젝트 경로: `C:\soccer`
- 구현·배포 기준일: 2026-07-07
- 웹 런타임: Cloudflare Workers + OpenNext
- 데이터베이스: Cloudflare D1
- 수집: 별도 Cloudflare Worker + Cron Triggers
- 비용 원칙: Workers/D1와 외부 데이터 공급자의 무료 한도 안에서 운영

## 실제 배포

- 웹: https://soccer-korea-web.life-quiz.workers.dev
- 수집 Worker 상태: https://soccer-korea-ingest.life-quiz.workers.dev/health
- D1: `soccer-korea-db`
- 현재 무료 자동 수집: OpenLigaDB, football-data.org, API-Football, BBC Football RSS, Transfermarkt 공식 RSS
- 대회 범위: 2026 월드컵과 프리미어리그·라리가·분데스리가·세리에 A·리그 1

## 현재 구현

### 웹 애플리케이션

- Next.js 16 App Router 한국어 반응형 대시보드
- 경기 일정·스코어, 5대 리그 순위, 가십, 확정 이적, 몸값 영역
- 운영 기술을 공개하는 `/tech-stack`과 검증된 변경 이력을 제공하는 `/releases`
- 외부 연동용 릴리즈 JSON `/api/releases`
- 홈 경기 카드에서 이어지는 경기 상세 화면
- 경기 상세의 득점 타임라인, 팀 지표 비교, 선수 평점·기록 표
- D1에서 저장된 데이터를 읽는 `/api/overview`
- 경기별 팀·선수 통계와 이벤트를 읽는 `/api/matches/:id/stats`
- `/api/health`
- 공급자별 연결·캐시·샘플·미연결 상태 표시
- OpenNext Cloudflare Worker 번들 및 배포 구성

### 수집 Worker

- 무료 플랜 Cron Trigger 1개로 OpenLigaDB 경기·득점 이벤트와 BBC/Transfermarkt RSS를 30분마다 동기화
- football-data.org의 월드컵·5대 리그 경기와 순위 자동 수집
- API-Football의 확정 이적과 경기별 팀·선수 상세 통계 자동 수집
- 키 기반 공급자를 켜면 경기 데이터는 30분, 순위·이적은 6시간, 상세 통계는 매일 03:30 UTC에 동기화
- football-data.org의 무료 분당 한도를 위해 순위 동기화 시각에는 중복 경기 요청을 생략
- API-Football 상세 수집은 대회 조회를 포함해 한 번에 최대 10회 요청하도록 예산 계산
- 변경된 경기·팀·선수·이적 행만 갱신하는 조건부 upsert로 반복 D1 쓰기를 방지
- 45분 이상 끝나지 않은 `sync_runs`는 다음 Cron에서 실패 상태로 정리
- 관리자 인증이 필요한 수동 동기화 API
- 출처와 사용권한이 확인된 몸값 데이터의 수동 import API
- 수집 성공·실패·저장 건수를 `sync_runs`에 기록

### D1

- 공급자, 대회, 팀, 선수
- 경기와 리그 순위
- 뉴스·가십
- 확정 이적
- 선수 몸값 이력
- 팀 경기 통계, 선수 경기 통계, 득점 이벤트, 한국어 지표 정의
- Transfermarkt 외부 ID와 원문 URL
- 수집 실행 이력

## Transfermarkt에 대한 결정

Transfermarkt는 공식 RSS 뉴스피드는 제공하지만 공개 개발자 API는 제공하지 않습니다. 공식 포럼에서도 “publicly available API가 없다”고 답했으며, 이용약관은 데이터베이스·프로세스·자료의 권리를 Transfermarkt에 둡니다.

따라서 현재 구현은 다음 원칙을 따릅니다.

- 허용: Transfermarkt 공식 RSS의 제목, 시각, 원문 링크와 출처를 D1에 저장
- 준비됨: `transfermarkt_id`, `source_url`, 몸값 이력 테이블
- 금지: HTML, 비공개 JSON, 앱 엔드포인트 자동 수집
- 금지: RapidAPI 등의 비공식 “Transfermarkt API”를 공식 API로 간주
- 향후: Transfermarkt의 공식 API 또는 서면 데이터 사용 허가를 받으면 전용 adapter 추가

관련 조사: [Transfermarkt 연동 방침](docs/transfermarkt-integration.md)

## 구조

```text
Cloudflare Cron
      |
      v
Ingest Worker ------------------------------+
  | football-data.org API                   |
  | API-Football transfers + match stats    v
  | OpenLigaDB World Cup results/goals
  | BBC / Transfermarkt RSS         Cloudflare D1
  | authorized market value import          |
                                             v
Browser <---- Next.js / OpenNext <---- Web Worker
```

웹 Worker는 외부 공급자를 직접 호출하지 않고 D1을 읽습니다. 공급자 장애나 호출 제한에도 마지막 성공 데이터를 계속 보여줄 수 있습니다.

## 로컬 준비

```powershell
cd C:\soccer
npm install
```

### 1. D1 생성

Cloudflare 로그인 후 실제 데이터베이스를 생성합니다.

```powershell
npx wrangler login
npx wrangler d1 create soccer-korea-db
```

새 Cloudflare 계정에서 다시 구성한다면 출력된 `database_id`로 다음 두 파일의 ID를 교체합니다.

- `wrangler.jsonc`
- `wrangler.ingest.jsonc`

이 저장소에는 현재 배포된 `soccer-korea-db` ID가 들어 있습니다.

### 2. 무료 API 키

```powershell
Copy-Item .dev.vars.example .dev.vars
```

`.dev.vars`에 다음 값을 입력합니다.

- `FOOTBALL_DATA_TOKEN`: https://www.football-data.org/client/register
- `API_FOOTBALL_KEY`: https://dashboard.api-football.com/register
- `SYNC_ADMIN_TOKEN`: 충분히 긴 임의 문자열

`.dev.vars`는 Git에서 제외됩니다.

운영 환경에서 키 기반 공급자를 활성화할 때는 `wrangler.ingest.jsonc`의 해당 `ENABLE_*` 값을 `true`로 바꾸고 재배포합니다.

### 3. 타입과 로컬 D1

```powershell
npm run cf-typegen
npm run ingest:typegen
npm run d1:migrate:local
```

### 4. 로컬 실행

터미널 1:

```powershell
npm run ingest:dev
```

터미널 2:

```powershell
npm run dev
```

수동 동기화 예시:

```powershell
$headers = @{ Authorization = "Bearer $env:SYNC_ADMIN_TOKEN" }
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8787/sync?scope=news" -Headers $headers
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8787/sync?scope=stats" -Headers $headers
```

## Cloudflare 배포

### 1. 수집 Worker secret 등록

값은 명령 인자로 넘기지 않고 Wrangler의 대화형 입력을 사용합니다.

```powershell
npx wrangler secret put SYNC_ADMIN_TOKEN --config wrangler.ingest.jsonc
npx wrangler secret put FOOTBALL_DATA_TOKEN --config wrangler.ingest.jsonc
npx wrangler secret put API_FOOTBALL_KEY --config wrangler.ingest.jsonc
```

### 2. D1 마이그레이션

```powershell
npm run d1:migrate:remote
```

### 3. 배포

```powershell
npm run ingest:deploy
npm run deploy
```

배포 전 검증:

```powershell
npx opennextjs-cloudflare build
npx wrangler deploy --dry-run
npx wrangler deploy --config wrangler.ingest.jsonc --dry-run
```

OpenNext 1.20.1은 Windows의 Turbopack 추적 경로를 누락하는 문제가 있어 `postinstall`과 `build:cf`가 `scripts/patch-opennext-windows.mjs`를 먼저 실행합니다. 패키지 버전을 올릴 때는 이 보정이 여전히 필요한지 확인해야 합니다.

## 몸값 import

Transfermarkt 화면을 자동 수집하는 대신, 사용 권한이 확인된 값만 관리자 API로 저장합니다.

```json
{
  "items": [
    {
      "playerName": "Player name",
      "playerExternalId": "licensed-source-player-id",
      "transfermarktId": "optional-reference-id",
      "valueEur": 50000000,
      "valuedAt": "2026-07-05",
      "sourceUrl": "https://licensed-source.example/player/1",
      "sourceNote": "Publication permission confirmed"
    }
  ]
}
```

`POST /market-values/import`에 `SYNC_ADMIN_TOKEN` Bearer 인증이 필요합니다. 출처 URL이 없는 값은 저장할 수 없습니다.

## 검증 결과

- TypeScript 통과
- ESLint 통과
- provider·경기 통계·실시간 스코어·Cron 시간표·한국어 표기·요청 예산·릴리즈 무결성 테스트 22개 통과
- 로컬 D1 마이그레이션 `0001`, `0002` 성공
- 수집 Worker health 200
- 공개 웹 `/`, `/api/health`, `/api/overview`, 경기 통계 API, 경기 상세 페이지 모두 실제 Cloudflare 배포에서 200
- 로컬 예약 수집 연속 실행 검증: 최초 경기 644/뉴스 60건 반영 후 동일 데이터 재실행은 경기 0/뉴스 0건 쓰기
- 인증 없는 관리자 요청 401
- BBC RSS 50건, Transfermarkt RSS 10건 D1 저장 확인
- 2026-07-07 운영 기준 OpenLigaDB 월드컵 경기 100건, 득점 이벤트 299건 D1 저장 확인
- football-data.org 순위 100건과 API-Football 확정 이적 2,406건 D1 저장 확인
- 미국 1–4 벨기에 경기 결과가 OpenLigaDB와 football-data.org에서 일치함을 확인
- 조건부 upsert 배포 후 실제 Cron에서 전체 991건 대신 변경 경기 2건·새 뉴스 3건만 기록
- `/api/matches/openligadb:match:82128/stats`가 경기·이벤트를 D1에서 읽어 200 반환
- 홈 경기 카드 → `/matches/:id` 상세 이동과 없는 경기 404 확인
- 상세 화면의 이벤트·빈 데이터 상태와 임시 팀/선수 통계 렌더링 확인 후 테스트 데이터 삭제
- API-Football 선수 상세는 실제 키 등록 후 동작하며, 응답 스키마·상태·지표 정규화는 테스트 완료
- Next 개발 서버가 D1 저장 데이터를 읽어 홈/API 200 반환
- Web Worker gzip 약 1.25 MiB
- Ingest Worker gzip 약 133 KiB
- Web/Ingest Worker Wrangler dry-run 성공
- npm 알려진 취약점 0개

## 문서

- [Cloudflare 아키텍처](docs/cloudflare-architecture.md)
- [Transfermarkt 연동 방침](docs/transfermarkt-integration.md)
- [무료 데이터 전략](docs/free-data-strategy.md)
- [선수 통계 지표 사전](docs/metric-glossary.md)
- [데이터 공급자 확인표](docs/provider-checklist.md)
- [해외 서비스·공식 API 비교 및 통계값 설명](docs/provider-api-matrix.md)
- [운영 체크리스트](docs/operations.md)
- [릴리즈 운영 규칙](docs/release-process.md)
