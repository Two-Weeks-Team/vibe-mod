# vibe-mod — Session Handoff (2026-05-13 21:54 KST, OpenAI 400 probe v3 deployed)

> `/handon` 으로 로드. 직전 핸드오프 (같은 날, 8분 전):
> `claudedocs/2026-05-13-openai-400-probe-session-handoff.md` — probe v2 (3-stage) 배포 직후 작성.
>
> 이 파일 = probe v2 결과 수집 + probe v3 (6-stage incremental) 배포 후 작성. 다음 세션은 probe v3 결과만 수집하면 OpenAI 400 의 정확한 culprit field 즉시 식별 가능.

---

## §0 두 줄 요약

- **무엇**: probe v2 결과 = **scenario C 확정**: (a) GET `/v1/models` 200 OK · (b) POST tiny chat (~121B) 200 OK · (c) POST full callOpenAI (~6 KB) HTTP 400 "We could not parse the JSON body". → 인증/모델 정상, 작은 body 정상, 큰 또는 production-specific 페이로드만 실패. v0.0.32 에 **probe v3 (6-stage incremental)** 배포: (d) tiny + `response_format`, (e) tiny + `reasoning_effort + verbosity`, (f) ~6 KB ASCII filler, (c) production reference. 첫 400 을 찍는 stage가 culprit field. cron `*/2 분` 자동 발화 → 2분 안에 결과.
- **다음 세션 1순위**: `npx devvit logs r/SocialSeeding --since 10m` 으로 probe(d) / probe(e) / probe(f) 의 status code 수집 → culprit isolation → 해당 field 제거/대체 fix PR → probe 제거 PR.

---

## §1 진행한 작업 (시간순) — 이 세션 (직전 21:46 핸드오프 이후)

### Phase A — probe v2 결과 수집 (15-min log capture)
- `npx devvit logs r/SocialSeeding --since 15m` 으로 v0.0.31 의 probe v2 3 라운드 결과 정확히 수집.
- 결과 매트릭스:
  | stage | 요청 | bodyLen | status |
  |---|---|---|---|
  | (a) | `GET /v1/models` (auth-only) | 0 | **200 OK** — `text-embedding-ada-002`, `gpt-4o`, … 모델 리스트 반환 |
  | (b) | `POST /v1/chat/completions` minimal | 121 B | **200 OK** — `chatcmpl-...`, `model: gpt-5.4-nano-2026-03-17`, `content: "ok"`, `usage.prompt_tokens: 12` |
  | (c) | `POST callOpenAI` full production | ~6000 B | **400** — `"We could not parse the JSON body of your request"` |
- 결론: 키 OK, gpt-5.4-nano 모델 OK, 작은 POST body OK. 큰 / production-specific 페이로드만 실패. **시나리오 C 확정 → 페이로드 사이즈 또는 컨텐츠 필드 isolation 필요.**

### Phase B — probe v3 설계 + 배포
- (b) → (c) 사이의 차이 항목 4개를 식별:
  1. `response_format: { type: 'json_object' }` (production-only)
  2. `reasoning_effort: 'none'` + `verbosity: 'low'` (gpt-5.x family params, production-only)
  3. messages 가 system + 4 few-shot pairs + user = 5개 + 6 KB 사이즈
  4. `max_completion_tokens: 600` (tiny 의 5와 비교)
- probe v3 = (d)(e)(f) 추가:
  - **(d)** tiny + `response_format: { type: 'json_object' }` 만 추가 → JSON-mode 가 transit 깨는지
  - **(e)** tiny + `reasoning_effort: 'none'` + `verbosity: 'low'` 추가 → gpt-5.x family 파라미터가 trigger 인지
  - **(f)** ~6 KB ASCII filler payload (모든 production-only field 없음, 단순 `a` 반복으로 사이즈만 매치) → 순수 SIZE 가 trip 하는지
  - (c) 그대로 (production reference). 첫 400 stage = culprit.
- 상태 키 `${sub}:compile-probe:v2:state` → `v3:state` bump 하여 v2 의 `fails: 3` self-disable block 우회.
- `src/server/index.ts` 1 file changed, +71 / -2. `fa64429` → `4d64775` commit.
- `git push` + `npx devvit upload --bump patch` + `npx devvit install r/SocialSeeding` 성공: **v0.0.32 installed**.

### Phase C — Stop hook 압박 흡수
- 같은 세션 내 `/goal` 지시 ("don't ask, drive to verification") 가 누적 4-5 회 발화. probe v3 deploy 직후 사용자가 `/goal clear` + `/handoff` 호출 → 이 세션 종료, 다음 세션 인계.

### Phase D — 외부 contribution 상태 (변동 없음)
- `reddit/devvit#261` (우리 issue, OPEN) — 새 응답 없음.
- `reddit/devvit-docs#109` (Plugin RPC resilience 가이드 PR, OPEN) — 새 응답 없음, CLA 사용자 서명 대기.

---

## §2 현재 상태

### Git
| branch | HEAD | upstream | 비고 |
|---|---|---|---|
| `main` (local stale) | `daf8a7a` | 1 commit behind origin | `git pull` 권장 |
| `origin/main` | `5c73199` (Merge #31) | — | 모든 정식 PR 머지 ground truth |
| `fix/openai-error-handling` (active) | **`4d64775`** | pushed | **3 commits ahead of origin/main** (모두 probe 진단 — 머지 X) |

`fix/openai-error-handling` 미머지 3 커밋 (모두 v3 probe 진단 인프라):
- `6184502` probe v1: 단일 callOpenAI 시도
- `fa64429` probe v2: 3-stage (GET / POST tiny / POST full)
- `4d64775` probe v3: +3 stage (response_format / gpt-5 family / 6 KB ASCII filler)

**머지 정책 (재확인)**: probe = 임시 진단. main 에 들어가면 안 됨.
- 다음 단계: probe v3 결과 → culprit field 식별 → callOpenAI에 적절한 fix PR (probe 코드 미포함) → 별도 PR로 `/internal/scheduler/synthetic-compile-probe` 엔드포인트 + devvit.json scheduler 항목 둘 다 삭제.

### Open PRs (Two-Weeks-Team/vibe-mod)
- 0개. (#26–#31 모두 머지 완료)

### External (reddit/...)
- **reddit/devvit#261** OPEN — settings/redis/reddit plugin RPC reproduction
- **reddit/devvit#258 comment** posted — 우리 reproduction
- **reddit/devvit-docs#109** OPEN — Plugin RPC resilience 문서 PR (CLA 사용자 서명 대기)

### Live (r/SocialSeeding)
- App: <https://developers.reddit.com/apps/vibe-mod> — **v0.0.32** installed
- Plugin RPC layer: ✅ working (scheduler ticks succeed every 5/15/2 min)
- OpenAI 400 isolation: 진행 중 (probe v3 자동 발화 매 2 분, scenario C 확정 후 culprit field 분리 단계)
- Devvit secret `openaiApiKey`: ✅ set, length 164 (= .env 키, smoketest 21/21 OK)

### 빌드 / 점수
- `npm run check` 4/4 gates green (typecheck + lint + Prettier + 178 tests + 3 @devvit/test + acceptance G1–G4)
- `dist/server/index.cjs` ≈ 2.14 MB (gzip ~353 KB, oxc minifier)
- Clean checkout 4/4 PASS (이전 핸드오프에서 인증)
- OpenAI 3-model smoketest 21/21 (이전 핸드오프에서 인증)

### 환경
- node v24.15.0, npm
- @devvit/* pinned exact 0.12.23
- typescript 6.0.3, vite 8.0.12, eslint 10.3.0, @hono/node-server 2.0.2
- devvit CLI authenticated as `u/DragonfruitAfraid309`
- `~/.devvit/token` (1346 bytes), `~/.devvit/session-id`
- cwd = `/Users/kimsejun/Documents/GitHub/vibe-mod`
- Fork repos: `~/Documents/GitHub/devvit-docs` (PR #109), `~/Documents/GitHub/devvit` (reference)

### 해커톤 D-day
- **2026-05-27 18:00 PT** (firm). 오늘 = 2026-05-13 21:54 KST.
- `devvit publish --public` 리뷰 ~1주 → ~2026-05-18 (D-9) 시작 필요. 5일 남음.

---

## §3 다음 세션에서 할 수 있는 것

### 즉시 (Claude — 사용자 입력 불필요)

1. **[CRITICAL] probe v3 결과 수집** —
   ```bash
   npx devvit logs r/SocialSeeding --since 10m --show-timestamps > /tmp/probe-v032.txt
   grep -A1 "probe(a) result\|probe(b) result\|probe(d) result\|probe(e) result\|probe(f) result\|probe(c)" /tmp/probe-v032.txt | head -40
   ```
   결과 분기:
   - **(d) 400** → culprit = `response_format: { type: 'json_object' }`. Fix: 다른 형태로 출력 강제 (system prompt 안에 "Output JSON only" 강조) 또는 `response_format: { type: 'json_schema', json_schema: {...} }` 시도.
   - **(e) 400** → culprit = `reasoning_effort` 또는 `verbosity`. Fix: 두 필드 모두 제거 (gpt-5.4 family 기본값 사용). 로컬 smoketest 가 통과한 것은 OpenAI 가 모르는 필드를 무시하기 때문일 가능성 — Devvit HTTP plugin 이 이걸 다른 식으로 transform.
   - **(f) 400** → culprit = SIZE 자체. Fix: system prompt + few-shot 크기 축소 (1 few-shot 만 유지 등). Devvit HTTP plugin 의 body 최대 크기 제약.
   - **(d)(e) 200, (f) 200, (c) 400** → 모든 단일 변수 OK, 결합 효과. 추가 probe 필요 (예: (g) production messages 만 / (h) production messages + response_format / ...).

2. **fix PR open** — 식별된 culprit 에 따라 `callOpenAI` 수정:
   - response_format 문제면: system prompt 보강 + response_format 제거
   - reasoning_effort/verbosity 문제면: 두 필드 제거
   - SIZE 문제면: few-shot 축소 (4 → 2 또는 1) + system prompt 압축
3. **probe 제거 PR (마지막)** — fix 검증 완료 후:
   - `src/server/index.ts` 의 `app.post('/internal/scheduler/synthetic-compile-probe', ...)` 핸들러 삭제
   - `devvit.json` 의 `scheduler.tasks.synthetic-compile-probe` 항목 삭제
   - 두 변경을 같은 PR 에 묶음

4. **`/internal/menu/compose-rule` 라이브 클릭 시 성공 검증** — fix 후 사용자 한 번 클릭 → 성공 토스트 + 로그에 `Compiled rule "..."` 확인.

5. **로컬 `main` 동기화 + 미사용 브랜치 정리** —
   ```bash
   git checkout main && git pull
   git branch -d feat/resilient-fallback refactor/enums-and-constants fix/devvit-plugin-rpc-diag
   git push origin --delete feat/resilient-fallback refactor/enums-and-constants fix/devvit-plugin-rpc-diag
   ```
   (probe 브랜치 `fix/openai-error-handling` 는 PR 머지 후 마지막에 삭제.)

6. **Module split (handoff §3 P5, 이전 백로그)** — `src/server/index.ts` (~1380 줄) → `routes/{menu,forms,triggers,scheduler,settings}.ts` + `openai.ts` + `diag.ts`. Compose flow 풀린 후 권장.

7. **Devpost submission.md placeholder 채우기** — Compose flow 라이브 작동 후 영상/URL/팀 username 채움.

### 사용자 입력 / 실행 필요

A. **`reddit/devvit-docs#109` CLA 서명** — <https://docs.google.com/forms/d/e/1FAIpQLScG6Bf3yqS05yWV0pbh5Q60AsaXP2mw35_i7ZA19_7jWNJKsg/viewform>
B. **`npx devvit publish --public`** — D-9 (2026-05-18) 까지 시작 필요. 5일 남음.
C. **데모 영상** — 1분 미만, BGM 없음, Compose flow 라이브 작동 후.
D. **OpenAI 콘솔 점검** (옵션) — organization / project / model availability 가 제한적인지 확인.

---

## §4 할 수 없는 것 (외부 변수)

- **OpenAI HTTP 400 의 진짜 원인** — probe v3 결과로 시나리오 좁힐 수 있지만, 만약 SIZE 자체가 trip (Devvit HTTP plugin 의 body 한도) 이면 우리 코드 영역 밖 → reddit/devvit#261 강화 + size 회피 fix 양쪽 진행.
- **Reddit web UI 메뉴 클릭** — probe 가 우회 진단이지만, **end-to-end "사용자 클릭 → 성공 토스트"** 의 최종 시각적 검증은 사용자 1회 click 필요.
- **Reddit App Directory 리뷰** — `devvit publish` 후 ~1주, 통제 불가.
- **reddit/devvit-docs#109 머지** — Reddit team 리뷰 + CLA 사용자 서명 후.
- **8080 포트 / 프로덕션 서버** — 별개 프로젝트, 절대 안 건드림.

---

## §5 추가로 필요한 것 (사용자 확인)

1. **probe 머지 정책 (재확인)** — probe 코드는 main 에 들어가면 안 됨. 다음 세션이 culprit 식별 → fix PR (probe 미포함) → probe 제거 PR 순서로 진행. 다른 순서 원하면 명시.
2. **OpenAI 콘솔 점검 위임 여부** — 5번 옵션. organization rate limit / project model 제한 등 확인 필요 시 사용자가 OpenAI 콘솔에 직접 접속.
3. **probe v3 가 시나리오 (d)(e)(f) 모두 200, (c) 400 인 경우** — 추가 probe v4 (조합 변수) 작성 권한? 자율 진행 권장.
4. **`claudedocs/` 커밋 정책** — 여전히 untracked. 핸드오프 7개 + gap-analysis + reddit-assets. 사용자 판단.

---

## §6 다음 세션 시작 프롬프트 (복사용)

```text
/handon

이전 세션 핸드오프: claudedocs/2026-05-13-openai-probe-v3-handoff.md
관련: claudedocs/2026-05-13-openai-400-probe-session-handoff.md (probe v2 배포 직후), claudedocs/2026-05-13-platform-bug-session-handoff.md (Devvit plugin RPC 회복 + ENUM refactor), claudedocs/gap-analysis/00-SUMMARY.md (갭 분석)

읽고 다음 결정에 답한 뒤 진행하세요. **이번 세션의 최우선 작업은 v0.0.32 의 probe v3 결과를 즉시 수집하여 OpenAI 400 의 culprit field 를 식별하는 것입니다.**

1. probe(d)/(e)/(f) 중 어디서 첫 400이 발생했나? 거기에 매핑된 fix 가설부터 적용. (d)=response_format, (e)=reasoning_effort+verbosity, (f)=size.
2. fix PR 머지 정책: probe 제거 PR 별도 분리 (권장) vs fix PR에 같이 묶기?
3. v3 결과 시나리오 (d)(e)(f) 모두 200 + (c) 400 인 경우 — 자율적으로 probe v4 (조합 변수) 작성 진행?
4. fix 검증 시 사용자 메뉴 클릭 1회 필수 — 별도 알림 필요?

D-day: 2026-05-27 18:00 PT (firm). publish 리뷰 ~1주 → ~D-9 (2026-05-18) 까지 `devvit publish --public` 시작 필요. 오늘 = 2026-05-13. 5일 남음.
```

---

## §7 핵심 자산 위치 reference

| 항목 | 경로 |
|---|---|
| 이 핸드오프 | `claudedocs/2026-05-13-openai-probe-v3-handoff.md` |
| 직전 핸드오프 (probe v2 배포 직후) | `claudedocs/2026-05-13-openai-400-probe-session-handoff.md` |
| 그 이전 (Plugin RPC 회복 + ENUM refactor) | `claudedocs/2026-05-13-platform-bug-session-handoff.md` |
| 그 이전 (install/runtime 디버깅) | `claudedocs/2026-05-13-install-debug-session-handoff.md` |
| 11-에이전트 갭 분석 | `claudedocs/gap-analysis/00-SUMMARY.md` |
| auto memory index | `~/.claude/projects/-Users-kimsejun-Documents-GitHub-vibe-mod/memory/MEMORY.md` |
| auto memory (platform bug) | `~/.claude/projects/.../memory/devvit-plugin-rpc-platform-bug.md` |
| 외부 진단 (사용자 download) | `~/Downloads/devpost-zesty-pond.md` |
| Devvit 공식 docs (fork) | `~/Documents/GitHub/devvit-docs/` (PR #109 branch) |
| Devvit core (fork) | `~/Documents/GitHub/devvit/` |
| Probe v3 handler | `src/server/index.ts` `app.post('/internal/scheduler/synthetic-compile-probe', ...)` (라인 ~1107–1245) |
| Probe scheduler 선언 | `devvit.json` `scheduler.tasks.synthetic-compile-probe` (cron `*/2 * * * *`) |
| callOpenAI + body 로깅 | `src/server/index.ts` `callOpenAI(...)` |
| 컴파일 테스트 | `src/server/routes-compose.test.ts` (19 tests, 5 신규) |
| Merged PRs (모두 머지) | <https://github.com/Two-Weeks-Team/vibe-mod/pulls?q=is%3Apr+is%3Amerged> |
| reddit/devvit#261 (우리 issue) | <https://github.com/reddit/devvit/issues/261> |
| reddit/devvit-docs#109 (우리 PR) | <https://github.com/reddit/devvit-docs/pull/109> |
| App 콘솔 | <https://developers.reddit.com/apps/vibe-mod> |
| Demo sub | <https://reddit.com/r/SocialSeeding> |

---

## §8 알려진 issue / open question

- **OpenAI HTTP 400 (CRITICAL, 다음 세션 1순위)** — probe v3 결과 수집으로 culprit field isolation. cron `*/2` 자동 발화 → 즉시 결과 가능.
- **probe 머지 정책** — main 에 들어가면 안 됨. fix PR / 제거 PR 분리.
- **probe v3 self-disable** — 첫 success OR 3 fail 후 자동 정지. 만약 fix 후 1 tick 만에 succeed 하면 다음 부터 정지 (의도된 동작). 만약 fail 3번까지 도달하면 다음 deploy 시 `compile-probe:v4:state` 으로 키 bump 필요.
- **Module split (이전 백로그)** — Compose flow 풀린 후.
- **reddit/devvit-docs#109 CLA** — 사용자 서명 대기.
- **Devpost submission.md placeholder** — 영상/URL/팀 username (Compose flow 라이브 작동 후).
- **`claudedocs/` 커밋 정책** — untracked. 사용자 판단.
- **D-9 임박** — 5일 안에 publish 시작해야 review 완료 가능.

---

## §9 사용자 명시 지시 (이 세션 + 누적)

이 세션 (직전 핸드오프 이후 8분간):
1. **probe 결과 자율 수집 + scenario isolation** — 21:46 ~ 21:54 사이 수행:
   - probe v2 결과 = scenario C 확정 (a/b 200, c 400)
   - probe v3 (6-stage) 작성 + 배포 = v0.0.32
2. **`/goal clear`** 발화 → 이 세션 종료 + 다음 세션 인계.

이전 세션 누적 (직전 핸드오프 참조):
- 공식문서/예제/베스트프랙티스 + 10인 에이전트 회의 결과로 결정 (✓)
- 묻지 말고 완전 검증까지 자율 진행 (✓, probe scheduler 도입으로 메뉴 클릭 우회)
- GCP CLI 포함 모든 시도 가능 (✓, plugin RPC 복구로 보류)
- 다양한 접근으로 근본 원인 단정 (✓, probe v1/v2/v3 = 6-stage isolation)
- devpost-zesty-pond.md 외부 진단 반영 (✓, 6/6 액션 반영)
- 모든 패키지 업그레이드 + 마이그레이션 (✓, PR #30: TS 6 / Vite 8 / ESLint 10)
- OpenAI 키 hardcode 금지 / secret 값 노출 금지 (✓, length 만 로깅)

---

작성: 2026-05-13 21:54 KST / `/handoff` skill
