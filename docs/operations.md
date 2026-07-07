# 운영 체크리스트

기준일: 2026-07-07

## 현재 안전한 기본 상태

- Cron: `*/30 * * * *`
- 자동 수집: OpenLigaDB, BBC Football RSS, Transfermarkt 공식 RSS
- `ENABLE_FOOTBALL_DATA=false`
- `ENABLE_API_FOOTBALL=false`
- 동일한 경기·팀·득점 이벤트는 값이 바뀌지 않으면 D1에 다시 쓰지 않음

## 외부 API를 켜기 전에 사용자가 준비할 것

1. football-data.org 무료 키와 API-Football 무료 키를 각 공식 대시보드에서 발급한다.
2. 본인이 보관할 32자 이상의 `SYNC_ADMIN_TOKEN`을 만든다. 현재 배포 토큰은 로컬 파일에 저장하지 않는다.
3. 값을 Git이나 명령 인자에 넣지 말고 다음 명령의 대화형 입력으로 교체한다.

```powershell
npx wrangler secret put SYNC_ADMIN_TOKEN --config wrangler.ingest.jsonc
npx wrangler secret put FOOTBALL_DATA_TOKEN --config wrangler.ingest.jsonc
npx wrangler secret put API_FOOTBALL_KEY --config wrangler.ingest.jsonc
```

## 공급자별 활성화 순서

한 번에 하나씩 검증한다.

1. `wrangler.ingest.jsonc`에서 해당 공급자의 `ENABLE_*`만 `true`로 바꾼다.
2. `npm run ingest:deploy`로 배포한다.
3. 관리자 토큰으로 해당 범위만 수동 실행한다.

```powershell
$headers = @{ Authorization = "Bearer $env:SYNC_ADMIN_TOKEN" }
Invoke-RestMethod -Method Post -Headers $headers `
  -Uri "https://soccer-korea-ingest.life-quiz.workers.dev/sync?scope=standings"
```

4. D1의 최근 실행이 `success`이고 `error_message`가 비어 있는지 확인한다.

```powershell
npx wrangler d1 execute soccer-korea-db --remote --config wrangler.ingest.jsonc `
  --command "SELECT provider_id, sync_type, status, records_written, started_at, error_message FROM sync_runs ORDER BY started_at DESC LIMIT 20;"
```

5. 실패하면 해당 `ENABLE_*`를 다시 `false`로 되돌리고 재배포한다.

## 현재 확인된 공급자 상태

- OpenLigaDB·BBC RSS·Transfermarkt RSS: 운영 데이터 수집 성공
- football-data.org: 일부 대회 요청이 HTTP 400이고 현재 경기 결과가 0건이어서 비활성화
- API-Football: 현재 등록된 자격 증명으로 HTTP 403이 발생해 비활성화

## 배포 후 확인

```powershell
Invoke-RestMethod https://soccer-korea-ingest.life-quiz.workers.dev/health
Invoke-RestMethod https://soccer-korea-web.life-quiz.workers.dev/api/health
npm test
npm run lint
npx tsc --noEmit
```
