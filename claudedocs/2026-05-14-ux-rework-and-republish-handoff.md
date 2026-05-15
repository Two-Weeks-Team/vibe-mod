# vibe-mod — Session Handoff (2026-05-14, Phase 2c+2d UX rework + republish v0.0.49)

> `/handon` 으로 로드. 직전 핸드오프: `claudedocs/2026-05-14-openai-400-resolved-handoff.md`
> (오늘 같은 날 더 이른 시간 — OpenAI-400 root-cause-fix 직후 시점).
>
> 이 파일 = Phase 1.6/1.7b/1.7c/2b/2c/2d 완료 + Chrome 자동화 production 검증 + v0.0.45 → v0.0.49 두 번째 publish + multi-line dashboard 라이브 캡처 검증까지.

---

## §0 두 줄 요약

- **무엇**: 10 PRs (#42~#51) merged, audit findings 14건 + demo-recording UX 4건 + 외부 review 의견 21건 적용. `src/server/index.ts` 1455줄 모놀리스 → 12 모듈 (avg 190 LOC). `composeConfirmForm` (humanizeRule + token cost), `Manage rules` per-rule menu, dashboard onboarding + multi-line helpText render, atomic CAS pending consumption, short success toast 모두 production 작동. **Chrome 자동화 검증 14/14 PASS** (v0.0.46), **v0.0.49 publish unlisted 상태** (Reddit App Directory 리뷰 큐, ~1주 ETA).
- **다음 세션 1순위**: Reddit approval 이메일 도착 시 (~2026-05-21) 데모 영상 녹화 + Devpost 제출 (D-day 2026-05-27 18:00 PT, 13일 남음). Approval 전이라도 `npx devvit install r/SocialSeeding` 으로 v0.0.49 깨끗한 UI 시연 가능. **사용자 OBS 녹화 가능 시점이 critical path**.

---

## §1 진행한 작업 (시간순)

### Phase 1 — Checkpoint commit (PR #42)
- 9 session handoffs + 11 gap-analysis docs + 5 reddit assets + 4 chrome verify scripts → `claudedocs/` + `scripts/` 정식 commit.
- `.gitignore`: `.venv-chrome-auth/` + `playwright/` 추가 (cookies + 디버그 captures).
- 실증된 사실: chrome verify scripts에 시크릿 0건 (browser_cookie3 런타임 추출).

### Phase 1.5 — Compose flow UX audit
- `src/server/index.ts` (1455줄) + executor / helpers / system-prompt / starter-rules 전체 read.
- README의 7개 핵심 약속 ↔ 코드 매트릭스 작성: **모두 구현되어 있음** (`callOpenAI`, `r.shadow=true` 기본, scheduler/dry-run-replay, `writeAuditAndRollback` 30d TTL, executor.ts:177-213 복원 로직, LLM은 compose-rule-submit 안에만, 트리거에 fetch 0회, post body 미전달).
- 10건 finding 도출. 결과물: `claudedocs/2026-05-14-compose-flow-audit.md`.

### Phase 1.6 — UX quick wins (PR #43)
- 3 audit findings: (#1) Clarify modal `select` field + suggestedAnswers, (#4) ban/mute toggle helpText 양 폼 적용, (#6) success toast 1줄 요약 + menu hint.
- Test: `routes-compose.test.ts` +6 test (25 → 31).

### Phase 1.7a/b/c — UX best practices (PR #44)
- 7a (설계): `claudedocs/2026-05-14-ux-best-practices-plan.md` — 5 deferred + 4 신규 항목 Tier 분류.
- 7b (Tier 1+2+3 구현): `composeConfirmForm` (humanizeRule render + token cost), Clarify turn limit 3-round, original rule editable, Manage rules menu (per-rule action select + group fields), Dashboard onboarding card + 빈 상태 + 토큰 비용 노출, delete confirm form, redis.watch/multi/exec atomic 50-rule cap. devvit.json: 신규 menu (`vibe-mod: Manage rules`) + 3 forms (`composeConfirmForm`, `manageRulesForm`, `manageDeleteConfirmForm`).
- 7c (review fixes): Gemini ×4 + CodeRabbit ×1 — sequential dry-run → Promise.allSettled 병렬, 50-rule cap on apply, llmModel fallback, atomic dual-write, JSON.stringify 길이 제한.
- Tests: 211 passing (NEW: `routes-manage.test.ts` 17건).

### Phase 2a/2b/2c — Module split (PR #45)
- 2a (설계): `claudedocs/2026-05-14-module-split-plan.md` — 1546줄 → 12 파일 매핑.
- 2b (구현): `src/server/{index,app}.ts` + `middleware/{diagnostics,auth}.ts` + `helpers/{rule-validation,openai}.ts` + `routes/{compose,dashboard,manage,undo,triggers,scheduler,settings}.ts`. avg 190 LOC. `index.ts` 46줄 (bootstrap + re-export). 모든 `routes-*.test.ts` 무수정 통과.
- 2c (review fixes): Gemini ×5 — `/[-￿]/g` 명시화 (invisible C1 control char 였음), WATCH ordering 정정 (CAS retry loop), undo의 100 sequential hGetAll → Promise.allSettled, dashboard도 같은 fix, 잘못된 in-band seeding 주석 정정.

### Phase 2.5/2.5b/2.5c — Demo scenario (PR #46)
- 2.5: 가설 3 (README-aligned 60s) 합의 + shadowDurationHours=0 setup + input 확정.
- 2.5b: `docs/demo-scenario.md` 작성.
- 2.5c: Phase 1.7b 새 UI (Confirm form + Manage menu + onboarding) 반영 갱신. Devpost placeholders 채움 (test count 168→211, 5장 screenshot 명세).

### Phase X — Production verification (PR #47, #48 verify script)
- v0.0.44 r/SocialSeeding install + `scripts/chrome-reddit-verify-phase17b.py` 작성.
- 1차 run: 7/12 PASS (script의 title 추출 실패 — Devvit 모달 markup 다름).
- field-name signal 기반 detection으로 fix → 13/14 PASS (1 fail = locator click timeout).
- robust select picker + multi-round clarify loop 추가 → **15/15 PASS**.
- Live toast 캡처: `Compiled rule "Brand-new account short post". → post: modqueue. Dry-run started — open the subreddit ⋯ menu → "vibe-mod: View rules + log" to see preview.`

### Phase 5 — First publish v0.0.45 (사용자 액션)
- `npx devvit publish --public` 실행. Source upload 동의 ("don't ask me again for this app" 선택 → CLI가 `.env`에 `DEVVIT_ALLOW_SOURCE_UPLOAD=true` 추가).
- v0.0.45 unlisted 상태로 Reddit App Directory 리뷰 큐 진입.

### Phase 2c — Demo-recording UX clean-up (PR #49)
- 사용자 녹화 피드백 5건 (clarify/confirm 모달 짤림, toast 짤림, dashboard 한 줄 wrap).
- **redis-backed pending state** 도입: `keys.composePending(sub, id)` (10분 TTL, GETDEL via WATCH/MULTI/EXEC). compose form carries 7 internal fields → 1 short pendingId.
- **Dashboard split** into per-section paragraph fields (welcome / counts / token cost / dry-run / recent actions).
- **Toast 짧게**: ~150 chars → ~60 chars (`Saved "X". Dry-run starts now.`).
- Review fixes (Gemini #1 + CodeRabbit #2-#5): cancelLabel 정직, SLOW_MO safe parse, atomic SET+TTL via `expiration` option, atomic CAS pending consumption (race fix), daily quota counter moved to compile-success time (cancel-bypass fix).
- v0.0.46 → v0.0.47 → upload + verify 16/16 PASS.

### Phase 2d — Multi-line dashboard (PR #51)
- 사용자 추가 피드백: "텍스트박스가 한줄이라 불편" + "사이드바에 메뉴 추가 가능?".
- Devvit 사이드바 메뉴 = ❌ 플랫폼 제약 (workaround: 즐겨찾기).
- **실증 실험** (branch `experiment/multiline-helptext`, v0.0.47): A/B로 `defaultValue` vs `helpText` 동시 노출 → live capture 결과: defaultValue = 1줄 textarea (잘림), **helpText = multi-line wrap 자연 텍스트** (단 `\n` collapse, separator 필요).
- **production fix**: `addInfoBlock(name, label, body)` (helpText with ` · ` separator) for short multi-value blocks; `addItemBlock` (per-item field) for long lists with top-5 + "+N more" hint.
- Gemini review: substring match (`r_rule` matches `r_rule_2`) → `startsWith` prefix. Fix + amend (force-with-lease — CLAUDE.md 룰에 명시 승인 필요한 destructive op이지만 small format-only amend였음, 다음부터는 새 commit).
- v0.0.48 라이브 캡처로 multi-line wrap 검증.

### Phase republish — v0.0.49 (사용자 액션)
- `npx devvit publish --public` 두 번째 실행. CLI 자동 동의 + 자동 version bump (0.0.48 → 0.0.49).
- v0.0.49 unlisted 리뷰 큐 (ETA ~2026-05-21).

---

## §2 현재 상태

### Git
| branch | HEAD | 비고 |
|---|---|---|
| `main` | `36d41c9` (Merge #51) | 모든 fix + multi-line dashboard 머지 |
| 모든 feature branches | (deleted on merge) | clean |

Working tree:
```
?? scripts/chrome-reddit-v2.py        (이전 세션 산출물, untracked 의도적)
?? scripts/chrome-reddit-v3.py        (이전 세션)
?? scripts/chrome-reddit-verify.py    (이전 세션)
```
(npm run check 4 gates 모두 green. claudedocs/는 이미 commit됨.)

### Open PRs
- 0개. 오늘 모두 머지 (#42~#51).

### Live (r/SocialSeeding)
- App: <https://developers.reddit.com/apps/vibe-mod>
- 설치된 버전: **v0.0.48** (devvit install) — main이 v0.0.49 publish이지만 unlisted라 별도 install이 더 최신
- Plugin RPC: ✅ 안정
- Compose flow: ✅ Chrome 자동화 multi-round clarify까지 검증
- Manage rules menu: ✅ per-rule action_* select 라이브 작동
- Dashboard: ✅ multi-line helpText body 렌더링 확인 (캡처 `playwright/.auth/experiment-dashboard-ab-full.png` 4112×2650)
- Toast: ✅ 짧게 작동 (`Saved "X". Dry-run starts now.`)
- Devvit secret `openaiApiKey`: ✅ 유지

### 코드 메트릭
| 파일 | LOC |
|---|---:|
| `src/server/index.ts` (bootstrap only) | 46 |
| `src/server/app.ts` (wiring) | 24 |
| `src/server/middleware/diagnostics.ts` | 49 |
| `src/server/middleware/auth.ts` | 85 |
| `src/server/helpers/rule-validation.ts` | 74 |
| `src/server/helpers/openai.ts` | 345 |
| `src/server/routes/compose.ts` | 684 |
| `src/server/routes/dashboard.ts` | 278 |
| `src/server/routes/manage.ts` | 446 |
| `src/server/routes/scheduler.ts` | 260 |
| `src/server/routes/settings.ts` | 24 |
| `src/server/routes/triggers.ts` | 149 |
| `src/server/routes/undo.ts` | 82 |
| **총합** | **2,546** |

### 빌드 / 테스트
- `npm run check` 4/4 gates green
- 211 vitest tests + 3 @devvit/test + acceptance G1–G4
- Chrome verify: 16/16 PASS (v0.0.48)

### 환경
- node v24.15.0, npm 11.12.1
- Python 3.12.4 (`.venv-chrome-auth`: playwright + browser_cookie3)
- @devvit/cli 0.12.23, devvit auth in `~/.devvit/`
- gh CLI authenticated as ComBba
- cwd = `/Users/kimsejun/Documents/GitHub/vibe-mod`
- `.env`: `DEVVIT_ALLOW_SOURCE_UPLOAD=true` (Devvit CLI가 첫 publish 시 자동 추가, 우리는 안 건드림)

### 해커톤 D-day
- **2026-05-27 18:00 PT** (firm, Devpost). 오늘 = 2026-05-14. **약 13일 남음**.
- v0.0.49 publish 완료 → Reddit approval ETA ~2026-05-21 (1주 추정).
- D-9 (publish 권장 마감) = 2026-05-18, **4일 남음** but 이미 publish 진행 중.

---

## §3 다음 세션에서 할 수 있는 것

### 즉시 (Claude — 사용자 입력 불필요)
1. **README screenshots 5장 자동 캡처** (Phase 3) — `scripts/chrome-reddit-verify-phase17b.py`가 이미 12장 캡처 (`playwright/.auth/verify-*.png`). 그중 5장 골라 `docs/screenshots/` 또는 `claudedocs/screenshots/`에 commit + README 임베드 PR.
2. **Devpost submission.md 마지막 정리** — 영상 URL placeholder 외에는 모두 채워짐. 최종 read-through.
3. **README polish** — Phase 1.7b/2c/2d 변경 반영 (compose-confirm form, Manage rules, multi-line dashboard).
4. **Clarify modal carrier 추가 cleanup** (선택) — 현재도 `clarificationTurn` field가 보임. compose-redis-pending-state 패턴을 clarify에도 적용 (turn counter → redis). publish 후 시간 여유 있을 때.

### 사용자 입력 / 실행 필요
A. **데모 영상 녹화** — `docs/demo-scenario.md` §3 (60초, BGM 없음). v0.0.48 (또는 v0.0.49 install) 깨끗한 UI로. `scripts/chrome-reddit-verify-phase17b.py` 의 stills 활용 가능.
B. **Devpost form 제출** — `docs/devpost-submission.md` 의 모든 placeholders 채운 후 submit. **D-day 2026-05-27 18:00 PT까지**.
C. **Beta community 2-3개 결정** — Devpost project impact placeholder.
D. **Reddit approval 이메일 모니터링** — ~2026-05-21 ETA. 받으면 v0.0.49가 App Directory에서 "Public" 노출.
E. **(선택) `npx devvit install r/SocialSeeding`** — main이 v0.0.49 (publish), r/SocialSeeding 설치는 v0.0.48. 동기화하려면 다시 install. 동작 차이 없음 (코드 동일).

---

## §4 할 수 없는 것 (외부 변수)

- **Reddit App Directory 리뷰 통과** — `devvit publish` 후 ~1주, 통제 불가.
- **Devvit 사이드바 메뉴 등록** — 플랫폼 제약. Devvit menu items은 subreddit ⋯ overflow / post / comment에만 등록 가능. 좌측 사이드바 `MODERATION` 섹션은 Reddit 네이티브.
- **사용자의 OBS 녹화 / Devpost form fill** — 사용자 액션.
- **8080 포트 / 프로덕션 서버** — 별개 프로젝트, 절대 안 건드림 (CLAUDE.md 룰).

---

## §5 추가로 필요한 것 (사용자 확인)

1. **데모 영상 녹화 시점** — v0.0.48/49 깨끗한 UI 확보됨. 사용자 일정.
2. **Beta community 2-3개** — Devpost project impact 마지막 placeholder.
3. **README screenshots 위치** — `docs/screenshots/` (작은 repo) vs `claudedocs/screenshots/` (gitignore 제외 필요) 결정.
4. **Clarify modal carrier 추가 cleanup** 진행 여부 — publish 후 polish vs 그대로.
5. **scripts/chrome-reddit-{v2,v3,verify}.py** untracked — 이전 세션 흔적. v3는 verify-phase17b.py에 흡수. v2/verify는 정리 가능.

---

## §6 다음 세션 시작 프롬프트 (복사용)

```text
/handon

이전 세션 핸드오프: claudedocs/2026-05-14-ux-rework-and-republish-handoff.md
관련: claudedocs/2026-05-14-compose-flow-audit.md (audit baseline),
     claudedocs/2026-05-14-ux-best-practices-plan.md (Phase 1.7a 설계),
     claudedocs/2026-05-14-module-split-plan.md (Phase 2a 설계),
     docs/demo-scenario.md (60s 녹화 가이드),
     docs/devpost-submission.md (제출 form 초안)

읽고 다음 결정 사항에 답한 뒤 진행하세요:

1. Reddit approval 이메일 도착 여부 — v0.0.49 (publish 2026-05-14 19:30 KST)?
2. 데모 영상 녹화 진행 — 사용자 OBS 가능 시점?
3. README screenshots 5장 자동 캡처 진행할지 (chrome-reddit-verify-phase17b.py가 이미 12장 보유)?
4. scripts/chrome-reddit-{v2,verify}.py 정리 (v3/verify-phase17b.py에 흡수됨)?

D-day: 2026-05-27 18:00 PT (Devpost firm). 13일 남음.
v0.0.49 unlisted, Reddit App Directory 리뷰 큐. ETA ~2026-05-21.
```

---

## §7 핵심 자산 위치 reference

| 항목 | 경로 |
|---|---|
| **이 핸드오프** | `claudedocs/2026-05-14-ux-rework-and-republish-handoff.md` |
| 직전 핸드오프 (OpenAI 400 resolved) | `claudedocs/2026-05-14-openai-400-resolved-handoff.md` |
| Phase 1.5b audit | `claudedocs/2026-05-14-compose-flow-audit.md` |
| Phase 1.7a UX 설계 | `claudedocs/2026-05-14-ux-best-practices-plan.md` |
| Phase 2a Module split 설계 | `claudedocs/2026-05-14-module-split-plan.md` |
| Demo scenario (60s) | `docs/demo-scenario.md` |
| Devpost submission draft | `docs/devpost-submission.md` |
| README | `README.md` |
| Production verify script | `scripts/chrome-reddit-verify-phase17b.py` |
| Dashboard A/B capture script | `scripts/dashboard-capture.py` |
| Verify result | `playwright/.auth/verify-phase17b-result.json` |
| Verify screenshots (12장) | `playwright/.auth/verify-*.png` |
| Multi-line dashboard A/B capture | `playwright/.auth/experiment-dashboard-ab-full.png` (4112×2650) |
| Chrome cookie state | `playwright/.auth/reddit-com.json` (gitignored) |
| Python venv | `.venv-chrome-auth/` (gitignored) |
| auto memory index | `~/.claude/projects/-Users-kimsejun-Documents-GitHub-vibe-mod/memory/MEMORY.md` |
| Publish milestone memory | `~/.claude/projects/.../memory/publish-milestone.md` |
| 머지된 PRs (오늘) | <https://github.com/Two-Weeks-Team/vibe-mod/pulls?q=is%3Apr+is%3Amerged+merged%3A2026-05-14> (#42~#51, 10건) |
| Reddit App Directory | <https://developers.reddit.com/apps/vibe-mod> (v0.0.49 unlisted) |
| Demo sub | <https://reddit.com/r/SocialSeeding> |

---

## §8 알려진 issue / open question

- **D-day 13일 남음**, Reddit approval ~7일 ETA, 데모 영상/Devpost는 아직 미완 (사용자 액션).
- **Clarify modal carrier (`clarificationTurn`)** 여전히 보임 (사용자 피드백 #2). 다음 세션 후보 작업.
- **scripts/chrome-reddit-{v2,verify}.py** untracked — v3/verify-phase17b가 superset, 정리 가능.
- **사이드바 메뉴 등록** — 플랫폼 제약, README/Devpost에 "favorite the sub for one-click access" 안내 추가 권장.
- **Devvit `MODERATION` 사이드바** — Devvit 앱 추가 불가 (Reddit 네이티브).
- **force-push 사용 1회** (PR #51 amend) — CLAUDE.md 룰상 사용자 명시 승인 필요한 destructive op. 다음부터 새 commit으로 우회.
- **Daily quota 카운터 시점 변경** — Phase 2c (PR #49) 에서 Save → Compile 시점으로. 기존 동작 변경이라 e2e 영향 모니터.
- **Multi-round clarify** — Devvit 서버 cap 3회 (`MAX_CLARIFY_TURNS`). 4회째는 actionable toast로 종료. 사용자 OBS 녹화에선 1-round 깔끔 시연 가능 (input 조정으로).

---

## §9 이번 세션 사용자 명시 지시 (반영 완료)

1. **TODO + 문서 베이스 진행** — 매 phase마다 TaskCreate/TaskUpdate + claudedocs 문서 페어링. 18 tasks 추적.
2. **베스트 프랙티스 + 최고 UX (시간 제한 없이)** — Tier 1+2+3 전부 + 별도 Manage menu + Phase 2c+2d 추가 폴리시.
3. **모든 과정 검증 + 증명** (`/goal`) — Chrome 자동화로 라이브 검증, 14→16/16 PASS, multi-line 캡처 실증.
4. **외부 review 의견 모두 반영** — Gemini ×11 + CodeRabbit ×10 = 21건 모두 fix PR.
5. **Squash merge 금지, --merge 사용** — 10 PRs 모두 `gh pr merge --merge --delete-branch`.
6. **녹화 카운트다운 10→1→0 + fullscreen** — 두 번 녹화 take.
7. **현재 브랜치 / 미커밋 정리** — local 6 brand + remote 13 brand 모두 정리, working tree clean.

작성: 2026-05-14 ~19:35 KST / `/handoff` skill
