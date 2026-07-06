# 무료 데이터 전략

조사 기준일: 2026-07-05

## 결론

무료만으로 프로토타입과 초기 비상업 서비스는 가능하다. 그러나 경기별 세밀한 선수 통계, 실시간 몸값, 전체 이적시장의 구조화 데이터까지 안정적으로 무료 제공하는 단일 공급자는 없다. 따라서 기능별 공급자를 분리하고 데이터가 없을 때 허위 값이나 무단 수집으로 메우지 않는다.

## 기능별 선택

| 기능 | 현재 선택 | 무료 한도/조건 | 구현 상태 |
|---|---|---|---|
| 경기·일정·순위 | football-data.org v4 | 무료 계정 10회/분, 출처 표시 | 어댑터 구현 |
| 뉴스·가십 | BBC Sport Football RSS | 제목·링크 표시 허용, BBC Sport 출처 필요 | 실제 피드 연결 |
| 확정 이적 | API-Football transfers | 무료 100회/일, 팀 ID별 캐시 | 어댑터 구현 |
| 몸값 | 검증 중 | 무료·실시간·재게시 허용 소스 부재 | 빈 상태 구현 |
| 세부 선수 경기 통계 | 검증 중 | football-data.org 무료 범위로는 부족 | 내부 모델만 설계 |
| 개발용 이벤트 좌표 | StatsBomb Open Data | 공개 일부 대회, 출처/로고 요구 | 향후 시각화 fixture 용도 |

## football-data.org

- 무료 계정 제한은 분당 10회다.
- 경기, 대회, 팀, 순위, 득점자 등의 기본 데이터를 제공한다.
- 앱의 잘 보이는 곳에 `Data provided by football-data.org` 문구가 필요하다.
- 세부 선수 경기 통계와 몸값을 해결해 주는 공급자는 아니다.

공식 문서:

- https://docs.football-data.org/general/v4/policies.html
- https://www.football-data.org/documentation/faq

## BBC Sport RSS

BBC는 Sport RSS 피드를 웹사이트 일부로 사용하는 것을 장려하지만 적절한 형식과 `BBC Sport` 또는 `From BBC Sport` 출처를 요구하며 BBC 로고 사용은 허용하지 않는다.

우리 구현은 다음만 저장·표시한다.

- 기사 제목
- 게시 시각
- 원문 링크
- 짧은 RSS 요약(대표 기사에서만 제한적으로 표시)
- 출처

공식 안내:

- https://www.bbc.co.uk/sport/articles/cqllxj2n4kyo
- https://support.bbc.co.uk/platform/feeds/SportFeeds.htm

## API-Football

- 무료 플랜은 100회/일이며 transfers endpoint를 포함한다.
- 전체 시장을 매번 훑지 않고 관심 팀 ID만 정해 1시간 이상 캐시한다.
- 약관은 앱·웹사이트 제작을 예로 들지만, 대회 주최자에게 필요한 게시 권리를 얻을 책임이 사용자에게 있다고 명시한다.
- 로고·선수 사진은 별도 권리 대상으로 취급한다.

공식 문서:

- https://www.api-football.com/pricing
- https://www.api-football.com/terms

## foot.io

문서상 선수 시즌 통계, 이적료, 계약, 이적 당시 몸값 등을 하나의 API로 제공하고 무료 5,000회/월을 안내한다. 무료 티어는 비상업 프로젝트만 허용하며 출처 표시가 필요하다.

다만 2026-07-05 현재 사이트가 private beta이고 홈페이지는 공개 키를 2026년 3분기로 안내한다. API 호스트도 현재 로컬 검증에서 확인되지 않아 핵심 의존성으로 사용하지 않는다.

- https://foot.io/
- https://foot.io/docs
- https://foot.io/terms

## Transfermarkt

RSS 뉴스피드는 공식적으로 무료 제공되지만, 사이트 화면이나 내부 데이터를 자동 수집해 몸값·이적 데이터베이스를 복제하는 권한과는 다르다. 공개 개발자 API도 확인되지 않았다. 현재 구현은 공식 RSS의 제목·게시 시각·링크만 D1에 저장하며 구조화된 몸값 수집에는 사용하지 않는다.

- https://www.transfermarkt.co.uk/intern/rssguide
- https://www.transfermarkt.co.kr/intern/anb
- https://www.transfermarkt.com/faq-here-you-will-get-a-lot-of-answers-/thread/forum/659/thread_id/5

## 몸값의 현실적인 무료 경로

### 경로 A: 공개 공급자 대기

foot.io 공개 베타 또는 재게시 조건이 명확한 다른 API가 안정화되면 어댑터를 추가한다.

### 경로 B: 공개 데이터셋 기반 연구 화면

CC/ODC 라이선스가 명확한 스냅샷 데이터가 있으면 `기준일이 지난 연구 데이터`로만 제공한다. 실시간 몸값처럼 표시하지 않는다.

### 경로 C: 자체 추정 가치

나이, 출전 시간, 포지션, 리그 강도, 계약 잔여 기간, 경기 기여도를 입력으로 자체 모델을 만들 수 있다. 이 값은 시장의 공식 가격이 아니므로 다음을 모두 표시해야 한다.

- `SOCCER/KR 추정 가치`라는 독자 명칭
- 모델 버전과 기준일
- 입력 데이터 출처
- 오차 범위
- 이적료·Transfermarkt 몸값과 다르다는 설명

## 무료 운영 원칙

- API 키를 브라우저에 노출하지 않는다.
- 호출 제한보다 긴 캐시를 적용한다.
- RSS 원문 전체와 이미지를 복제하지 않는다.
- 가십과 확정 이적을 별도 엔터티와 UI로 관리한다.
- 0, null, 미연결, 샘플을 구분한다.
- 서비스가 상업화되면 무료 비상업 라이선스를 즉시 재검토한다.
