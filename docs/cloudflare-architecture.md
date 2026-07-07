# Cloudflare 아키텍처

조사·구현·배포 기준일: 2026-07-07

## 제품 선택

| 요구 | Cloudflare 제품 | 선택 이유 |
|---|---|---|
| Next.js 웹/SSR/API | Workers + OpenNext | App Router, SSR, Route Handler 지원 |
| 관계형 축구 데이터 | D1 | SQLite SQL, 무료 5GB 계정 저장공간, 일 5M rows read/100K writes |
| 주기 수집 | Cron Triggers | 별도 서버 없이 30분 주기 실행 |
| 정적 파일 | Workers Static Assets | OpenNext 빌드 자산을 같은 Worker에 배포 |
| 로그 | Workers Observability | 공급자 오류와 동기화 상태 추적 |

무료 D1의 현재 주요 제한은 계정당 10개 DB, DB당 500MB, 계정 총 5GB, Worker 호출당 D1 query 50회다.

- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/

## 두 Worker를 분리한 이유

### Web Worker

- 사용자 응답과 SEO에 집중
- D1 읽기만 수행
- 외부 데이터 공급자 장애와 호출 제한에서 분리
- OpenNext를 통해 Next.js를 Workers 런타임으로 변환

### Ingest Worker

- 무료 API 호출량을 통제
- Cron과 수동 관리자 동기화 제공
- 외부 응답 검증 후 D1 upsert
- 오류가 발생해도 기존 D1 데이터 보존
- secret은 웹 Worker에 노출하지 않고 수집 Worker에만 바인딩

## 동기화 주기

| Cron | 기능 | 무료 한도 고려 |
|---|---|---|
| `*/30 * * * *` | OpenLigaDB 및 football-data.org 경기, BBC/Transfermarkt RSS | 계정의 Cron Trigger 수를 1개만 사용 |
| 같은 Cron의 `00:00/06:00/12:00/18:00 UTC` | football-data.org 순위, API-Football 이적 | 이 시각에는 football-data.org 경기 요청을 생략해 무료 분당 호출 한도 안에서 실행 |
| 같은 Cron의 `03:30 UTC` | API-Football 경기 상세 통계 | 대회 목록 요청까지 합해 한 번에 10요청 이하로 제한 |

football-data.org와 API-Football의 실제 키를 등록하고 수동 검증했으며, 현재 운영 환경에서는 두 기능 모두 켜져 있습니다. 경기 상세 수집량은 `API_FOOTBALL_MAX_DEEP_FIXTURES=4`를 상한으로 두되 활성 대회 수에 따라 자동으로 더 줄어듭니다.

## D1 쓰기 원칙

- 모든 외부 ID에 공급자 prefix 사용
- `INSERT ... ON CONFLICT DO UPDATE ... WHERE`로 값이 바뀐 행만 갱신
- API-Football 이적 동기화도 팀·선수·이적의 실제 값이 달라질 때만 갱신
- SQL 문자열에 외부 값을 삽입하지 않고 prepared statement `bind()` 사용
- 여러 쓰기는 40개씩 `DB.batch()` 처리
- 조회 컬럼과 정렬 조건에 인덱스 생성
- null을 0으로 바꾸지 않음
- RSS 원문 전체나 이미지는 저장하지 않음
- 몸값은 출처 URL을 필수로 요구

## 보안

- `FOOTBALL_DATA_TOKEN`, `API_FOOTBALL_KEY`, `SYNC_ADMIN_TOKEN`은 Wrangler secret
- 관리자 API Bearer token은 SHA-256 후 constant-time 비교
- 요청 body는 Zod로 검증
- 수동 몸값 import는 한 요청 500개로 제한
- RSS는 1MB를 넘으면 거부
- 오류 응답에 secret이나 upstream 원문을 포함하지 않음
- 관리자 Worker는 향후 Cloudflare Access 또는 Custom Domain route로 추가 보호 권장

## 운영과 장애

- 수집별 `sync_runs` 기록
- 한 RSS 공급자가 실패해도 다른 공급자는 저장
- Web Worker는 외부 호출 대신 마지막 성공 D1 데이터를 표시
- D1이 비어 있거나 로컬 migration 전이면 명시적 샘플/직접 무료 피드 fallback
- `wrangler tail`과 구조화 JSON 로그로 오류 추적

## 배포 검증

- `wrangler types`로 binding 타입 생성
- `opennextjs-cloudflare build`
- Web/Ingest 각각 `wrangler deploy --dry-run`
- `wrangler check startup`
- 로컬 D1 migration과 수집 Worker 통합 테스트

공식 Next.js Workers 안내:

- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://opennext.js.org/cloudflare/bindings
