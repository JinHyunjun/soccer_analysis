# 기술 아키텍처와 데이터 설계

> 현재 구현의 기준 아키텍처는 `Cloudflare Workers + OpenNext + D1 + Cron 수집 Worker`다. 아래 PostgreSQL/Redis 내용은 대규모 확장 시 검토안으로만 남겨 둔다. 현재 구조는 `docs/cloudflare-architecture.md`와 루트 `README.md`를 따른다.

## 1. 설계 목표

- 라이브 경기 중에도 안정적으로 갱신한다.
- 공급자의 필드 이름·ID·정의가 바뀌어도 사용자 API는 유지한다.
- 정정된 기록을 다시 수집할 수 있고 어떤 값이 언제 바뀌었는지 추적한다.
- 공급자를 교체하거나 두 공급자를 비교할 수 있다.
- 한국어 설명은 원본 데이터와 독립적으로 개선한다.
- API 키와 원본 공급자 응답을 브라우저에 노출하지 않는다.

## 2. 권장 구성

```text
Data Provider
     |
     v
Provider Adapter --> Raw Payload Archive
     |
     v
Schema Validation --> Normalize/ID Mapping --> PostgreSQL
     |                                         |
     +--> Dead-letter Queue                    +--> Redis Live Cache
                                                    |
Web Browser <-- SSE/HTTP <-- Public API <-----------+
```

### Monorepo

```text
soccer/
  apps/
    web/              # Next.js 사용자 화면
    api/              # Fastify 공개 API와 SSE
    worker/           # 일정/라이브/사후 정정 수집
  packages/
    db/               # Drizzle schema와 migration
    domain/           # 내부 표준 타입, 지표 계산
    providers/        # 공급자별 adapter
    contracts/        # API schema와 생성 타입
    ui/               # 공용 UI와 축구장 시각화
  docs/
```

지금은 문서만 만들었으며 공급자 선정 후 이 구조를 생성한다.

## 3. 기술 선택

### Frontend: Next.js + TypeScript

- 경기·대회·선수 페이지를 서버 렌더링해 검색 노출과 공유 미리보기에 유리하다.
- 경기 전/후 데이터는 캐시하고 라이브 숫자만 SSE로 갱신한다.
- `next-intl` 같은 번역 레이어에서 UI 문구를 관리하되 선수·팀 이름은 별도 `localized_names` 테이블을 쓴다.
- 접근성을 위해 색만으로 팀·결과를 구분하지 않고 숫자와 아이콘을 함께 제공한다.

### API: Fastify

- 공급자 API를 그대로 프록시하지 않고 우리 내부 DTO만 반환한다.
- TypeBox 또는 Zod로 요청·응답 스키마를 검증하고 OpenAPI를 생성한다.
- 라이브 단방향 갱신은 SSE, 알림·채팅처럼 양방향 기능이 생길 때만 WebSocket을 추가한다.

### Worker: Node.js + BullMQ

작업 종류를 분리한다.

- `sync-competition`: 대회·시즌·라운드
- `sync-fixture`: 일정·경기 상태·스코어
- `sync-lineup`: 선발·벤치·포메이션
- `sync-events`: 골·카드·교체·슈팅 이벤트
- `sync-player-stats`: 선수 경기 통계
- `reconcile-final`: 경기 종료 후 최종 정정
- `backfill`: 과거 경기 또는 장애 구간 재수집

권장 폴링 예시:

| 경기 상태 | 주기 | 대상 |
|---|---:|---|
| 경기 24시간 이전 | 6~12시간 | 일정·장소 |
| 24시간~90분 전 | 15분 | 상태·예상 정보 |
| 90분 전~킥오프 | 1~3분 | 선발·포메이션 |
| 라이브 | 공급자 권장 한도 내 5~15초 | 스코어·이벤트·통계 |
| 종료 직후 1시간 | 1~5분 | 최종 통계·정정 |
| 종료 다음 날 | 1회 | 공식 정정 반영 |

동일 fixture 작업에는 분산 잠금을 걸고, 지수 백오프와 jitter를 사용한다. 429 응답은 공급자의 `Retry-After`를 우선한다.

### Database: PostgreSQL + Drizzle

관계가 뚜렷하고 정확성이 중요한 스포츠 데이터에는 PostgreSQL이 기본 선택이다. JSONB는 원본/미확정 부가 필드에만 사용한다. 월드컵 규모에서 TimescaleDB나 별도 분석 DB는 필요 없다.

Redis는 다음에만 사용한다.

- 라이브 경기 스냅샷 캐시
- BullMQ 작업 큐
- SSE fan-out
- 중복 수집 방지 잠금

영구 원장은 PostgreSQL이며 Redis를 원본으로 삼지 않는다.

## 4. 핵심 데이터 모델

### 엔터티 테이블

- `competitions`: 대회
- `seasons`: 시즌/대회 회차
- `stages`, `groups`, `rounds`: 조별·토너먼트 구조
- `teams`: 클럽/국가대표
- `players`: 선수 기본 정보
- `venues`: 경기장
- `fixtures`: 일정, 상태, 스코어, 킥오프 UTC
- `fixture_teams`: 홈/원정, 승부차기 포함 결과
- `lineups`: 선발/벤치, 등번호, 포지션, 포메이션 좌표
- `events`: 골, 카드, 교체, 슈팅 등 시간순 이벤트
- `player_match_stats`: 선수 경기 단위 표준 통계
- `metric_definitions`: 지표 이름·단위·한국어 설명·정의 버전
- `localized_names`: 선수/팀/대회 이름의 언어별 표기

### 공급자와 감사 테이블

- `providers`: 공급자 정보와 계약 메타데이터
- `provider_entity_ids`: 내부 ID와 공급자 ID 매핑
- `provider_metric_map`: 공급자 필드를 내부 지표로 변환하는 규칙
- `provider_payloads`: 응답 본문 해시, 수집 시각, endpoint, 저장 위치
- `ingest_runs`: 시작/종료, 성공/실패, 요청 수, 누락 수
- `stat_revisions`: 이전 값·새 값·변경 시각·원인

### `player_match_stats` 예시 필드

식별/문맥:

- `fixture_id`, `player_id`, `team_id`, `provider_id`
- `started`, `position_code`, `shirt_number`, `minutes_played`
- `rating`, `rating_scale`, `definition_version`

통계:

- `goals`, `assists`, `shots_total`, `shots_on_target`, `shots_blocked`
- `xg`, `npxg`, `xgot`, `xa`
- `passes_attempted`, `passes_completed`, `key_passes`, `big_chances_created`
- `crosses_attempted`, `crosses_completed`, `long_balls_attempted`, `long_balls_completed`
- `touches`, `touches_opp_box`, `dribbles_attempted`, `dribbles_completed`
- `duels_total`, `duels_won`, `aerials_total`, `aerials_won`
- `tackles`, `interceptions`, `clearances`, `blocks`, `recoveries`, `dribbled_past`
- `fouls_committed`, `fouls_won`, `offsides`, `yellow_cards`, `red_cards`
- `saves`, `saves_inside_box`, `goals_conceded`, `penalties_saved`

모든 수치에는 null을 허용한다. null은 “공급자가 제공하지 않음/아직 집계되지 않음”이며 0과 다르다.

## 5. 공급자 어댑터 계약

```ts
interface FootballProvider {
  getCompetition(providerCompetitionId: string): Promise<RawCompetition>;
  getFixtures(input: FixtureQuery): Promise<RawFixture[]>;
  getLineups(providerFixtureId: string): Promise<RawLineup[]>;
  getEvents(providerFixtureId: string): Promise<RawEvent[]>;
  getPlayerMatchStats(providerFixtureId: string): Promise<RawPlayerMatchStat[]>;
}
```

어댑터는 네트워크 호출과 공급자 필드 해석만 담당한다. 내부 ID 매핑, 한국어 설명, 90분당 계산, 사용자 응답 조립은 domain 계층이 담당한다.

필수 테스트:

- 저장해 둔 실제 응답 fixture에 대한 스키마 계약 테스트
- 공급자 필드 누락/추가/타입 변경 테스트
- 동일 응답의 멱등 처리 테스트
- 경기 정정 시 revision 생성 테스트
- 0과 null 구분 테스트

## 6. API 초안

```text
GET /v1/competitions/:id
GET /v1/competitions/:id/fixtures?date=2026-07-05
GET /v1/fixtures/:id
GET /v1/fixtures/:id/lineups
GET /v1/fixtures/:id/player-stats
GET /v1/fixtures/:id/events
GET /v1/fixtures/:id/stream
GET /v1/players/:id
GET /v1/metrics/:code
```

응답에는 다음 메타데이터를 포함한다.

```json
{
  "data": {},
  "meta": {
    "provider": "contracted-provider",
    "collectedAt": "2026-07-05T12:34:56Z",
    "status": "provisional",
    "definitionVersion": "provider-2026-01"
  }
}
```

## 7. 캐시와 실시간 전략

- 대회/팀/선수 기본 정보: 1일 이상
- 미래 일정: 1시간~1일
- 경기 직전 라인업: 30~60초
- 라이브 스코어/이벤트: 3~10초
- 종료 경기 통계: 처음 1시간은 1분, 확정 후 장기 캐시
- 브라우저는 공급자를 직접 호출하지 않고 우리 API/SSE만 사용
- ETag 또는 `updatedAt`으로 변하지 않은 응답 전송을 줄임

## 8. 한국어 현지화

이 서비스의 차별점은 번역 그 자체보다 “한국 팬이 이해할 수 있는 맥락”이다.

- 이름: 원문, 공식 한글명, 검색 별칭을 분리
- 시간: DB는 UTC, UI는 Asia/Seoul 기본
- 지표: 짧은 이름, 한 줄 설명, 상세 설명, 계산식, 주의점 저장
- 용어: `clearance=클리어링`, `recovery=볼 회복`처럼 프로젝트 용어집으로 통일
- 검색: 손흥민/Son Heung-min/Heung-Min Son 같은 별칭 지원
- 출처: 평점과 xG 앞에 공급자 배지 표시

LLM 번역을 쓴다면 경기 사실값을 생성하게 하지 않고, 사람이 승인한 템플릿 문구와 뉴스 요약 보조에만 사용한다.

## 9. 운영 지표

- 공급자 응답 지연 p50/p95
- 경기별 마지막 성공 수집 시각
- endpoint별 429/5xx 비율
- 예상 선수 수 대비 통계 수신 선수 수
- 주요 필드 null 비율
- 경기 종료 후 최종 정정까지 걸린 시간
- 공급자 값과 표시 값의 불일치 건수
- API 캐시 적중률과 SSE 연결 수

## 10. 개발 순서

### 0단계: 공급자 검증

- 같은 월드컵 경기 3개를 후보 API에서 수집
- 실제 필드, null 비율, 지연, 정정, 권리를 비교

### 1단계: 경기 센터 MVP

- 일정, 스코어, 라인업, 선수 표
- 지표 설명 팝오버
- 종료 경기 기준으로 먼저 출시

### 2단계: 라이브

- Worker, Redis, SSE
- 장애·지연 표시와 provisional/final 상태

### 3단계: 시각화

- 좌표 라이선스가 확보된 경우 슈팅 맵부터 구현
- 패스·수비·히트맵 순으로 확장

### 4단계: 독자 가치

- 한국 선수 알림과 비교
- 역할별 백분위와 한국어 해설
- 공급자 원본을 복제하는 수준을 넘어 자체 큐레이션과 설명을 강화
