# Transfermarkt 연동 방침

조사 기준일: 2026-07-05

## 확인 결과

### 공개 API

Transfermarkt의 공개 개발자 API 문서는 확인되지 않았다. Transfermarkt 공식 포럼의 API 질문에도 운영진이 “공개적으로 사용 가능한 API가 없다”고 답했다.

- https://www.transfermarkt.com/faq-here-you-will-get-a-lot-of-answers-/thread/forum/659/thread_id/5

인터넷의 `Transfermarkt API` 패키지, RapidAPI 상품, GitHub 프로젝트 대부분은 Transfermarkt 공식 API가 아니라 HTML 또는 비공개 엔드포인트를 수집하는 제3자 서비스다. 이름에 API가 들어가도 데이터 사용 권한까지 제공하는 것은 아니다.

### 이용약관

Transfermarkt의 프로그램, 서비스, 프로세스, 기술, 상표, 데이터베이스 및 자료에 대한 권리는 Transfermarkt에 있다고 약관에 명시되어 있다. 에이전트 서비스 약관은 승인되지 않은 mechanism, software, script 사용과 콘텐츠의 배포·공개 표시도 제한한다.

- 한국어 약관: https://www.transfermarkt.co.kr/intern/anb
- 영문 약관: https://www.transfermarkt.com/intern/anb

### 공식 RSS

Transfermarkt는 여러 국가 사이트의 RSS 뉴스피드를 공식적으로 안내하며 무료라고 명시한다.

- 안내: https://www.transfermarkt.co.uk/intern/rssguide
- 영문 RSS: https://www.transfermarkt.co.uk/rss/news

RSS 제공이 선수 몸값·이적 데이터베이스 전체를 복제할 권한을 뜻하지는 않는다.

## 현재 구현 범위

### 사용

- RSS 기사 제목
- 게시 시각
- 원문 URL
- 짧은 RSS 설명
- `Transfermarkt` 출처

이 데이터는 30분마다 Cloudflare Worker가 확인하고 D1 `news_items`에 upsert한다.

### 미사용

- 선수 프로필 HTML 수집
- 시장가치 페이지 크롤링
- 최신 이적 목록 페이지 크롤링
- 모바일 앱 또는 브라우저의 비공개 JSON 엔드포인트
- 봇 차단 회피
- Transfermarkt 이미지·로고 복제

## D1에 준비한 연결점

- `teams.transfermarkt_id`
- `players.transfermarkt_id`
- `players.source_url`
- `transfers.source_url`
- `market_value_history.source_url`

공식 계약을 확보했을 때 기존 내부 ID를 유지한 채 공급자 adapter만 추가할 수 있다.

## 몸값 데이터 정책

몸값은 객관적인 공식 가격이 아니라 공급자의 평가 모델/커뮤니티 판단에 가까우므로 반드시 다음을 함께 저장한다.

- 값과 통화
- 평가 기준일
- 공급자
- 원문 URL
- 획득 방식과 사용 권한 메모

출처 URL 없는 값, 화면에서 손으로 베껴 출처를 숨긴 값, 라이선스가 불명확한 대량 데이터셋은 공개 서비스에 사용하지 않는다.

## 다음 행동

1. Transfermarkt의 Contact/Media Kit 경로로 데이터 API 또는 팬 서비스용 라이선스가 존재하는지 서면 문의
2. 허용 범위가 오면 저장, 캐시, 한국어 번역, 파생 지표, 광고 서비스 여부를 계약서로 확인
3. 공식 API가 없다면 RSS 링크 집계만 유지
4. 몸값은 권리가 명확한 다른 공급자 또는 `SOCCER/KR 추정 가치` 모델로 분리

