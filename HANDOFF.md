# vibe-mod — Session Handoff

> 이 파일은 다음 세션이 zero-context에서 즉시 작업을 이어갈 수 있도록 설계됨.
> 새 세션을 시작하면 `/handon`을 실행하거나 이 파일을 첫 read 대상으로.

---

## TL;DR (10초 brief)

- **무엇**: Reddit "Mod Tools and Migrated Apps Hackathon" — **Best New Mod Tool ($10K)** 트랙 출품작
- **컨셉**: 모더레이터가 자연어로 룰을 쓰면 OpenAI gpt-5.4-nano가 결정론 JSON으로 컴파일, 24h shadow + dry-run preview + 30-day rollback
- **마감**: **2026-05-27 18:00 PT (KST 5/28 10:00) — D-15**
- **현재 상태**: 코드 산출물·문서·테스트 plan 모두 implementation-ready (audit 18건 패치 적용 완료). **사용자 본인이 Devvit wizard 진행할 차례** (CLI에서 자동화 불가).
- **단일 진실의 원천**: `https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod-final-plan.html`

## Win 확률 (audit 통과 시)

| 상                             | 확률                                 |
| ------------------------------ | ------------------------------------ |
| Grand $10K (Best New Mod Tool) | **35~55%**                           |
| Honorable Mention $1K          | 50~65%                               |
| Moderator's Choice $10K        | 20~30% (사전 5+ 모드 sub install 시) |

---

## 🚨 다음 액션 — 즉시 해야 할 일 (Day 1 = 2026-05-12 화)

### Step 1. Devvit Mod Tool 템플릿 wizard (사용자 본인 수행, CLI 자동화 불가)

```bash
# 1) 브라우저에서:
#    https://developers.reddit.com/new
#    → "Other templates" → "Mod Tool" 선택 → wizard 따라가기
#    Reddit 계정 OAuth 로그인 + dev 등록 필요
#    → wizard 끝나면 터미널에 안내 표시 + Devvit 새 디렉토리 생성

# 2) 이 핸드오프 디렉토리(/Users/kimsejun/Documents/GitHub/vibe-mod/)에
#    있는 산출물을 wizard가 만든 디렉토리에 그대로 복사:
#    - devvit.json (덮어쓰기)
#    - package.json (덮어쓰기)
#    - tsconfig.json (덮어쓰기)
#    - vitest.config.ts (새로 추가)
#    - src/ 전체 (wizard 생성 src/ 위에 덮어쓰기)
#    - docs/ 전체 (새로 추가)

# 3) deps 설치 + 타입체크
npm install
npx tsc --noEmit
```

**또는** (대안 — 더 안전):

- 이 디렉토리(`~/Documents/GitHub/vibe-mod/`) 자체를 wizard의 `--directory` 옵션으로 지정해서 wizard가 빈 폴더에서 시작하는 대신 우리 산출물 위에서 working하도록.

### Step 2. OpenAI 키 발급 + 권한 확인

```bash
# 1) https://platform.openai.com/api-keys 에서 새 키 생성
# 2) 일일 spending limit 설정 ($5 권장 for hackathon)
# 3) gpt-5.4-nano 모델 권한 확인 (대부분 Tier 1+ 자동 부여)
# 4) Devvit secret으로 저장:
npx devvit settings set openaiApiKey
# 프롬프트에서 sk-… 키 붙여넣기
```

### Step 3. Day 1 EXIT GATE 검증

```bash
npm run dev
# → playtest sub 자동 생성됨
# → 해당 sub에 mod 권한으로 들어가서
# → 우측 ⋯ 메뉴에서 "vibe-mod: Compose rule" 보이는지 확인
# → 클릭 → 폼 열리는지 확인 (description에 "Compiles used today: 0 / 50")
```

**Gate 통과 시 Day 2 진행. 미통과 시:**

- `devvit logs` 확인
- 가장 흔한 fail: `permissions.http.domains`에 `api.openai.com` 누락 (devvit.json 확인)
- 두 번째 fail: Hono/Zod 미설치 (`npm install hono zod`)

---

## 🗓 17일 일정 요약 (D-15 ~ D-day)

| 날짜                 | 마일스톤                                                          | EXIT GATE                     |
| -------------------- | ----------------------------------------------------------------- | ----------------------------- |
| **05-12 화 (D-15)**  | **Day 1: setup + first menu shown** ← 오늘                        | Compose 메뉴 표시             |
| 05-13 수 (D-14)      | Day 2: OpenAI compile + first audit entry                         | shadow audit 작성됨           |
| 05-14 목 (D-13)      | Day 3: rollback + dry-run + log UI                                | undo round-trip 작동          |
| 05-15 금 (D-12)      | Day 4: hardening + acceptance script + ToS/Privacy 호스팅         | `npm run acceptance` 4/4 pass |
| 05-16~17 (D-11~10)   | Beta outreach 시작 (r/ModSupport + r/redditdev)                   | 8 mod commitments             |
| 05-18~21 (D-9~6)     | Phase A 베타 (본인 test sub, 5 mods 모드 권한)                    | 10 rules 작성, 일이슈 triage  |
| 05-22~23 (D-5~4)     | Phase B 베타 (모드 본인 sub) + `npx devvit publish --public` 신청 | publish review 진행           |
| 05-24 토 (D-3)       | Rehearsal record v0 take                                          | take 1 in the can             |
| 05-25 일 (D-2)       | ⚠️ **FEATURE FREEZE** + 3 rehearsal takes                         | UI 변경 0                     |
| 05-26 월 (D-1)       | Final record (3 takes minimum) + captions SRT                     | 데모 영상 YouTube 업로드      |
| **05-27 화 (D-day)** | Devpost 제출 (10:00 PT KST 28 02:00 목표, 8h buffer)              | 제출 완료                     |
| 05-27 18:00 PT       | **🔴 마감** (KST 28 10:00)                                        | —                             |

---

## 7 절대 hard lock (변경 불가)

1. **LLM은 build-time only** — 룰 평가 시 0 호출. Devvit 트리거에서 결정론 평가 only.
2. **Action whitelist 하드코딩** — `report/flair/lock/modqueue/remove`만 LLM-permitted. `ban/mute/permaban`은 mod의 명시적 checkbox 필요.
3. **Dry-run preview 강제** before Activate.
4. **Shadow mode default ON 24h** — 자동 promote는 `shadowDurationHours` 설정값 후.
5. **30-day rollback** — 1-click undo 항상 visible.
6. **LLM은 Reddit 콘텐츠 안 봄** — 모드의 자연어만 전송. compliance 핵심.
7. **v0.1은 영어만** — 다국어는 v0.2.

---

## 산출물 인벤토리 (`~/Documents/GitHub/vibe-mod/`)

```
.
├── HANDOFF.md           ← 이 파일
├── LICENSE              ← MIT
├── .gitignore
├── devvit.json          ← Devvit 설정 (permissions, settings, menu, forms, triggers, scheduler)
├── package.json         ← deps: @devvit/web@^0.12.22, hono@^4.12.18, zod@^4.4.3
├── tsconfig.json        ← strict + ES2024 + bundler resolution
├── vitest.config.ts     ← coverage thresholds (95%/95%/90% for security paths)
├── src/
│   ├── shared/
│   │   ├── rule-schema.ts       (160줄, Zod v4 strict)
│   │   ├── system-prompt.ts     (110줄, gpt-5.4-nano용)
│   │   └── starter-rules.ts     (110줄, 5 seed rules — SAFE actions, shadow:true, onAppInstall에서 draft로 seed)
│   └── server/
│       ├── devvit-helpers.ts     (32줄, @devvit/web SDK 어댑터: getCurrentSubreddit{Name,Ref}, asT1/asT3)
│       ├── evaluator.ts          (75줄, pure deterministic)
│       ├── fact-bag.ts           (180줄, sub-scoped Redis + safe defaults)
│       ├── executor.ts           (280줄, action whitelist + sub-scoped audit + rollback)
│       └── index.ts              (530줄, Hono routes + isCallerModerator guard, onAppInstall이 seedStarterRules() 호출)
├── scripts/
│   ├── acceptance.ts            ← `npm run acceptance` — G1~G4 exit gate (config↔code · devvit.json schema/cron · tsc · vitest). 4/4 pass
│   ├── devvit-doctor.ts         ← `npm run doctor` — 배포 전 프리플라이트 (devvit.json 정합성, fetch host↔permissions, route↔config 와이어링, node engine, login/app-id)
│   └── replay.ts                ← `npm run replay fixtures/x.json` — 이벤트/폼을 로컬 Hono app에 in-memory 더블로 발사, 응답+redis diff+발생한 Reddit 호출 출력 (playtest 불필요)
├── fixtures/
│   ├── post-submit.json         ← replay 예제: 트리거 이벤트
│   └── compose-rule-submit.json ← replay 예제: 폼 제출 (canned OpenAI 응답 포함)
├── test/
│   ├── devvit-testkit.ts        ← 재사용 가능한 Devvit 테스트 더블 (in-memory Redis, Reddit/Listing/settings/scheduler, fetch). 프로젝트 무관 — 다음 모드에 복사/패키지화 대상
│   ├── setup.ts                 ← vitest setup (얇은 프로젝트 레이어: testkit 인스턴스화 + vi.mock + beforeEach 리셋)
│   └── replay-runner.test.ts    ← replay.ts의 엔진 (REPLAY_FIXTURE 없으면 skip)
├── eslint.config.js · .prettierrc.json · .prettierignore · .nvmrc   ← lint/format/node 핀
├── .github/
│   ├── workflows/ci.yml         ← CI: install → lint(0 warn) → format:check → tsc → test(coverage) → acceptance
│   └── dependabot.yml           ← weekly; @devvit/* 그룹 1 PR
└── docs/
    ├── README-vibe-mod.md       ← 2-door split + Fetch Domains 섹션
    ├── new-mod-checklist.md     ← 다음 Devvit 모드 시작 시 복사할 인프라 목록 + SDK gotcha 목록
    ├── tos.md                   ← Terms of Service
    └── privacy.md               ← Privacy Policy

src/**/*.test.ts — 148 tests (vitest), 12 files:
  rule-schema · evaluator · executor · fact-bag · system-prompt · starter-rules
  + routes-compose / routes-dashboard / routes-undo / routes-triggers / routes-scheduler / routes-settings
  (routes-* = app.fetch() 호출 테스트 — 모든 Hono 라우트를 Devvit/OpenAI mock으로 실증)

npm scripts:  test · test:watch · test:coverage · typecheck · lint · lint:fix · format · format:check
              · check (typecheck+lint+format:check+test+acceptance) · acceptance · doctor · replay
              · dev · build · upload · publish · publish:public · logs
git hooks (simple-git-hooks): pre-commit → lint-staged ;  pre-push → typecheck + test
```

**세션 2 (2026-05-12) — dev 인프라/하네스 추가**:

- ✅ **재사용 하네스 추출** — `test/devvit-testkit.ts` (in-memory Redis + Devvit SDK 더블, 프로젝트 무관). `test/setup.ts`는 이제 얇은 레이어. 다음 모드에 그대로 복사 (또는 `@<org>/devvit-testkit`로 패키지화).
- ✅ **로컬 replay 하네스** — `npm run replay fixtures/x.json`: `devvit playtest`(실제 sub) 없이 트리거/폼 로직을 1초 내 반복 검증. `fixtures/`에 예제 2개.
- ✅ **`npm run doctor`** — 배포 전 프리플라이트 (hard: devvit.json 정합성·fetch host↔permissions·route↔config·node engine / soft: devvit login·`.devvit-app-id`).
- ✅ **lint/format** — ESLint 9 flat config (`@typescript-eslint` + `@vitest/eslint-plugin`, `vitest/no-focused-tests` 등) + Prettier. `npm run lint`은 0-warning strict. 전체 코드베이스 prettier 정규화 적용.
- ✅ **CI 확장** — install → **lint** → **format:check** → typecheck → **test:coverage** → acceptance. (`npm ci`는 esbuild per-platform optional deps EBADPLATFORM 때문에 `npm install` 사용.) `node-version-file: .nvmrc`.
- ✅ **Dependabot** — weekly, `@devvit/*` 한 PR로 그룹 (SDK drift 가시화), dev-deps 그룹, github-actions.
- ✅ **git hooks** — `simple-git-hooks` + `lint-staged`: pre-commit(lint-staged) / pre-push(typecheck+test). `npm install`이 `prepare`로 설치.
- ✅ acceptance G1에 devvit.json `$schema` + cron 5-field 체크 추가. `docs/new-mod-checklist.md` 신규.
- ✅ **버그 수정**: 미사용 변수 2건(`SAFE_ACTIONS` import, `catch (err)`) — ESLint가 잡음.

**아직 남음 (= 사용자 Devvit wizard 단계 + 이후)**:

- `npm run dev` 실기 playtest로만 검증되는 gate (Compose 메뉴 렌더, OpenAI compile 라운드트립, undo 라운드트립) — acceptance/doctor 출력의 MANUAL/soft 섹션 참조
- `.devvit-app-id` (wizard 생성) + `devvit build`로 SDK 정합화 최종 확인 (타입은 통과하나 실제 런타임 동작은 playtest 필요)
- ToS + Privacy HTML로 export 후 갤러리 repo에 push (Devpost 제출 폼 URL용)
- (선택) `Two-Weeks-Team/devvit-mod-template` — `docs/new-mod-checklist.md`의 인프라를 `gh repo create --template`용으로 분리. 인프라 파일은 vibe-mod에서 복사 가능하므로 급하진 않음.

---

## 🔒 18 audit 결함 — 코드에 모두 패치 적용됨

상세는 `<gallery>/vibe-mod-final-plan.html` §2. 요약:

| Severity | 개수 | 대표                                                                                        |
| -------- | ---- | ------------------------------------------------------------------------------------------- |
| CRITICAL | 2    | 회로차단기 zCard→zCount, 서버측 모드 인증                                                   |
| HIGH     | 5    | ReDoS, isModerator 하드코딩, Zod .strict() 누락, 트리거 idempotency, getUserByUsername 예외 |
| MEDIUM   | 11   | TOCTOU, prompt injection, 키 sub-scope, crypto random, audit fidelity, flair API, 등        |

각 결함의 verbatim 출처 + 패치 코드는 final-plan §2 매트릭스 참조.

---

## 핵심 외부 자료 (한 번에 다시 잡을 수 있는 링크)

### 갤러리 repo (모든 보고서·산출물 호스팅)

- 🌐 **메인**: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/
- 🏁 **최종 계획 v3**: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod-final-plan.html
- 🔬 Feasibility: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/feasibility-validation.html
- 📦 GitHub: https://github.com/Two-Weeks-Team/reddit-mod-tools-port-gallery

### 해커톤 공식

- 🏆 Devpost: https://mod-tools-migration.devpost.com/
- 📜 Rules: https://mod-tools-migration.devpost.com/rules
- 💬 Discord: https://discord.com/invite/R7yu2wh9Qz
- 🦊 r/Devvit: https://www.reddit.com/r/Devvit/

### Devvit 공식

- 📖 Quickstart (Mod Tool): https://developers.reddit.com/docs/quickstart/quickstart-mod-tool
- 🌐 HTTP Fetch Policy: https://developers.reddit.com/docs/capabilities/server/http-fetch-policy
- 🔧 Triggers: https://developers.reddit.com/docs/capabilities/server/triggers
- 💾 Redis: https://developers.reddit.com/docs/capabilities/server/redis
- ⏰ Scheduler: https://developers.reddit.com/docs/capabilities/server/scheduler
- 🔑 Settings & Secrets: https://developers.reddit.com/docs/capabilities/server/settings-and-secrets
- 📡 Reddit API: https://developers.reddit.com/docs/capabilities/server/reddit-api

### OpenAI

- 📊 Models: https://developers.openai.com/api/docs/models
- 💰 Pricing: https://developers.openai.com/api/docs/pricing
- 🎯 Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs

---

## 💵 비용 추정 (gpt-5.4-nano)

| 단위                                            | 비용         |
| ----------------------------------------------- | ------------ |
| 1 compile (~800 in + 400 out tokens)            | $0.00066     |
| 1 sub × 50 compiles/day × 30일                  | ~$0.99/month |
| 1,000 subs/month (full quota 사용 가정)         | ~$990/month  |
| 1,000 subs/month (실제 평균 5 compiles/sub/day) | ~$99/month   |

**BYOK 옵션**: `subredditOpenaiApiKey` (subreddit-scope) 설정 시 50/day 쿼터 우회. 모드가 본인 키 부담.

---

## ⚠️ 절대 잊으면 안 되는 것

1. **`api.openai.com`은 Devvit 글로벌 허용 도메인이지만, devvit.json에 명시 필수** — global allowlist에 있어도 앱별 declare가 필요 (확인됨, 코드에 반영됨)
2. **데모 비디오는 BGM 없음** — 다른 entries는 synthwave/lofi 깔 것. 정적 + voiceover로 차별화.
3. **200-member 미만 sub** — 심사용 데모 sub은 invite-only로 관리. 200 초과 시 실격.
4. **`npx devvit publish --public`**은 review ~1주 — 늦지 않게 신청 (Day 11 권장). 미통과 시 unlisted install 링크로 fallback.
5. **ToS + Privacy URL** — 갤러리 repo에 호스팅된 HTML을 Devpost 제출 폼에 입력. 갤러리에 이미 push됨: `/vibe-mod/tos.html`, `/vibe-mod/privacy.html`.
6. **5 starter rules 작성** — onAppInstall 트리거에서 seed. 현재 빈 배열. Day 4까지 작성 필요.

---

## 미해결 사항 (Open Questions)

1. **GitHub repo 생성?** — 현재 `~/Documents/GitHub/vibe-mod/`는 git init만. `gh repo create Two-Weeks-Team/vibe-mod --public` 권장 (MIT signal + Moderator's Choice impact 평가위원이 코드 볼 수 있음). 결정 필요.
2. **Beta 모드 모집 시작 시점** — Day 5 (5/16 금)? 응답률 30-40%면 8 commitments 위해 ~20 outreach 필요.
3. **`reddit.Filter()` 채택** — 0.12.21 신규. v0.1.1에서 `modqueue` 액션을 이걸로 치환할지.
4. **App publish 시점** — `npx devvit publish --public` 신청 timing 미확정.

---

## 새 세션 시작 시 첫 명령

```bash
cd /Users/kimsejun/Documents/GitHub/vibe-mod
cat HANDOFF.md | head -80
# → 이 파일을 읽고 Step 1 (developers.reddit.com/new wizard) 진행

# 또는 갤러리에서 최종 계획 다시 보기:
open https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod-final-plan.html
```

---

작성: 2026-05-12 KST
마지막 코드 변경: 2026-05-11 (OpenAI gpt-5.4-nano, Devvit 0.12.22, Zod 4.4.3 lock)
