# vibe-mod — Compose Flow UX Audit (2026-05-14)

> Phase 1.5 산출물. Compose → Clarify → Re-compile → Toast → Dashboard → Activate → Live → Undo 전체 흐름의 코드 read 결과 + finding 10건 + README 약속 vs 코드 매트릭스 + 시나리오 결정 사유.
>
> 단일 ground truth — 향후 reviewer / handoff / Phase 1.6 PR / Phase 2.5b demo doc이 모두 이 문서를 참조한다.

## §0 한 줄 결론

README의 7개 핵심 약속(deterministic JSON · shadow mode · dry-run · 30-day rollback · LLM only at edit time · zero AI per post · LLM never sees content)은 **모두 코드에 구현되어 있다**. 다만 **Clarify 모달이 LLM의 `suggestedAnswers`를 버리고 free-text로만 표시**해서 와우포인트가 시각적으로 사라진다 — Phase 1.6에서 fix.

## §1 README 약속 vs 코드 매트릭스

| # | README 약속 | 코드 위치 | 상태 |
|---|---|---|:-:|
| 1 | Plain English → deterministic JSON rule | `callOpenAI` (index.ts:1180-1410) + `Rule.parse(strict)` (index.ts:430-462) + Zod schema (rule-schema.ts:167-190) | ✅ |
| 2 | 24-hour shadow mode | `r.shadow=true` 기본 (rule-schema.ts:182) + `scheduler/shadow-promote-check` 15분 주기 (index.ts:1056-1102) + `shadowDurationHours` 기본 24h (devvit.json) | ✅ |
| 3 | Dry-run preview against recent posts | `scheduler/dry-run-replay` (index.ts:981-1054), 최근 N posts에 selectMatchingRules 실행, `${sub}:dryrun:${ruleId}` 저장, dashboard에서 표시 (index.ts:603-621) | ✅ |
| 4 | 30-day rollback on every action | `writeAuditAndRollback` rollback token 30d TTL (executor.ts:283-295) + Undo 메뉴 (index.ts:719-774) + 실제 복원 — `post.approve()`, `comment.approve()`, `target.unlock()`, `reddit.unbanUser()` (executor.ts:177-213) | ✅ |
| 5 | LLM only at rule-edit time | `callOpenAI`는 `compose-rule-submit` handler 안에만. 트리거 4종(post/comment submit/report)에 없음 | ✅ |
| 6 | Zero AI calls per post/comment | 트리거 → evaluator(pure TS, evaluator.ts) → executor(reddit/redis만), fetch 0회 | ✅ |
| 7 | LLM never sees Reddit content | `callOpenAI(userRule, clarificationAnswer)`만 받음. post.body/title 미전달 (index.ts:1180-1183) | ✅ |

**결론**: 약속 = 구현 = 라이브 작동 (Chrome 자동화로 toast 캡처됨, 2026-05-14).

## §2 Findings (10건)

### 🔥 Critical for demo

#### Finding #1 — Clarify modal이 LLM의 `suggestedAnswers`를 버리고 free-text로만 표시
- **위치**: `index.ts:394-426` (clarification path), `system-prompt.ts:80-85` (LLM 응답 schema)
- **현상**: LLM이 `{ needsClarification, question, suggestedAnswers: [...] }` 반환하지만 server는 `description: compiled.question`만 표시하고 `suggestedAnswers`는 폐기. clarificationAnswer field는 free-text `paragraph` type.
- **데모 임팩트**: 🔥🔥🔥 — 와우포인트("AI가 옵션으로 되묻는다")가 시각적으로 보이지 않음. 영상에서 차별화 0.
- **Fix**: clarify form에 `type: 'select'` field 추가, options = suggestedAnswers; "Other (specify)" fallback 텍스트 박스도 함께 노출. type guard `isClarification`도 suggestedAnswers를 체크하도록.
- **비용**: M (1-2시간, test 포함)
- **PR 대상**: Phase 1.6

#### Finding #4 — ban/mute toggle 의미 불명
- **위치**: `index.ts:264-268`, `index.ts:444-454`
- **현상**: 사용자 mental model = "권한 추가 (켜면 ban 가능)". 실제 = "negative permission gate" (LLM이 ban emit하면 OFF일 때 거부, ON이면 통과). helpText 0.
- **데모 임팩트**: 🟡 — 영상에서 짧게 노출되지만 자막 한 줄로 설명 가능
- **Fix**: helpText 추가 — "vibe-mod will only emit ban/mute if your rule explicitly says 'ban' or 'mute'. This checkbox lets the compile succeed when it does."
- **비용**: XS (10분)
- **PR 대상**: Phase 1.6

#### Finding #6 — 성공 toast가 다음 액션 안내 없음
- **위치**: `index.ts:548-563`
- **현상**: `Compiled rule "X". Dry-run started — check Dashboard in 30s.` Dashboard 메뉴 어디서 여는지 안내 0. Devvit toast는 버튼 미지원.
- **데모 임팩트**: 🟡 — 영상에선 영향 작음 (시연자가 메뉴 잘 알기), 실제 신규 사용자는 친화도 ↓
- **Fix**: `re-open Mod Tools menu → "vibe-mod: View rules + log"` 한 줄 추가. + finding #2 한 줄 요약 ("→ onPostSubmit, will modqueue") 함께.
- **비용**: XS (15분)
- **PR 대상**: Phase 1.6

### 📺 Demo-friendly (no fix needed)

#### Finding #8 — example helpText가 데모 input과 정확히 일치 + clarify 자연 트리거
- **위치**: `index.ts:260-262` (compose form helpText `"If a brand-new account posts within 3 hours of joining, send to mod queue."`)
- **상태**: KEEP. demo input은 README와 일치하도록 살짝 변경 (`"Send to mod queue posts from brand-new accounts under 50 chars"`) — helpText는 더 보편적인 example로 그대로 유지.

#### Finding #9 — starter rules 5개 (install 직후 draft에 시드)
- **위치**: `starter-rules.ts:20-83`
- **상태**: KEEP. 데모에서 dashboard 진입 시 "Draft rules: 5" 자연 노출 → "5 conservative starter rules ready" 메시지에 활용.

### 🟢 Nice-to-have (post-publish)

#### Finding #2 — 결정적 JSON preview가 없음
- **위치**: 컴파일 직후 toast만, JSON dump는 dashboard text dump에만 있음
- **데모 임팩트**: 🔥 — 결정적 contract가 시각적으로 안 보임
- **Decision**: Phase 1.6에서 toast에 1줄 요약 ("→ onPostSubmit, will modqueue when /author<24h/") 추가하는 작은 fix로 대체. 정식 form preview는 publish 후.
- **비용**: 작은 fix S, 정식 preview L
- **PR 대상**: Phase 1.6 (toast 1줄), 정식은 post-publish

#### Finding #3 — Dashboard가 plain-text dump
- **현상**: per-rule actions(toggle/delete/edit) 없음
- **Decision**: post-publish. 데모에서는 5초 클로즈업으로 대체.

#### Finding #5 — Clarification 무한 루프 위험
- **현상**: turn counter 없음. LLM이 매번 새 질문 → 모달 반복.
- **Decision**: post-publish (실제 발생 관찰 후).

#### Finding #7 — clarify modal에서 'Original rule (do not edit)' field가 disabled
- **현상**: 원문 수정하려면 cancel 후 재시작 (small friction)
- **Decision**: post-publish (안전 우선).

#### Finding #10 — 'Activate' 버튼이 전체 draft 한꺼번에 활성화
- **현상**: per-rule activation 없음
- **Decision**: post-publish.

## §3 Phase 1.6 UX quick wins 범위 (확정)

| Finding | 변경 | 파일 | LOC 예상 |
|---|---|---|---|
| #1 | Clarify form에 `select` field + suggestedAnswers options | `index.ts:394-426` | +30 / -5 |
| #1 | `isClarification` type guard에 suggestedAnswers 체크 | `index.ts:1412-1416` | +3 |
| #1 | clarificationAnswer 우선순위: `clarificationAnswerOther.trim() || clarificationAnswer` | `index.ts:283-287` (form 입력 unwrap) | +5 |
| #4 | ban/mute toggle helpText 추가 | `index.ts:264-268`, `index.ts:417-421` | +2 / -0 |
| #6 | 성공 toast 1줄 요약 + 안내 | `index.ts:548-563` | +10 / -3 |
| Test | `routes-compose.test.ts` 업데이트: clarify 응답 shape, suggested answer round-trip | `routes-compose.test.ts` | +50 |

총 LOC ≈ +100 / -8. 4 gates 회귀 위험 낮음 (handler signature 안 바뀜).

## §4 Demo scenario decision (가설 3 확정)

**가설 1 (Clarify-only)** vs **가설 3 (README-aligned 60s)** 비교:

| 기준 | 가설 1 | 가설 3 |
|---|:-:|:-:|
| README 약속 7개 시연 | 2/7 | 5/7 |
| 와우 포인트 수 | 1 | 3 |
| 영상 길이 | 30s | 60s |
| 24h shadow 시간 압축 필요 | NO | YES (`shadowDurationHours=0`) |
| 쉽게 따라할 수 있나 | YES | YES (가이드 + setup 명확하면) |

**→ 가설 3 확정**. 자세한 시나리오는 `docs/demo-scenario.md` (Phase 2.5b 산출물).

핵심 결정:
- **Demo input**: `"Send to mod queue posts from brand-new accounts under 50 chars"` (1-axis 모호 → 1-turn clarification 보장)
- **24h shadow**: 데모 전 `shadowDurationHours=0` 임시 설정, 데모 후 24로 복원
- **Undo**: shadow=0으로 즉시 live → 실제 post에 modqueue 액션 → ⋯ menu에서 Undo

## §5 References

- `src/server/index.ts` — main entry (1455 줄, Phase 2에서 분할 예정)
- `src/server/executor.ts` — action execution + rollback (296 줄)
- `src/shared/system-prompt.ts` — LLM prompt + few-shot (149 줄)
- `src/shared/rule-schema.ts` — Zod schema (219 줄)
- `src/shared/starter-rules.ts` — 5 seeded rules (108 줄)
- `README.md` — 약속 텍스트 (developers.reddit.com/apps/vibe-mod에 동일)
- `docs/postmortems/2026-05-14-openai-400-selection-array.md` — 직전 root cause 기록
- `claudedocs/2026-05-14-openai-400-resolved-handoff.md` — 직전 핸드오프

## §6 Phase ordering

1. **Phase 1.5b** (in progress) — 이 문서
2. **Phase 2.5b** (next) — `docs/demo-scenario.md` 작성 (가설 3 확정 시나리오)
3. **Phase 1.6** — UX quick wins PR (이 문서 §3 그대로 구현)
4. **Phase 2** — Module split (independent refactor)
5. **Phase 3** — README screenshots (Phase 1.6 적용된 UI 캡처)
6. **Phase 4** — 데모 영상 자산 (시나리오 doc + Playwright 자동 video)
7. **Phase 5** — Devpost placeholders + final README polish
8. **사용자 액션** — `npx devvit publish --public` (D-9 = 2026-05-18)

작성: 2026-05-14 KST / Phase 1.5b
