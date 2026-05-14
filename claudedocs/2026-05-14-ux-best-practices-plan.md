# vibe-mod — UX Best Practices Plan (Phase 1.7a)

> 사용자 directive (2026-05-14): "UX는 시간 제한 두지 말고 quick이 아닌 베스트프랙티스와 최고의 사용자경험을 위해 진행."
>
> Phase 1.6 (PR #43)에서 미뤘던 deferred finding 5건 (#2 #3 #5 #7 #10) + 신규 best-practice 항목 4건을 Devvit form 제약 아래에서 재설계. Tier 1/2/3 분류 + 사용자 합의 후 Phase 1.7b 구현.

## §0 Devvit form 제약 (best UX 설계의 ceiling)

확인된 사항 (`@devvit/shared-types/shared/form.d.ts`):
- 필드 타입: `string` / `paragraph` / `number` / `boolean` / `select` / `image` / `group`
- 필드별 `helpText`, `disabled`, `required`, `defaultValue`
- **버튼이 필드 안에 없음** — `acceptLabel` / `cancelLabel` 만 (form 단위)
- **conditional 렌더링 불가** — 한 form은 한 번에 모두 표시
- **form chaining 가능** — submit 응답으로 새 form 반환
- multi-select select 가능 (`multiSelect: true`)
- `group` 필드로 시각적 묶음

이걸 알면 best UX 설계의 ceiling이 명확해진다 — interactive 한 화면 안에서 동적 변화는 못 하고, **form 흐름(form A → submit → form B → submit → form C)을 잘 짜는 게 best UX**.

## §1 deferred findings 재평가 (Phase 1.6 deferred 5건)

### Finding #2 — 결정적 JSON preview (CONFIRMATION FORM)
**현재**: 컴파일 직후 toast만 표시 (Phase 1.6에서 1줄 요약 추가).
**Best UX**: 컴파일 후 **확인 form**을 띄워서:
- 컴파일 결과를 사람이 읽을 수 있는 자연어로 다시 말해주기
  - 예: "When a post is from an account < 7 days old AND body < 50 chars, send it to mod queue."
- "원문(NL)" / "Trigger" / "조건 (When)" / "액션 (Then)" 4섹션
- 하단: ☑ "Save as draft + run dry-run" (default ON) / Buttons: Save / Edit (back to compose with rule pre-filled)

**왜 best**: README의 "deterministic JSON" 약속을 컴파일 직후 시각적으로 확인. 모드의 자율성 보장 (Save 전 마지막 review).

**Devvit 제약**: form chaining으로 OK. submit 시 `confirmAction` field로 `save` / `edit` 분기.

**Tier**: **1** (must-have for demo + best UX)

### Finding #5 — Clarification turn limit (LOOP DETECTOR)
**현재**: turn counter 없음. LLM이 매 라운드 새 질문 → 사용자 갇힘 가능성.
**Best UX**:
- 서버측 counter (clarificationTurn field). max 3 turns.
- 3 turn 후 LLM이 또 clarification 요청하면: form 대신 toast `"I'm having trouble understanding this rule. Try rephrasing more concretely (e.g. with specific numbers like '< 7 days' or '< 50 chars')."` + "Cancel" 만 가능
- 추가: 각 clarify form description 위에 "(Round 1 of 3)" 같은 진행 indicator

**왜 best**: 무한 루프 방지 + 사용자에게 진행 상황 visibility.

**Tier**: **1**

### Finding #7 — Original rule editable in clarify modal
**현재**: original rule field가 `disabled: true` paragraph.
**Best UX**: enabled로 두되, helpText "Edit anytime — re-compile uses the latest text + your answer."
**Why best**: 사용자가 modal에서 원문도 바꿀 수 있는 자유도. 만약 input이 잘못 입력됐는데 clarify까지 왔다면 cancel 후 재시작이 아니라 inline 수정 가능.
**Tier**: **1** (small, high-affordance gain)

### Finding #3 + #10 — Dashboard per-rule activation (INTERACTIVE DASHBOARD)
**현재**: text dump + 단일 "Activate N drafts" boolean.
**Best UX**: dashboard form을 **per-rule action panel**로 재설계:
- 상단: 요약 (active N · draft N · recent actions M · today tokens X)
- For each draft rule (max 10):
  - Group field "Draft: <rule name>"
    - paragraph (disabled): rule.sourceNL + dry-run preview ("would match 3/20 recent posts")
    - select "Action": ["Keep as draft", "Activate (shadow mode)", "Activate immediately (skip shadow)", "Delete"]
- For each active rule (max 10):
  - Group "Active <shadow|live>: <rule name>"
    - paragraph: sourceNL + "Activated 2h ago" + "actions: 5 shadow / 0 applied"
    - select "Action": ["Keep", "Promote shadow → live", "Pause", "Delete"]
- Submit applies all selected changes in 1 atomic Redis txn.

**왜 best**: "control surface" 패턴 (Stripe-style admin UI). per-rule visibility + per-rule action.
**Devvit 제약**:
- group 필드 사용 가능 (`type: 'group'`)
- 10 rules × 2 fields = 20 fields per form은 OK (한도 50 정도)
- 단점: form 전체가 한 화면 → 11+ rule이면 스크롤 길어짐 (현재는 max 50 rule)
**Tier**: **2** (큰 변경, 큰 임팩트, 데모에서 1 클로즈업)

## §2 추가 best-practice 항목 (audit 외)

### A — 빈 상태 (Empty states)
**현재**: dashboard 첫 진입 시 starter rules 5개 시드. install 직후라 사용자에겐 "Draft rules: 5" 보여서 OK. 하지만:
- starter rules가 모두 삭제된 경우 → 빈 dashboard에 "No rules yet — open the ⋯ menu → 'vibe-mod: Compose rule'" 메시지
- compose form에 일일 quota 0/50일 때 "Welcome — write your first rule" 안내
**Tier**: **2**

### B — 파괴적 액션 confirm (Delete safety)
**현재**: 룰 삭제 기능 자체가 없음 (#3 추가 시 도입). 추가 시 즉시 적용은 위험.
**Best UX**: dashboard에서 "Delete" 선택 시, 다음 form에 "Confirm delete N rules" boolean. 두 단계 확인.
**Tier**: **2** (#3과 함께)

### C — Onboarding (첫 사용자 가이드)
**현재**: install 직후 starter rules 5개 시드. 사용자는 어디서 시작할지 모름.
**Best UX**: 첫 dashboard 진입 시 (Redis flag로 first-visit 감지) 상단에 onboarding card:
- "Welcome to vibe-mod! 3 quick steps:"
- "1. We seeded 5 starter rules — see them below"
- "2. Click 'Activate' to enable any rule (shadow mode for 24h first)"
- "3. Open ⋯ → Compose rule to write your own in plain English"
- ☑ "Don't show this again" → Redis set first-visit-acknowledged
**Tier**: **3** (post-publish, 시간 압박 시 skip)

### D — Token cost transparency
**현재**: 일일 compile counter X/50 표시 (compose form만). 누적 token 미표시.
**Best UX**: dashboard 상단 요약에 "Today: 7 compiles · 12,234 input tokens · 612 output tokens · ~$0.0006". 
- 데이터는 이미 redis에 있음 (`bundle.llmTokensIn` + bundle.llmTokensOut). 화면 노출만 추가.
**Tier**: **2**

## §3 추천 Tier (사용자 합의 대상)

### Tier 1 (must-land for publish + best demo) — 추정 ~6h
- **#2** Compile preview confirmation form
- **#5** Clarification turn limit (3-round) + progress indicator
- **#7** Original rule editable

### Tier 2 (should-land for best UX) — 추정 ~10h
- **#3+#10** Interactive dashboard with per-rule actions (group fields)
- **A** Empty states (dashboard + compose)
- **B** Delete confirm (with #3)
- **D** Token cost transparency

### Tier 3 (post-publish polish) — 추정 ~6h
- **C** Onboarding card
- 추가 brainstorm 후

총 Tier 1+2 = ~16h 작업. D-9 (4일 = 96h) 대비 16% 시간 → 충분히 여유.

## §4 Tier 1 implementation 스케치

### #2 Compile preview confirmation form

```ts
// src/server/index.ts (will be in src/server/routes/compose.ts after Phase 2)
// After successful compile + validation, before persisting draft:

const ruleNL = humanizeRule(validated);  // new helper
return c.json<UiResponse>({
  showForm: {
    name: 'composeConfirmForm',  // NEW form name → registered in devvit.json
    form: {
      title: 'Confirm compiled rule',
      description: 'Review the rule before saving. You can edit if it doesn\'t match your intent.',
      acceptLabel: 'Save + run dry-run',
      cancelLabel: 'Cancel',
      fields: [
        { name: 'compiledJson', label: 'Compiled rule (read-only)', type: 'paragraph', defaultValue: ruleNL, disabled: true },
        { name: 'editInsteadOfSave', label: 'Edit instead of save', type: 'boolean', defaultValue: false, helpText: 'Tick to go back to compose with the original sentence pre-filled.' },
        { name: 'rule', type: 'paragraph', label: '(internal) original NL', defaultValue: rule, disabled: true },
        { name: 'allowGuarded', type: 'boolean', label: '(internal) allowGuarded', defaultValue: !!allowGuarded, disabled: true },
        { name: 'serializedRule', type: 'paragraph', label: '(internal) compiled rule JSON', defaultValue: JSON.stringify(validated), disabled: true },
      ],
    },
  },
});
```

The new `compose-confirm-submit` route reads `editInsteadOfSave`. If true, re-opens compose form with rule pre-filled. If false, persists draft + schedules dry-run (the persist+dry-run flow currently in compose-rule-submit).

### #5 Clarification turn limit

Add `clarificationTurn` to compose form fields (hidden as paragraph?) — actually Devvit forms don't have `hidden`. Use `disabled` paragraph with default value `'1'`:
```ts
{ name: 'clarificationTurn', label: 'Round (do not edit)', type: 'paragraph', defaultValue: '1', disabled: true }
```
Server: read it, parse int. If LLM returns clarification AND turn >= 3:
```ts
if (isClarification(compiled) && turn >= 3) {
  return c.json({ showToast: { text: "I've asked 3 clarifying questions and still can't compile this. Try rephrasing more concretely (e.g. specific numbers like '< 7 days', '< 50 chars').", appearance: 'neutral' }});
}
```
Else if clarification: increment turn in next form, prepend "(Round 2 of 3) " to question.

### #7 Original rule editable

Just remove `disabled: true` from the `name: 'rule'` paragraph in clarify form. Add helpText.

### Test impact
- routes-compose.test.ts: add ~6 new tests (preview form rendering, edit-back, save flow, turn limit, editable original)
- 회귀 위험: low (handler signature 안 바뀜, 새 엔드포인트 추가)

## §5 Tier 2 implementation 스케치

### #3+#10 Interactive dashboard

```ts
// src/server/index.ts (current) — dashboard menu becomes:
return c.json<UiResponse>({
  showForm: {
    name: 'dashboardForm',  // existing name reused, new schema
    form: {
      title: 'vibe-mod Dashboard',
      description: `Active: ${activeCount} · Draft: ${draftCount} · Today: ${tokensIn}/${tokensOut} tokens (~$${cost.toFixed(4)})`,
      acceptLabel: 'Apply changes',
      cancelLabel: 'Close',
      fields: [
        ...drafts.map(r => ({
          type: 'group',
          label: `📝 Draft: ${r.name}`,
          fields: [
            { name: `info_${r.id}`, label: 'Rule', type: 'paragraph', defaultValue: r.sourceNL, disabled: true },
            { name: `dryrun_${r.id}`, label: 'Dry-run preview', type: 'paragraph', defaultValue: dryRunSummary(r.id), disabled: true },
            {
              name: `action_${r.id}`,
              label: 'Action',
              type: 'select',
              options: [
                { label: 'Keep as draft', value: 'keep' },
                { label: 'Activate (shadow mode 24h)', value: 'activate-shadow' },
                { label: 'Activate immediately (skip shadow)', value: 'activate-now' },
                { label: 'Delete', value: 'delete' },
              ],
              defaultValue: ['keep'],
            },
          ],
        })),
        ...actives.map(r => ({
          type: 'group',
          label: `${r.shadow ? '👻 Shadow' : '✅ Live'}: ${r.name}`,
          fields: [
            { name: `info_${r.id}`, type: 'paragraph', label: 'Rule', defaultValue: r.sourceNL, disabled: true },
            { name: `stats_${r.id}`, type: 'paragraph', label: 'Stats', defaultValue: `${r.stats?.shadow ?? 0} shadow / ${r.stats?.applied ?? 0} applied`, disabled: true },
            {
              name: `action_${r.id}`,
              type: 'select',
              label: 'Action',
              options: [
                { label: 'Keep', value: 'keep' },
                ...(r.shadow ? [{ label: 'Promote shadow → live', value: 'promote' }] : []),
                { label: 'Pause (back to shadow)', value: 'pause' },
                { label: 'Delete', value: 'delete' },
              ],
              defaultValue: ['keep'],
            },
          ],
        })),
      ],
    },
  },
});
```

dashboard-action handler reads each `action_${id}` and applies. Delete actions go through Tier 2 confirm form (`dashboardConfirmDeleteForm`).

### #B Delete confirm form

```ts
// If any action_* === 'delete', show confirm form first:
return c.json({
  showForm: {
    name: 'dashboardConfirmDeleteForm',
    form: {
      title: `Delete ${deleteCount} rule(s)?`,
      description: deleteList.map(r => `- ${r.name}`).join('\n'),
      acceptLabel: 'Confirm delete',
      cancelLabel: 'Cancel',
      fields: [
        { name: 'confirm', type: 'boolean', label: 'I understand this is permanent', defaultValue: false },
      ],
    },
  },
});
```

### #D Token cost

Add to dashboard summary (above):
```ts
const cost = (bundle.llmTokensIn * 0.00000015 + bundle.llmTokensOut * 0.00000060);  // gpt-5.4-mini pricing
```

## §6 New routes / forms registered in devvit.json

Tier 1 추가:
- `/internal/form/compose-confirm-submit` (form: composeConfirmForm)

Tier 2 추가:
- `/internal/form/dashboard-confirm-delete` (form: dashboardConfirmDeleteForm)

(현재 `dashboardForm` 재사용 OK. composeConfirmForm 새로 등록 필요.)

## §7 Tier 1 vs Tier 2 trade-off (사용자 결정)

| 옵션 | Tier 1 only | Tier 1 + Tier 2 | Tier 1 + 2 + 3 |
|---|---|---|---|
| 작업 시간 | ~6h | ~16h | ~22h |
| 데모 임팩트 | ★★★ | ★★★★ | ★★★★ |
| Best UX score | ★★ | ★★★★ | ★★★★★ |
| Risk | low | mid (큰 dashboard 변경) | mid |
| publish 마진 | ⭐ 매우 충분 | ⭐ 충분 | ⭐ 빡빡 |

추천: **Tier 1 + Tier 2** (16h, 4일 안 OK, dashboard interactive가 README의 "audit log" 약속을 시각화).

## §8 Phase 순서 갱신

1. ✅ Phase 1 — checkpoint commit
2. ✅ Phase 1.5 / 1.5b — audit + 문서
3. ✅ Phase 1.6 — 3 quick wins (#1 #4 #6) PR #43 merged
4. ✅ Phase 2.5 / 2.5b — scenario 합의 + 문서
5. ✅ Phase 2a — module split 설계 문서
6. ✅ Phase 1.7a — 이 문서
7. **next**: Phase 1.7b — Tier 1+2 구현 (사용자 합의 후)
8. Phase 2b — module split 구현 (1.7b의 새 코드 포함)
9. Phase 3 — README screenshots (1.7b 적용 UI 캡처)
10. Phase 4 — 데모 영상 자산
11. Phase 5 — Devpost
12. **사용자 액션**: `npx devvit publish --public` (D-9 = 2026-05-18)

## §9 Open question (사용자 결정 필요)

1. **Tier 선택**: Tier 1만 / Tier 1+2 (추천) / Tier 1+2+3
2. **Dashboard interactive 디자인 (#3+#10)**: group field 패턴 OK vs 별도 menu 분리 ("vibe-mod: Manage rules") — 추천: group 패턴 (한 화면 visibility 우선)
3. **Token cost (#D)** 표시 단위: $/달러 vs 토큰만 — 추천: "12,234 in / 612 out (~$0.0006 today)" 둘 다
4. **Onboarding (#C, Tier 3)**: 시간 여유 확정 후 추가? 또는 publish 후로?

## §10 References

- 직전 phase 산출물: `claudedocs/2026-05-14-compose-flow-audit.md`, `docs/demo-scenario.md`, `claudedocs/2026-05-14-module-split-plan.md`
- PR #43 (Phase 1.6 완료): clarify select + ban/mute helpText + toast summary
- Devvit form 타입: `node_modules/@devvit/shared-types/shared/form.d.ts`

작성: 2026-05-14 KST / Phase 1.7a
