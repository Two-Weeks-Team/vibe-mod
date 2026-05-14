# vibe-mod — Session Handoff (2026-05-12)

> `/handon` 으로 로드. 프로젝트 전반 계획은 레포 루트의 `HANDOFF.md`, 이 파일은 *이 세션* 요약 + 다음 액션.

## §0 두 줄 요약

- **무엇**: Reddit "Mod Tools and Migrated Apps Hackathon — Best New Mod Tool ($10K)" 출품작 `vibe-mod`(모더레이터가 자연어로 룰 작성 → OpenAI gpt-5.4-mini가 결정론 JSON으로 컴파일, shadow/dry-run/rollback). 이 세션에서 테스트·SDK 정합화·OpenAI 검증·dev 툴링·전체 Devvit 문서 정독·dry-run 구현·아이콘·PBT·`@devvit/test` 채택·해커톤 감사까지 완료. 코드/검증은 다 됐고, 남은 건 **사람이 해야 하는 Devvit wizard → `devvit upload` → `devvit publish`(리뷰 ~1주) → playtest 검증 → Devpost 제출**.
- **다음 세션 1순위**: (a) 사용자가 wizard를 했으면 `npm run build`/`devvit logs` 막힌 지점 디버깅; (b) 안 했으면 — 루트 `README.md` + Devpost 7섹션 설명 템플릿을 (wizard 없이) 작성. 둘 중 사용자 상태에 따라.

## §1 진행한 작업 (시간순) — PR #1~#16, 전부 main에 merge (squash 아님)

| Phase | PR | 내용 |
|---|---|---|
| A. 테스트·acceptance·starter rules | #1, #2 | vitest 하네스(`test/devvit-testkit.ts` in-memory Redis + Devvit 더블) + 6 unit + 6 route 호출 테스트; `scripts/acceptance.ts` G1~G4; 5 starter rules + `onAppInstall` seed; `devvit.json` orphaned `activateRuleForm` 제거 |
| B. dev 인프라 | #2, #3, #4, #5(closed) | ESLint 9 flat + Prettier + simple-git-hooks(pre-commit lint-staged / pre-push typecheck+test) + CI(lint→format→tsc→test:coverage→acceptance) + Dependabot(@devvit 그룹); `npm run replay`(이벤트 로컬 replay, fixtures/) + `npm run doctor`(배포 전 프리플라이트); `docs/new-mod-checklist.md`; dependabot actions v6 bump 머지(#3,#4), eslint v10 bump 비호환으로 close(#5) |
| C. 외부 리뷰 반영 | #6 | gemini/coderabbit/codex 피드백: `r_shouting_title` body→title ratio 버그 → 새 fact `content.title.upperCaseRatio`; testkit `zAdd` 중복 멤버/`zRange` reverse 수정; doctor semver; setup `beforeEach` mock-leak; replay `redisHashes/Zsets` |
| D. OpenAI 실API 검증 + 모델/추론 튜닝 | #7, #8, #9, #10, #11, #12 | `npm run openai:smoketest`(실 OpenAI API, 7/7); **프로덕션 버그 수정**: `max_tokens`→`max_completion_tokens`, `temperature` 제거(gpt-5.x); `reasoning_effort:'none'` + `verbosity:'low'`; 모델 비교(gpt-5.4-mini 가장 빠름~1.2s/7-7 ← 기본, nano~1.5s, 풀 5.4~2.1s 비추천, gpt-5-mini 토큰 truncation, gpt-5-nano/gpt-4.1-* 403); `.env.example`; HANDOFF.md 갱신 |
| E. Devvit Web 문서 정합화 | #13 | Playwright로 비-게임 Devvit 문서 58페이지 크롤 → `docs/devvit-reference.md`(440KB) + `docs/devvit-conformance-notes.md`. **`devvit build`가 실패했을 버그 수정**: `devvit.json`에 필수 `server` 블록 없음 + CJS 서버 번들 빌드 없음 → `vite.config.ts`(SSR→`dist/server/index.cjs`, CJS, minify) + `devvit.json` `server`/`scripts`/`dev` + `vite` devDep + `npm run build`=`tsc --noEmit && vite build`. deps: `@devvit/web` 하나만(@devvit/reddit/redis 제거), `import {redis}`→`@devvit/web/server`, `TaskRequest/Response`, CLI `@devvit/cli`→`devvit`. `context.subredditName/Id` 사용(API 호출 0), `devvit-helpers` 동기화. CI에 build+bundle-load 단계 추가 |
| F. dry-run 구현 | #14 | `/internal/scheduler/dry-run-replay` (v0.1 스텁이었음): 최근 ≤10 포스트를 draft 룰로 replay(액션 0) → `${sub}:dryrun:${ruleId}` 요약 → Dashboard "Dry-run preview" 섹션 표시. +6 scheduler tests + 1 dashboard test |
| G. 아이콘 + PBT | #15 | `assets/icon.png` 1024×1024(`scripts/build-icon.ts` 자체 PNG 인코더, 네이티브 dep 0) + `devvit.json` `marketingAssets.icon`; fast-check property tests(rule-schema: parse 멱등·strict·closed fact/action·depth; evaluator: total·empty all/any=false·singleton=identity·not 대합·all/any=∧/∨·numeric op 일관성) |
| H. `@devvit/test` 채택 | #16 | `@devvit/test` devDep + `vitest.devvit.config.ts` + `npm run test:devvit`(CI 포함) + `src/server/executor.devvit.test.ts`(공식 하네스, 진짜 in-memory Redis 트랜잭션, 3 tests). 기존 13개 파일 전면 마이그레이션은 churn 대비 이득 적어 안 함(문서화: `docs/devvit-conformance-notes.md`) |
| I. 해커톤 감사 | (skill) | `hackathon-audit` 실행 → `claudedocs/hackathon-audit-20260512-reddit-mod-tools.html`. 판정: PARTIAL — 엔지니어링 완료, 배포+제출 자산 미완 |

## §2 현재 상태

**git**: branch `main`, working tree clean (단 `claudedocs/`는 untracked — 분석 산출물, 커밋 안 함). 최신 commit `1444c93` (Merge PR #16). PR #1~#16 전부 merge, open PR 0. Repo: `https://github.com/Two-Weeks-Team/vibe-mod` (public, MIT).

**Live URLs**: 없음 — Devvit 호스팅이고 앱이 아직 `devvit upload` 안 됨. 갤러리: `https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod-final-plan.html`.

**메트릭**: 168 main tests + 3 `@devvit/test` tests (1 skipped = replay-runner) | `tsc --noEmit` clean | ESLint 0-warning | Prettier clean | `npm run acceptance` 4/4 (G1~G4) | `npm run doctor` 0 hard issues, 2 warnings (devvit login 안 됨, `.devvit-app-id` 없음) | `npx vite build` → `dist/server/index.cjs` ~2.1MB, `require()` 가능 | CI green (install→lint→format:check→tsc→test:coverage→test:devvit→acceptance→vite build→bundle loads). | `npm run openai:smoketest` 마지막 실행 7/7 (gpt-5.4-mini, ~$0.0001/compile).

**환경**: node v24.15.0 / npm 11.12.1 / `@devvit/cli` 0.12.23. (CI는 `.nvmrc` = 22.) `.env`는 사용자가 OpenAI 키 넣음(billing 활성 상태). `.devvit-app-id` 없음(wizard 생성).

**오늘**: 2026-05-12. 해커톤 마감: **2026-05-27 18:00 PDT — D-15** (firm, grace 없음).

## §3 다음 세션에서 할 수 있는 것

**즉시 가능 (Claude, wizard 불필요):**
- 루트 `README.md` 작성 — 태그라인 + CI 배지 + "무엇을 하는가" + 아키텍처 한 단락 + Fetch-Domains 섹션 + 스크린샷 자리 + 갤러리 final-plan 링크. (현재 `docs/README-vibe-mod.md`만 있음 — 레포 front page 없음.)
- Devpost 7섹션 설명 템플릿 — Inspiration / What it does / How built / Challenges / Accomplishments / Learned / What's next + Project-Impact(3 커뮤니티 후보) + Built-With 태그 + 앱 링크 자리. `docs/devpost-submission.md`로.
- (선택, 평가 보고서 권고) **fact 레이어 확장** — `content.title.upperCaseRatio` 외에 repost 감지·cross-sub 도배·`content.isEdited`·계정 유사도·언어 감지 등 fact 추가 (rule-schema FactPaths + fact-bag + system-prompt 자동). AutoMod 대비 ceiling 올리는 v0.2 방향. 큰 작업이라 별도 PR.
- (선택) 기존 route 테스트를 `@devvit/test`로 마이그레이션 — churn 큼, 평행 vitest project 필요. 권장 안 함 (새 모드는 처음부터 `@devvit/test`).

**사용자 입력/행동 필요:**
- Devvit "Mod Tool" wizard (`developers.reddit.com/new`) → vibe-mod 산출물 overlay (레포 HANDOFF.md Step 1; `vite.config.ts`도 overlay, `src/client/` 지우지 말 것) → `.devvit-app-id` 생성
- `npm run build` (`tsc --noEmit && vite build`) → `npm run doctor` → `devvit upload` → 앱 링크 확보
- `devvit settings set openaiApiKey` (배포용 키 — `devvit upload` 후에만 가능) → `devvit settings list`
- `npm run dev` (playtest) → 3 MANUAL 게이트: Compose 메뉴 렌더 → 폼 → OpenAI compile 라운드트립 → undo. 막히면 `devvit logs` + 에러 가져오기 (다음 세션이 디버깅)
- `devvit publish --public` — ~D-9(2026-05-18)까지 시작 (리뷰 ≈1주)
- 데모영상(<1분, BGM 없음) + 스크린샷 ≥3 + ToS/Privacy HTML 호스팅 → Devpost 앱 상세 폼 (D-3~D-1)

## §4 할 수 없는 것 (외부 변수)

- **Devvit 런타임 검증** — `devvit build`/`playtest`/`upload`/`publish`는 Reddit OAuth + 앱 등록 필요, Devvit는 로컬 에뮬레이터 없음. `@devvit/test` + `replay`로 로직은 커버했지만 Devvit의 라우팅/페이로드 주입/RPC는 블랙박스. → `devvit playtest`가 유일한 검증 (사용자만 가능).
- **앱 리뷰** — `devvit publish --public` 후 Reddit admin 리뷰 ≈1주, 통제 불가. 늦으면 unlisted install 링크로 fallback.
- **데모영상/스크린샷** — 러닝 앱 필요 → wizard + playtest 이후에만.

## §5 추가로 필요한 것 (사용자 확인)

- OpenAI 계정 billing 활성 유지 (이미 됨, `npm run openai:smoketest`로 재확인 가능). 키는 `.env`(로컬, gitignore) + Devvit secret(배포) 둘 다.
- 데모용 sub: <200 멤버 (invite-only로 관리). 200 초과 시 실격.
- (선택) `devvit settings set subredditOpenaiApiKey` — sub별 BYOK 키 (50/day 쿼터 우회).
- 환경 점검: `npm install` 시 git hooks 설치됨 (`prepare` → simple-git-hooks). `npm ci`는 esbuild EBADPLATFORM으로 안 됨 → `npm install` 사용 (CI도).

## §6 다음 세션 시작 프롬프트

```text
/handon

이전 세션 핸드오프: claudedocs/2026-05-12-session-handoff.md
프로젝트 전반 계획: HANDOFF.md (레포 루트)

읽고 아래에 답한 뒤 진행하세요:
1. Devvit wizard를 진행했나요? (yes → 어디서 막혔는지 / devvit build·playtest 에러 + devvit logs / no → 아래 2)
2. (wizard 안 했으면) 지금 루트 README.md + Devpost 7섹션 설명 템플릿을 작성할까요?
3. fact 레이어 확장(repost/cross-sub/isEdited/언어감지 등 — AutoMod 대비 ceiling 올리기)을 v0.2로 진행할까요? (큰 작업, 별도 PR)
4. 그 외 우선순위 있나요?

D-day: 2026-05-27 18:00 PDT (해커톤 마감, firm). publish 리뷰 ~1주 → ~D-9(5/18)까지 devvit publish 시작 필요.
```

## §7 핵심 자산 위치

| 경로 | 내용 |
|---|---|
| `HANDOFF.md` (루트) | 프로젝트 전반 계획 — 17일 일정, 7 hard lock, 비용, 산출물 인벤토리. **세션마다 갱신됨.** |
| `devvit.json` | Devvit 설정 — `server`/`marketingAssets`/`permissions`/`settings`/`menu`/`forms`/`triggers`/`scheduler`/`scripts`/`dev` |
| `vite.config.ts` | 서버 SSR 빌드 → `dist/server/index.cjs` (CJS; `devvit.json` scripts가 이걸 실행) |
| `src/server/index.ts` | Hono 라우트 — menu/form/trigger/scheduler 핸들러, `isCallerModerator` 가드, `callOpenAI`, dry-run-replay |
| `src/server/{evaluator,fact-bag,executor,devvit-helpers}.ts` | 결정론 평가기 / fact bag / 액션 실행+audit+rollback / SDK 어댑터(context, T1/T3) |
| `src/shared/{rule-schema,system-prompt,starter-rules}.ts` | Zod 스키마 / gpt-5.4용 프롬프트+few-shot / 5 starter rules |
| `scripts/{acceptance,devvit-doctor,replay,build-icon,openai-smoketest}.ts` | `npm run acceptance`/`doctor`/`replay`/`build:icon`/`openai:smoketest` |
| `test/{devvit-testkit,setup}.ts` + `vitest.devvit.config.ts` | 손수 만든 하네스 + 프로젝트 setup + 공식 `@devvit/test` 설정 |
| `docs/devvit-reference.md` | developers.reddit.com/docs 비-게임 58페이지 스냅샷 (Playwright 크롤) |
| `docs/devvit-conformance-notes.md` | vibe-mod ↔ Devvit Web 문서 정합 감사 (수정·확인·미해결 + @devvit/test 채택) |
| `docs/new-mod-checklist.md` | 다음 Devvit 모드 시작 시 복사할 인프라 목록 + SDK gotcha 목록 |
| `docs/{README-vibe-mod,tos,privacy}.md` | (현 README — 루트 README는 없음) / ToS / Privacy Policy |
| `claudedocs/hackathon-audit-20260512-reddit-mod-tools.html` | 해커톤 제출 준비도 감사 (4축 + Top 갭 + 액션 체크리스트) |
| `assets/icon.png` | 앱 아이콘 1024×1024 (`npm run build:icon`으로 재생성) |
| `fixtures/*.json` | replay 예제: post-submit / compose-rule-submit / undo-action |
| `.github/workflows/ci.yml` + `dependabot.yml` | CI 파이프라인 + 의존성 봇 |

## §8 알려진 issue / open question

- **`devvit build`/`devvit upload`/`devvit publish` 실런타임 미검증** — 타입·번들·테스트는 통과하지만 Devvit 안에서 실제로 도는지는 wizard + playtest로만 확인. SDK mismatch 1~2건 더 나올 가능성 있음 (이미 ~45건 + max_tokens 등 고침).
- **루트 `README.md` 없음** — Devpost "public repo" 링크 + GitHub front page용으로 작성 필요.
- **Devpost 제출 자산 0** — 7섹션 설명, 데모영상, 스크린샷, Project-Impact, 앱 링크 모두 미작성/미생성. 일정상 D-3~D-1이지만 README + 설명 템플릿은 지금 가능.
- **`@devvit/test` 부분 마이그레이션** — 기존 route 테스트는 손수 하네스(`devvit-testkit.ts`) 유지. 전면 마이그레이션은 평행 vitest project 필요 + 이득 적음. 새 모드는 처음부터 `@devvit/test`.
- **fact 레이어가 좁음** — closed `FactPaths` ~22개로는 표현 못 하는 흔한 룰 많음 (repost, cross-sub 도배, isEdited, 계정 유사도, 언어). AutoMod 대비 capability ceiling이 낮은 근본 원인. 해커톤 후 v0.2 1순위 (별도 PR).
- **CodeRabbit 인라인 코멘트** — PR #1~#16에서 모두 반영 완료 (PR #6에서 일괄). 새 PR마다 자동 리뷰 — 다음 세션에서 새 PR 만들면 다시 확인.
- `claudedocs/`는 gitignore 안 됨 — `git status`에 untracked로 뜸. 커밋할지 사용자 판단 (분석 산출물).

---
작성: 2026-05-12 / `/handoff` skill
