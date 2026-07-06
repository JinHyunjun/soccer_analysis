# 해외 축구 통계 서비스·API 조사표

조사 기준일: 2026-07-05. “API가 있다”는 말은 브라우저 개발자 도구에서 내부 JSON 주소를 찾았다는 뜻이 아니라, 공급자가 개발자에게 공식 문서·키·이용 조건을 제공한다는 뜻으로 한정했다.

## 결론

무료 MVP의 실시간 계층은 `football-data.org + OpenLigaDB + API-Football`로 구성한다.

- `football-data.org`: 일정·결과·순위의 안정적인 기본값
- `OpenLigaDB`: 키 없이 가져오는 2026 월드컵 일정·결과·득점 이벤트 fallback
- `API-Football`: 무료 일 100회 안에서 경기별 팀·선수 상세 통계와 확정 이적 수집
- `Transfermarkt RSS + BBC RSS`: 이적 뉴스·가십
- `StatsBomb Open Data`: 라이브 피드가 아닌 고급 이벤트 UI·집계 로직 개발용

몸값은 무료·공식·자동화 가능한 공급자를 찾지 못했으므로 출처와 게시 권한이 확인된 값만 관리자 import로 받는다.

## 서비스별 API·사용 판단

| 서비스 | 유명한 이유 / 화면에서 확인할 수 있는 값 | 공식 개발자 API | 무료 지속 사용 | 현재 판단 |
|---|---|---:|---:|---|
| Transfermarkt | 이적, 계약, 임대, 몸값 이력, 스쿼드, 부상 | 공개 API 없음; 공식 RSS 있음 | RSS만 가능 | RSS만 사용. HTML·내부 JSON 수집 금지 |
| FotMob | 라이브 스코어, 평점, xG/xGOT, 슈팅·패스·수비 맵 | 공개 개발자 API 문서를 확인하지 못함 | 해당 없음 | UX만 참고, 내부 엔드포인트 미사용 |
| Sofascore | 라이브 평점, 공격 모멘텀, 히트맵, 슈팅·패스·드리블 맵 | 공개 데이터 API 문서를 확인하지 못함 | 해당 없음 | UX만 참고, 내부 엔드포인트 미사용 |
| WhoScored | Opta 기반 평점, 강점·약점, 히트맵, 선수 상세 | 일반 개발자용 공개 API 없음 | 없음 | Opta 계약 없이 수집하지 않음 |
| FBref / Stathead | 대규모 표, per-90, 대회·시즌 비교 | 공개 API 없음 | 웹 열람 일부 무료 | 데이터 원천으로 미사용 |
| Understat | xG, xA, npxG, xGChain, xGBuildup, 슈팅 맵 | 공식 API 없음 | 웹 열람 무료 | 비공식 Python 래퍼·내장 JSON 수집 미사용 |
| Opta / Stats Perform | 라이브 이벤트, 선수 추적, 고급 모델 지표 | 공식 API·피드 있음 | 무료 아님, 견적제 | 향후 유료/공식 데이터 단계 후보 |
| Wyscout | 이벤트·좌표·스카우팅·선수 리포트 | 공식 v3 API 있음 | 계약 필요 | B2B·스카우팅 확장 후보 |
| StatsBomb | 이벤트, 360 freeze-frame, xG·OBV | 상용 API 있음; Open Data JSON 공개 | Open Data 일부 대회 무료 | 공개 데이터는 연구·프로토타입에 사용 가능 |
| Sportmonks | 경기, 선수 통계, xG, 라인업, 예측 | 공식 REST API 있음 | 영구 무료 sandbox는 매우 제한적 | 월드컵·상용 운영은 유료이므로 현재 제외 |
| API-Football | 경기, 라인업, 선수/팀 통계, 부상, 이적 | 공식 v3 REST API 있음 | 일 100회, 이용 시즌 제한 | 상세 통계·이적 공급자로 구현 |
| football-data.org | 일정, 결과, 순위, 팀·선수 기본정보 | 공식 v4 REST API 있음 | 12개 대회, 10회/분, 지연 데이터 | 기본 경기·순위 공급자로 구현 |
| TheSportsDB | 팀·선수 프로필, 이미지, 일정·결과 | 공식 v1 JSON API 있음 | 30회/분, 조회 결과·기능 제한 | 메타데이터 보강용 2순위; 깊은 통계에는 부적합 |
| OpenLigaDB | 커뮤니티 기반 리그·대회 결과와 득점자 | 공식 공개 REST/Swagger API 있음 | 키 없이 사용 가능 | 2026 월드컵 경기·득점 fallback으로 구현 |

## 실제로 저장하는 경기별 팀 통계

API-Football의 `/fixtures/statistics` 응답을 아래 내부 코드로 정규화한다. 공급자가 `null`을 주면 0으로 바꾸지 않고 저장하지 않는다.

| 내부 코드 | 한국어 | 의미 |
|---|---|---|
| `shots_total` | 전체 슈팅 | 유효, 빗나감, 수비 블록을 포함한 슈팅 시도 |
| `shots_on_target` | 유효 슈팅 | 골이 되거나 골키퍼 선방이 없었다면 골문 안으로 들어갈 슈팅 |
| `shots_off_target` | 빗나간 슈팅 | 골문 밖으로 향한 슈팅 |
| `shots_blocked` | 블록된 슈팅 | 골문에 도달하기 전에 수비수가 막은 슈팅 |
| `shots_inside_box` | 박스 안 슈팅 | 상대 페널티 박스 안에서 시도한 슈팅 |
| `shots_outside_box` | 박스 밖 슈팅 | 상대 페널티 박스 밖에서 시도한 슈팅 |
| `possession` | 점유율 | 공급자가 산출한 유효 경기 시간 중 공 소유 비율 |
| `passes_total` | 전체 패스 | 시도한 패스 수 |
| `passes_accurate` | 성공 패스 | 동료에게 정확히 연결된 패스 수 |
| `pass_accuracy` | 패스 성공률 | 성공 패스 ÷ 전체 패스의 비율 |
| `corners` | 코너킥 | 공격 팀이 얻은 코너킥 수 |
| `offsides` | 오프사이드 | 오프사이드가 선언된 공격 횟수 |
| `fouls` | 파울 | 해당 팀의 반칙으로 선언된 횟수 |
| `yellow_cards`, `red_cards` | 경고·퇴장 | 해당 팀이 받은 카드 수 |
| `goalkeeper_saves` | 골키퍼 선방 | 골키퍼가 막은 상대 유효 슈팅 수 |
| `expected_goals` | 기대 득점(xG) | 각 슈팅의 득점 확률을 합산한 공급자 모델 값 |
| `goals_prevented` | 실점 방지 | 기대 실점 대비 실제 실점을 이용한 골키퍼 지표 |

## 실제로 저장하는 선수 경기 통계

API-Football `/fixtures/players` 한 번으로 출전 선수들의 다음 값을 저장한다.

- 출전: 시간, 선발/교체, 주장, 등번호, 포지션
- 평점: 공급자의 0~10 경기 평점. 다른 공급자의 평점과 직접 합산하거나 동일 척도로 비교하지 않는다.
- 공격: 슈팅, 유효 슈팅, 골, 도움
- 패스: 전체 패스, 키패스, 패스 성공률
- 수비: 태클, 블록, 가로채기
- 경합: 전체 경합, 승리 경합, 드리블 시도·성공, 드리블 허용
- 규율: 범한 파울, 얻은 파울, 옐로·레드카드
- 골키퍼: 선방, 실점
- 페널티: 획득, 허용, 성공, 실패, 선방

평점·도움·태클·키패스·경합·xG는 공급자별 판정과 모델이 다르다. 모든 응답에는 공급자 ID를 보존하고, 누락과 0을 구분한다.

## 무료 호출 예산

API-Football 무료 한도는 일 100회다. 기본 설정은 현재 날짜의 종료 경기만 최대 8경기 처리한다.

- 대회별 경기 발견: 대회당 1회
- 한 경기의 팀 통계: 1회
- 한 경기의 선수 통계: 1회
- 이적: 설정한 팀당 1회, 6시간 간격

운영 중 `sync_runs`와 공급자 응답 헤더를 확인하며 대회 수와 최대 경기 수를 조정한다. 무료 한도가 부족하면 호출 주기를 늘리고 최근 경기 우선순위를 적용하며, 무단 크롤링으로 보충하지 않는다.

## 공식 출처

- API-Football 문서·필드: https://www.api-football.com/documentation-v3
- API-Football 무료 한도: https://www.api-football.com/pricing
- football-data.org 가격·한도: https://www.football-data.org/pricing
- TheSportsDB API: https://www.thesportsdb.com/documentation
- OpenLigaDB API: https://api.openligadb.de/index.html
- StatsBomb Open Data: https://github.com/statsbomb/open-data
- Wyscout API: https://apidocs.wyscout.com/
- Opta 데이터 피드: https://www.statsperform.com/products/opta-data-feeds/
- Sportmonks 가격: https://www.sportmonks.com/football-api/plans-pricing/

## 공유된 GitHub 저장소

`JinHyunjun/soccer_analysis`는 조사 시점에 커밋과 파일이 없는 빈 공개 저장소다. 참고할 기존 코드나 데이터 수집 로직은 없으며, 사용자의 명시적 요청 전에는 이 로컬 프로젝트를 push하지 않는다.
