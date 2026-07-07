# 운영 체크리스트

기준일: 2026-07-07

## 현재 운영 상태

- Cron: `*/30 * * * *`
- 자동 수집: OpenLigaDB, football-data.org, API-Football, BBC Football RSS, Transfermarkt 공식 RSS
- `ENABLE_FOOTBALL_DATA=true`
- `ENABLE_API_FOOTBALL=true`
- football-data.org 대회: 월드컵·프리미어리그·라리가·분데스리가·세리에 A·리그 1
- API-Football 상세 수집 상한: 대회 조회를 포함해 한 실행 10요청 이내, 현재 최대 4경기
- 동일한 경기·팀·득점 이벤트는 값이 바뀌지 않으면 D1에 다시 쓰지 않음
- 동일한 팀·선수·이적도 값이 바뀌지 않으면 D1에 다시 쓰지 않음

## Secret 발급·교체

1. football-data.org 무료 키와 API-Football 무료 키를 각 공식 대시보드에서 발급한다.
2. 본인이 보관할 32자 이상의 `SYNC_ADMIN_TOKEN`을 만든다. 현재 배포 토큰은 로컬 파일에 저장하지 않는다.
3. 값을 Git이나 명령 인자에 넣지 말고 다음 명령의 대화형 입력으로 교체한다.

```powershell
npx wrangler secret put SYNC_ADMIN_TOKEN --config wrangler.ingest.jsonc
npx wrangler secret put FOOTBALL_DATA_TOKEN --config wrangler.ingest.jsonc
npx wrangler secret put API_FOOTBALL_KEY --config wrangler.ingest.jsonc
```

채팅·이슈·로그 등에 노출된 값은 유효하더라도 폐기하고 새 값으로 교체한다. Secret 값은 Git이나 명령 인자에 넣지 않는다.

## 공급자 장애 시 복구 순서

한 번에 하나씩 검증한다.

1. 장애가 계속되면 `wrangler.ingest.jsonc`에서 해당 공급자의 `ENABLE_*`를 `false`로 바꾸고 배포한다.
2. 공식 대시보드에서 키 상태와 무료 호출량을 확인하고, 필요하면 secret을 교체한다.
3. 해당 `ENABLE_*`를 `true`로 되돌린다.
4. `npm run ingest:deploy`로 배포한다.
5. 관리자 토큰으로 해당 범위만 수동 실행한다.

```powershell
$headers = @{ Authorization = "Bearer $env:SYNC_ADMIN_TOKEN" }
Invoke-RestMethod -Method Post -Headers $headers `
  -Uri "https://soccer-korea-ingest.life-quiz.workers.dev/sync?scope=standings"
```

6. D1의 최근 실행이 `success`이고 `error_message`가 비어 있는지 확인한다.

```powershell
npx wrangler d1 execute soccer-korea-db --remote --config wrangler.ingest.jsonc `
  --command "SELECT provider_id, sync_type, status, records_written, started_at, error_message FROM sync_runs ORDER BY started_at DESC LIMIT 20;"
```

7. 실패하면 해당 `ENABLE_*`를 다시 `false`로 되돌리고 재배포한다.

## 현재 확인된 공급자 상태

- OpenLigaDB·BBC RSS·Transfermarkt RSS: 운영 데이터 수집 성공
- football-data.org: 월드컵 경기·월드컵 및 5대 리그 순위 수집 성공
- API-Football: 확정 이적 수집 성공, null 구단 ID가 포함된 미등록 구단 이적은 안전하게 건너뜀
- 수동 반복 검증에서는 football-data.org의 HTTP 429가 발생할 수 있으므로 자동 스케줄 외 연속 호출을 피함

## 배포 후 확인

```powershell
Invoke-RestMethod https://soccer-korea-ingest.life-quiz.workers.dev/health
Invoke-RestMethod https://soccer-korea-web.life-quiz.workers.dev/api/health
npm test
npm run lint
npx tsc --noEmit
```
