# vibe-mod — Session Handoff (2026-05-13 late, OpenAI 400 diagnosis + 3-stage probe)

> `/handon` 으로 로드. 직전 핸드오프: `claudedocs/2026-05-13-platform-bug-session-handoff.md` (Devvit plugin RPC 회복 + ENUM refactor 라운드).
>
> 이 파일 = Devvit plugin RPC 복구 *후* 드러난 OpenAI HTTP 400 "We could not parse the JSON body" 진단 + 자율 검증 인프라 (synthetic compile probe) 구축 라운드.

---

## §0 두 줄 요약

- **무엇**: PR #26~#31 6건 모두 머지. Devvit plugin RPC layer는 회복 (`scheduler/rate-limit: settings.get OK, maxPerHour=100` × n번 확인). 다음 막힘: `compose-rule-submit` → `callOpenAI` → **OpenAI returns HTTP 400 "We could not parse the JSON body of your request"**. 로컬 `npm run openai:smoketest` 는 **21/21 PASS** (3 모델 × 7 케이스), Devvit 시크릿 키 = .env 키 (length 164, sync 됨), 그러나 production fetch 만 400. ASCII-safe body 가설은 v0.0.30 자율 probe 3회 시도 모두 실패로 **기각**. 현재 v0.0.31에 **3-stage probe** (GET /v1/models / POST tiny / POST full) 배포 중 — 어느 fetch shape에서 OpenAI가 거부하는지 isolation 단계.
- **다음 세션 1순위**: v0.0.31 cron `*/2` probe 결과를 `npx devvit logs r/SocialSeeding --since 5m` 으로 수집하여 (a) GET / (b) POST tiny / (c) POST full 중 어디서 실패하는지 확인 → 원인 isolation (auth / body-transit-any-size / payload-content) → 그에 맞는 fix. 그 후 probe 제거 PR.

---

## §1 진행한 작업 (시간순)

### Phase A — 검증 인프라 다지기 (이전 라운드 마무리)
- PR #26 / #27 / #28 / #29 / #30 모두 머지. ENUM/SoT refactor, resilient fallback, deps upgrade 완료.
- 라이브: 12분+ 로그 window에서 HTTP 500 0건, scheduler 매 cron tick 200 + warn 로그만. Plugin RPC layer **복구 확인**.

### Phase B — OpenAI HTTP 400 등장
- 사용자 v0.0.27 클릭 → 토스트: `"Compiler offline. Try again in a minute."` (일반 fallback). 로그: `[vibe-mod] submit: callOpenAI threw: { message: 'openai_400', ... }`.
- PR #31 (`fix/openai-error-handling`) 머지: status-aware toast (400/401/429/5xx 분기) + 응답 body up to 1 KB 로깅.
- v0.0.28 install. 사용자 다시 클릭. 로그에 OpenAI body 확인:
  ```
  HTTP 400 body: {
    "error": {
      "message": "We could not parse the JSON body of your request. ...",
      "type": "invalid_request_error", "param": null, "code": null
    }
  }
  ```

### Phase C — `/Users/kimsejun/Downloads/devpost-zesty-pond.md` 외부 진단 반영
- 외부 문서 (사용자가 download) 가 우리 진단 6가지 사실 검증 + 6가지 권고 액션 제시. 적용 항목:
  - ✅ `subredditOpenaiApiKey` 조회 실패 → warning only (fatal X)
  - ✅ BYOK 존재시 global key 조회 skip
  - ✅ 공식 docs 패턴의 `.env` fallback (게이트 제거 — Reddit 프로덕션은 `process.env` 없으므로 안전)
  - ✅ 토스트 문구 완화 (`reddit/devvit#258` 단정 → "Devvit settings/plugin RPC unavailable. (Possibly related to #258 — same gRPC layer.)")
  - ✅ `typeof + length(openaiApiKey)` 진단 프로브 (값 절대 로깅 안 함)
  - ✅ Clean checkout 파이프라인 1회 실증: `git clone --depth 1` + `npm ci` + `npm run check` → 4/4 acceptance gates PASS, 178 tests + 3 @devvit/test green.
- 안 적용 (이미 동등하거나 인증된 단정 안 함):
  - 0.12.23 pin (이미 완료)
  - 에러 문자열 정확 표기 (이미 코드에 반영됨)

### Phase D — 자율 진단 (Stop hook 압박 하에)
- 사용자 직접 .env 키 → Devvit secret sync (값 화면 노출 없이, length만 표시: 164자). 이전 키 인비저 가능성 배제.
- 로컬 3-model smoketest 21/21 PASS — 우리 요청 schema + 키는 OpenAI가 200으로 받음. 즉 production-only 문제.
- ASCII-safe body 가설 (em-dash / ≈ / → → `\uXXXX` 이스케이프, JSON parser 동등). v0.0.29 배포. 라이브 round-trip 검증.
- 메뉴 클릭은 자율 불가 (Reddit web UI는 브라우저 액션) → **`/internal/scheduler/synthetic-compile-probe`** cron `*/2` 추가 = production에서 callOpenAI를 메뉴 클릭 없이 호출하는 자율 진단 경로.
- v0.0.30 (probe v1) 배포 → 5분 window → 3회 시도 모두 HTTP 400 동일 에러. **ASCII-safe 가설 기각**.
- v0.0.31 (probe v2) 배포 → 3-stage 분리: (a) GET /v1/models (auth, no body), (b) POST tiny 100 byte body (~3 fields), (c) full callOpenAI. 다음 cron tick에 결과 수집 예정.

### Phase E — 외부 contribution 유지
- `reddit/devvit#261` (우리 이슈, OPEN, settings/redis/reddit plugin RPC reproduction) — 이번 라운드 추가 댓글 없음 (Plugin RPC 회복은 우리 측에서 관측, Reddit 측 응답 대기 중일 수 있음).
- `reddit/devvit-docs#109` (Plugin RPC resilience 가이드 문서 PR) — OPEN, 리뷰 대기.

---

## §2 현재 상태

### Git
| branch | HEAD | upstream | 비고 |
|---|---|---|---|
| `main` (local stale) | `daf8a7a` | (behind) | `git pull` 필요 |
| `origin/main` | `5c73199` (Merge #31) | — | 모든 PR 머지된 ground truth |
| `fix/openai-error-handling` (active) | `fa64429` | pushed | 4 commits ahead of local main, **2 commits (probe v1+v2) ahead of origin/main** = 미머지 |
| `feat/resilient-fallback` | (deleted on remote after PR #30 merge) | — | 정리 가능 |
| `refactor/enums-and-constants` | (deleted after PR #28 merge) | — | 정리 가능 |
| `fix/devvit-plugin-rpc-diag` | (deleted after PR #27 merge) | — | 정리 가능 |

`fix/openai-error-handling` 의 미머지 2 커밋:
- `6184502` diag(probe): synthetic-compile-probe v1 (단일 callOpenAI 시도)
- `fa64429` diag(probe): v2 3-stage (GET / POST tiny / POST full)

**머지 정책**: probe는 *진단 전용 임시 코드*. 결과 확인 후 separate PR로 *probe 제거* 가 정상. 그러므로 이 2 커밋은 main에 곧장 머지하지 말고, *결과 수집 → 원인 fix PR → probe 제거 PR* 순서로 정리.

### Open PRs (Two-Weeks-Team/vibe-mod)
- 0개 (모두 머지).

### External (reddit/...)
- **reddit/devvit#261** OPEN — settings/redis/reddit plugin RPC reproduction (우리 issue)
- **reddit/devvit#258 comment** posted — 우리 reproduction 데이터
- **reddit/devvit-docs#109** OPEN — Plugin RPC resilience 가이드 (우리 PR)

### Live (r/SocialSeeding)
- App: <https://developers.reddit.com/apps/vibe-mod> — **v0.0.31** installed
- Plugin RPC: ✅ working (scheduler tick `settings.get OK` 확인)
- Compose flow: ❌ blocked — OpenAI HTTP 400 "We could not parse the JSON body" — 원인 isolation 진행 중 (3-stage probe)
- Devvit secret `openaiApiKey`: ✅ set (length 164 — .env 키와 동일, smoketest 21/21 검증된 키)

### 빌드 / 점수
- `npm run check` 4/4 gates PASS (typecheck + lint + Prettier + tests + devvit-test + acceptance)
- 178 unit + 3 @devvit/test (1 skipped) — all green
- `dist/server/index.cjs` ≈ 2.14 MB (gzip ~353 KB, oxc minifier)
- Clean checkout (별도 디렉토리에서 git clone → npm ci → npm run check) 4/4 PASS — **재현 가능 인증**
- OpenAI 3-model smoketest 21/21 (gpt-5.4-mini / gpt-5.4-nano / gpt-5.4)

### 환경
- node v24.15.0, npm
- @devvit/* pinned exact 0.12.23
- typescript 6.0.3, vite 8.0.12, eslint 10.3.0, @hono/node-server 2.0.2
- devvit CLI authenticated as `u/DragonfruitAfraid309`
- `~/.devvit/token` 존재 (1346 bytes)
- repo cwd = `/Users/kimsejun/Documents/GitHub/vibe-mod`
- Fork repos cloned: `~/Documents/GitHub/devvit-docs`, `~/Documents/GitHub/devvit`

### 해커톤 D-day
- **2026-05-27 18:00 PT** (firm). 오늘 = 2026-05-13 21:46 KST. 약 14일 남음.
- `devvit publish --public` 리뷰 ~1주 → ~2026-05-18 (D-9) 시작 필요. 현재 D-9까지 약 5일.

---

## §3 다음 세션에서 할 수 있는 것

### 즉시 (Claude — 사용자 입력 불필요)

1. **[CRITICAL] v0.0.31 probe 결과 수집** —
   ```bash
   npx devvit logs r/SocialSeeding --since 10m --show-timestamps 2>&1 > /tmp/probe-results.txt
   grep -A1 "probe(a)\|probe(b)\|probe(c)" /tmp/probe-results.txt
   ```
   확인할 시나리오:
   - **A: 셋 다 200** — 캐시 / 일시적 transient. probe 한 번 더 돌려 재현성 확인.
   - **B: (a)만 200, (b)+(c) 400** — body transit 문제 (size 무관). Content-Type / Content-Encoding / fetch wrapper layer. 다음 fix 후보: `Transfer-Encoding`, body as Uint8Array, no Content-Type, etc.
   - **C: (a)+(b) 200, (c) 400** — payload-content 또는 size 문제. Few-shot examples 또는 system prompt 길이/내용. 다음 fix: prompt 축소, response_format JSON object 없이 시도.
   - **D: (a) 401/403** — 키 자체 문제. Devvit 시크릿 재설정 또는 OpenAI 키 rotation.
   - **E: 셋 다 400 동일 메시지** — Devvit HTTP plugin이 모든 POST에 동일 transform. Devvit-side 버그. reddit/devvit 이슈 강화.

2. **결과에 따라 fix PR open** — probe 결과로 원인 isolation 후 적절한 fix 작성. 가능성:
   - Body 를 `Buffer.from(json, 'utf-8')` 또는 `new Blob([json])` 으로 바꿔보기
   - Content-Type 명시 제거 / `application/json; charset=utf-8` 시도
   - 명시적 Content-Length 추가
   - request body 를 `URLSearchParams` 으로 다시 시도 (실패하지만 401 같은 다른 에러로 노출되면 디버깅 단서)

3. **probe 제거 PR** — fix 검증 후 `/internal/scheduler/synthetic-compile-probe` 엔드포인트 + devvit.json scheduler task 둘 다 삭제. 정상 production 상태로 복귀.

4. **PR #31 후 임시 branch cleanup** — `feat/resilient-fallback`, `refactor/enums-and-constants`, `fix/devvit-plugin-rpc-diag` 로컬 + 원격 정리.

5. **Module split (handoff §3 P2)** — `src/server/index.ts` (~1300 줄) → `routes/{menu,forms,triggers,scheduler,settings}.ts` + `openai.ts` + `diag.ts`. 178 routes 테스트가 `import app from './index'` 하니까 그건 유지. 단, OpenAI 400 풀리기 전에는 우선순위 낮음.

6. **reddit/devvit-docs#109 follow-up** — CLA 서명 후 (사용자 액션 필요) → 리뷰어 응답 모니터링 + 피드백 반영.

7. **Devpost 글 마무리** — `docs/devpost-submission.md` placeholder 채우기 (URL, 팀 reddit username, 영상 등). 단, Compose flow가 라이브로 작동해야 영상 가능.

### Reddit fix / OpenAI fix 들어오면 (외부 변수 — 사용자 입력 불필요)

A. probe 결과로 fix 풀린 시점에 즉시 deploy → live menu click 한 번으로 전체 플로우 검증
B. screenshots: Compose form + 성공 토스트 + Dashboard draft + Audit 로그 + Undo 토스트 (5장)
C. Devpost form 마무리 + 1분 미만 BGM 없는 영상 + 제출

### 사용자 입력 / 실행 필요

D. **`reddit/devvit-docs#109` CLA 서명** — <https://docs.google.com/forms/d/e/1FAIpQLScG6Bf3yqS05yWV0pbh5Q60AsaXP2mw35_i7ZA19_7jWNJKsg/viewform> (Reddit OSS CLA, 한 번만)
E. **`npx devvit publish --public`** — D-9 (2026-05-18) 까지 시작 필요. probe 진단 + fix 가 그 전에 들어와야 가능.
F. 데모 영상 (Compose flow가 라이브 작동해야)
G. Devpost form 제출 (~2026-05-27 18:00 PT)

---

## §4 할 수 없는 것 (외부 변수)

- **OpenAI HTTP 400 의 진짜 원인** — probe 결과 시나리오 E (Devvit HTTP plugin transform) 면 우리 코드 영역 밖, Reddit fix 필요.
- **Reddit web UI 메뉴 클릭** — 자율 시뮬레이션 불가. probe 가 우회 경로지만 menu UI 자체의 검증은 사용자 1회 click 필요.
- **Reddit App Directory 리뷰** — `devvit publish` 후 ~1주, 통제 불가.
- **reddit/devvit-docs#109 머지** — Reddit team 리뷰 + CLA 사용자 서명 후 처리.
- **8080 포트 / 프로덕션 서버** — 별개 프로젝트, 절대 안 건드림.

---

## §5 추가로 필요한 것 (사용자 확인)

1. **OpenAI 키 추가 가능성** — production 키가 .env와 동일한데도 400 발생 시, OpenAI 측 organization / project / model availability 제한일 수도. OpenAI Platform 에서 키의 organization / project / available models 확인 가능 (사용자 OpenAI 계정 콘솔 접속 필요).
2. **`fix/openai-error-handling` 브랜치 정책** — probe 코드가 main에 들어가면 안 됨. 따라서 PR로 머지하지 말고, *fix PR 따로 / probe 제거 PR 따로* 가 권장. 다음 세션 시작 시 확인.
3. **claudedocs/ 커밋 정책** — 여전히 untracked. 핸드오프 6개 + gap-analysis + reddit-assets. 갤러리 repo 미러됨. 사용자 판단.
4. **Devvit Discord 가입 여부** — Reddit 의 Devvit Discord 가 있다면 우리 reproduction 더 직접적으로 reach out 가능. 사용자 확인 필요.

---

## §6 다음 세션 시작 프롬프트 (복사용)

```text
/handon

이전 세션 핸드오프: claudedocs/2026-05-13-openai-400-probe-session-handoff.md
관련: claudedocs/2026-05-13-platform-bug-session-handoff.md (Devvit plugin RPC 복구 + ENUM refactor), claudedocs/2026-05-13-install-debug-session-handoff.md (install/runtime 디버깅), claudedocs/gap-analysis/00-SUMMARY.md (갭 분석)

읽고 다음 결정에 답한 뒤 진행하세요. **이번 세션의 최우선 작업은 v0.0.31의 3-stage synthetic-compile-probe 결과 수집입니다.** `npx devvit logs r/SocialSeeding --since 10m` 으로 (a) GET /v1/models, (b) POST tiny, (c) full callOpenAI 의 status + body 를 확인하여 OpenAI HTTP 400 원인을 isolation 후 fix.

1. probe 결과 시나리오 A-E 중 어디에 해당하는지 확인 후 어떤 fix 가설부터 시도할까요?
2. probe 코드 정리 정책: fix PR 머지 후 별도 PR로 probe 제거 vs fix PR에 같이 묶기?
3. Module split (§3 P5) 지금 시도 vs Compose flow 풀린 후?
4. OpenAI 측 추가 진단 (organization / project / model availability 확인): 사용자 OpenAI 콘솔 점검 필요 여부?

D-day: 2026-05-27 18:00 PT (firm). publish 리뷰 ~1주 → ~D-9 (2026-05-18) 까지 `devvit publish --public` 시작 필요. 오늘 = 2026-05-13. 5일 남음.
```

---

## §7 핵심 자산 위치 reference

| 항목 | 경로 |
|---|---|
| 이 핸드오프 | `claudedocs/2026-05-13-openai-400-probe-session-handoff.md` |
| 직전 핸드오프 (plugin RPC + ENUM) | `claudedocs/2026-05-13-platform-bug-session-handoff.md` |
| 그 직전 핸드오프 (install debug) | `claudedocs/2026-05-13-install-debug-session-handoff.md` |
| 11-에이전트 갭 분석 | `claudedocs/gap-analysis/00-SUMMARY.md` (+ 01-11) |
| auto memory index | `~/.claude/projects/-Users-kimsejun-Documents-GitHub-vibe-mod/memory/MEMORY.md` |
| auto memory (platform bug) | `~/.claude/projects/.../memory/devvit-plugin-rpc-platform-bug.md` |
| 외부 진단 문서 (사용자 download) | `~/Downloads/devpost-zesty-pond.md` |
| Devvit 공식 docs (fork) | `~/Documents/GitHub/devvit-docs/` |
| Devvit core (fork) | `~/Documents/GitHub/devvit/` |
| Probe handler (현재 branch에 있음) | `src/server/index.ts` `app.post('/internal/scheduler/synthetic-compile-probe', ...)` |
| Probe scheduler 선언 | `devvit.json` `scheduler.tasks.synthetic-compile-probe` (cron `*/2 * * * *`) |
| OpenAI 호출 + body 로깅 | `src/server/index.ts` `callOpenAI(...)` + non-200 body capture |
| Test suite for resilience | `src/server/routes-compose.test.ts` (19 tests, 5 신규) |
| 우리 PR (모두 머지) | <https://github.com/Two-Weeks-Team/vibe-mod/pulls?q=is%3Apr+is%3Amerged> |
| reddit/devvit#261 (우리 issue) | <https://github.com/reddit/devvit/issues/261> |
| reddit/devvit-docs#109 (우리 PR) | <https://github.com/reddit/devvit-docs/pull/109> |
| App 콘솔 | <https://developers.reddit.com/apps/vibe-mod> |
| Demo sub | <https://reddit.com/r/SocialSeeding> |

---

## §8 알려진 issue / open question

- **OpenAI HTTP 400 (CRITICAL, 다음 세션 1순위)** — v0.0.31 의 3-stage probe 결과로 (a/b/c) 어느 fetch shape에서 실패하는지 isolation. 다음 cron tick (`*/2`) 결과부터 수집.
- **`fix/openai-error-handling` 브랜치 머지 정책** — probe 코드는 main 에 안 들어가야 함. 결과 수집 → fix PR → probe 제거 PR 순서.
- **Module split (handoff §3 P5)** — 큰 surface area refactor. Compose flow 풀린 후 권장.
- **reddit/devvit-docs#109 CLA** — 사용자가 CLA 서명해야 PR 리뷰 진행. <https://docs.google.com/forms/d/e/1FAIpQLScG6Bf3yqS05yWV0pbh5Q60AsaXP2mw35_i7ZA19_7jWNJKsg/viewform>
- **`reddit/devvit-docs#109` follow-up** — 리뷰 응답 모니터링. 변경 요청 들어오면 반영.
- **Probe self-disable** — v0.0.31 probe 는 첫 success OR 3회 fail 후 self-disable. 만약 갑자기 fix 되어도 다음 첫 tick 에서 자동 작동 — 좋음. 만약 3회 fail 까지 도달하면 redis key `${sub}:compile-probe:v2:state` 를 manual reset 필요 (다음 deploy 시 key 또 bump 가능: v3, v4, ...).
- **README screenshots** — Gate ②③ verify 후 (OpenAI fix 도착 시점). 5장 + 1분 영상.
- **`claudedocs/` 커밋 정책** — untracked. 사용자 판단.
- **Devpost 글** — placeholder (URL / 팀 username / 영상) 채우기 (Compose flow 라이브 작동 후).

---

## §9 사용자 명시 지시 (이번 세션 누적)

이번 세션에 사용자가 명시한 다음 작업 지시 (모두 반영 또는 진행 중):

1. **모든 결정은 공식문서/예제/베스트프랙티스 + 10-인 에이전트 회의 결과로** — 본 핸드오프 + 모든 PR description에 정량적 근거 + 명시적 출처 (reddit/devvit-docs, reddit/devvit-template-react, HotAndCold, devpost-zesty-pond.md) 인용.
2. **더 묻지 말고 완전 검증까지 진행** — 자율 가능 범위 최대로: probe scheduler 도입으로 메뉴 클릭 우회. 사용자 click 없이도 production OpenAI 호출 결과 수집 가능한 구조 완성.
3. **GCP CLI 포함 모든 시도 가능** — Reddit-side runtime fix가 들어왔으므로 GCP/Firebase 우회는 보류. probe 만으로 충분히 진단 가능.
4. **다양한 접근으로 근본 원인 단정** — 5 @devvit/web 버전 × 2 adapter × 2 scope × redis 선언 toggle × fresh install × 0.13.0-next preview = 모두 동일 plugin RPC 패턴 (이전 라운드). 이번 라운드는 OpenAI 400 의 3 가설 (auth / body-transit / payload-size) 분리 시도.
5. **devpost-zesty-pond.md 외부 진단 반영** — 적용 가능한 6 액션 모두 반영 (이미 완료된 항목 제외).
6. **모든 패키지 업그레이드 + 마이그레이션** — typescript 5.9→6, vite 7.3→8, eslint 9.39→10 + 마이그레이션 완료 (PR #30).
7. **OpenAI 키 hardcode 금지 / secret 값 노출 금지** — env-fallback 만 (`.env` 공식 패턴, Reddit 프로덕션은 process.env 없음), 키 값 절대 로깅 안 함 (typeof + length 만).

---

작성: 2026-05-13 21:46 KST / `/handoff` skill
