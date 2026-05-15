# vibe-mod — Demo Video Scenario (가설 3, README-aligned 60s)

> Phase 2.5b 산출물. 데모 영상 single source of truth. Phase 3 (스크린샷), Phase 4 (영상 자산), Devpost submission이 모두 이 문서를 참조한다.
>
> 페어: `claudedocs/2026-05-14-compose-flow-audit.md` (Why this scenario)
>
> **확정 일자**: 2026-05-14 / 사용자 합의 후

## §0 한 줄

60초 영상 한 편으로 README의 핵심 약속(deterministic JSON · clarifying AI · dry-run · shadow → live · 30-day rollback)을 모두 보여준다. 와우 3 + 약속 5/7 노출.

## §1 영상 사양

| 항목 | 값 |
|---|---|
| 길이 | **60초 미만** (Devpost guideline + 시청자 attention) |
| 해상도 | 2560×1440 (high-DPI Reddit UI 가독) |
| 프레임률 | 30 fps |
| BGM | **없음** (Devpost rule + 자막 가독성) |
| 자막 | 있음 (영문, 24px, 화면 하단) |
| 음성 내레이션 | **없음** (자막으로 전달) |
| 녹화 도구 | OBS Studio (사용자) + Playwright `record_video` (자동 백업) |
| 인코딩 | H.264, MP4, ≤ 30 MB |

## §2 사전 setup (데모 녹화 직전)

이 단계는 영상에 안 들어감. 사용자 액션:

1. **subreddit setting 임시 변경** (Devvit 콘솔 또는 메뉴):
   ```
   shadowDurationHours = 0     # 즉시 live (영상 안에서 24h 안 기다림)
   dryRunOnly         = false  # 실제 액션 발생
   maxActionsPerHour  = 100    # 기본값 그대로
   ```
2. **테스트 post 1개 미리 작성** — 데모 input ("brand-new accounts under 50 chars")에 매칭되는 짧은 post:
   - 새 계정 (or sock-puppet) 으로 r/SocialSeeding에 short post 1개 작성 (예: "test post for vibe-mod demo")
   - body 50자 미만, 계정 가입 24시간 미만이어야 매칭
3. **영상 녹화 후 setting 복원**:
   ```
   shadowDurationHours = 24    # 원래 값
   dryRunOnly         = true   # 안전 기본값
   ```

## §3 60초 시나리오 (cut by cut, Phase 1.7b UI 반영)

> 변경: 가설 3 + Phase 1.7b UI. **Confirm form** (humanizeRule) + **Manage rules menu** (per-rule action) + **Dashboard onboarding** 가 영상에 자연스럽게 등장하면서 와우 추가.

| Sec | 화면 / 액션 | 자막 (영문) | 노출되는 README 약속 |
|---:|---|---|---|
| 0:00–0:02 | r/SocialSeeding 페이지 → ⋯ overflow → "vibe-mod: Compose rule" highlight. | *Plain English → moderation rule.* | (intro) |
| 0:02–0:04 | 클릭 → Compose form 열림. helpText example 보임. | — | — |
| 0:04–0:11 | textarea에 입력: **`Send to mod queue posts from brand-new accounts under 50 chars`**. allowGuarded=OFF. "Compile + Preview" 클릭. | *AI compiles. But it asks before it guesses.* | #1 plain English |
| 0:11–0:18 | **Clarify modal** open. 헤더 *"(Round 2 of 3) What should count as 'brand-new account'?"* (turn counter). **Select field** options: `[ under 24 hours ▾ ]` `under 7 days` `Both`. **"under 7 days" 선택** → "Re-compile". | **AI gives concrete options. (Wow #1)** | #1 + clarify |
| 0:18–0:28 | **Confirm form** open. compiledSummary read-only paragraph: *"When a new post is submitted, IF: ALL of: author.accountAgeHours lt 168, content.length lt 50; THEN: send to mod queue (note: ...). Compile cost: 1730 in / 88 out tokens (~$0.00031 on gpt-5.4-mini)."*. **"Save + run dry-run preview" 클릭**. | **Deterministic JSON, rendered as English. (Wow #2)** | #1 deterministic + #5/#6 cost |
| 0:28–0:31 | toast: *"Compiled rule 'New-account short post'. → post: modqueue. Dry-run started — open the subreddit ⋯ menu → 'vibe-mod: View rules + log' to see preview."* | — | — |
| 0:31–0:34 | ⋯ overflow → "vibe-mod: View rules + log" 클릭. | — | — |
| 0:34–0:41 | Dashboard form. 첫 방문 → **3-step welcome card** (Phase 1.7b #C). 아래에 *"Dry-run preview (draft rules):  r_new_account_short_post: would match 3/20 recent post(s) → modqueue"* + *"Tokens used (lifetime): 1,730 in / 88 out (~$0.00031 on gpt-5.4-mini)"*. **3/20 highlight**. | **Dry-run + token cost transparency. (Wow #3)** | #2 dry-run |
| 0:41–0:43 | Dashboard 닫고 → ⋯ overflow → "vibe-mod: Manage rules" 클릭. | — | — |
| 0:43–0:50 | **Manage rules form**. group field per rule. 새로 만든 rule의 `Action` select에서 **"Activate immediately (skip shadow)"** 선택 → "Apply changes". toast: *"Applied: activated 1."* | *Per-rule control. Activate, pause, delete.* | #3 shadow mode (skip) |
| 0:50–0:55 | 화면 전환. 자막: **"On a live post matching the rule:"**. 사전 작성한 테스트 post의 ⋯ menu → "vibe-mod: Undo this action" 클릭 → toast: *"Rolled back."* | **30-day undo on every action. (Wow #4)** | #4 rollback |
| 0:55–0:60 | Outro card: **vibe-mod** logo + *"Deterministic. Auditable. Reversible."* + `developers.reddit.com/apps/vibe-mod` | — | summary |

**총 60초** (±2초). 와우 4개 + 약속 6/7 (#1 #2 #3 #4 + cost #6 + onboarding 친절도).

### setup 변경 (영상 녹화 직전)

기존 `shadowDurationHours=0` 대신 영상에서 **"Activate immediately (skip shadow)"** 메뉴 옵션을 사용하므로 setting을 건드릴 필요 없음. 더 정직한 데모 (production 그대로).

여전히 필요한 setup:
1. **테스트 post 1개** (rule에 매칭되는 짧은 post, 새 계정 작성)
2. **Onboarding flag 초기화** — Manage rules 메뉴와 Dashboard onboarding을 fresh state로 보여주려면, 데모 직전 redis에서 `${sub}:onboarding:dismissed` 키 삭제 (또는 새 sub로 시연)

### 새 Phase 1.7b/c UI hooks 영상 반영
- **Confirm form** — 0:18-0:28 sec (10초). humanizeRule output이 시각적으로 명확.
- **Manage rules menu** — 0:43-0:50 sec (7초). per-rule control surface 노출.
- **Dashboard onboarding card** — 0:34-0:41 sec (7초). 첫 사용자 친절도 데모.
- **Turn counter** — 0:11-0:18 sec (7초). "(Round 2 of 3)" 자막 자연스럽게.
- **Token cost** — 0:18-0:28 sec + 0:34-0:41 sec. 두 번 노출.

## §3a v0.0.50 epilogue (Stage 2, 30s — record after v0.0.50 approval lands)

> Two-stage strategy per business-panel agent recommendation: shoot the 60s base
> (§3 above) on v0.0.48 *now* to protect the demo asset from retake risk, then
> append a 30-second epilogue once v0.0.50 lands on r/SocialSeeding showing the
> new flair-update trigger + install-time onboarding modmail. The two cuts are
> spliced into one Devpost video; the epilogue can be skipped if v0.0.50
> approval slips past D-day.

| Sec | 화면 / 액션 | 자막 (영문) | 노출되는 v0.0.50 feature |
|---:|---|---|---|
| 0:60–0:62 | r/SocialSeeding 페이지 → ⋯ overflow → "vibe-mod: Compose rule". | *And one more thing — vibe-mod reacts to mod actions too.* | (transition) |
| 0:62–0:70 | textarea에 입력: **`When the 'Spam' flair is applied to a post, remove it and lock the thread.`**. allowGuarded=OFF. "Compile + Preview". | *Plain English. Same compiler. New trigger.* | onPostFlairUpdate trigger |
| 0:70–0:74 | Confirm form: compiledSummary shows *"on: onPostFlairUpdate. when: post.flairText eq 'Spam'. then: remove + lock."*. "Save + Activate". | *Compiles to a flair-update rule. (Wow #5)* | post.flairText fact + flair trigger |
| 0:74–0:82 | 화면 전환: 같은 페이지에서 테스트 post 1개에 mod이 직접 **"Spam"** flair 적용. ~1초 후 post가 자동 removed + locked 표시. | *Mod applies Spam flair → vibe-mod removes & locks instantly.* | end-to-end trigger demo |
| 0:82–0:88 | mod inbox 열기 → **"Welcome to vibe-mod"** modmail 표시 (one-time install message). | *And every new install gets a markdown welcome to the mod team.* | welcome modmail |
| 0:88–0:90 | Outro card: **vibe-mod v0.0.50** + *"Triggers. Facts. Actions. All in one English sentence."* | — | summary |

**총 90초** (base 60s + epilogue 30s). 와우 5개로 확장.

### Stage 2 setup
1. v0.0.50 has been approved by Reddit and r/SocialSeeding auto-upgraded (check
   `developers.reddit.com/apps/vibe-mod` for version + last-modified).
2. r/SocialSeeding has a flair template named exactly **"Spam"** (create via
   Reddit's flair management UI, color = red, mod-only).
3. The starter rule `r_spam_flair_modqueue` is already shadow-mode (default).
   For the demo, manually promote it via Manage rules → Activate. *(Or write a
   fresh rule per the script above, which the video makes more compelling.)*
4. A throwaway test post on r/SocialSeeding from a sock-puppet account, ready
   for the flair-apply moment. The post itself doesn't matter — only that mod
   can apply the Spam flair to it.

### Stage 2 verification (per [[feedback-chrome-verify-mandate]])
Before recording, run `scripts/chrome-reddit-verify-v050.py` headed (HEADLESS=0)
and confirm the four steps PASS in `playwright/.auth/verify-v050-result.json`:
flair-trigger, approve-guarded, time-facts, welcome-modmail.

## §4 자동 video 백업 (Phase 4 산출물)

`scripts/chrome-reddit-demo.py` (chrome-reddit-v3.py 변형):

```python
# 핵심 추가 부분
context = await browser.new_context(
    storage_state=STATE,
    viewport={"width": 2560, "height": 1440},
    record_video_dir="playwright/.demo/",
    record_video_size={"width": 2560, "height": 1440},
)
# ... §3 시나리오의 클릭 시퀀스 자동 실행 ...
# 단, Clarify의 select field 클릭 + post Undo flow는 라이브 페이지 의존
# 사용자 OBS 녹화가 primary, Playwright video는 fallback / 시간 압박 시 사용
```

영상 품질:
- OBS = 마우스 모션 자연스러움, 자막 동기화 쉬움 → **primary**
- Playwright = 결정적, 재현 가능, 클릭 좌표 정확 → **fallback / dev demo**

## §5 시나리오 외 노출 권장 (선택)

영상 60초에 안 들어가지만 Devpost long description / GitHub README screenshot에서 보강:

- **5 starter rules** 자동 시드 (install 직후 dashboard 첫 방문에 보임)
- **Audit log** 30일 retention
- **OpenAI cost** ~$0.000086 per compile (gpt-5.4-mini)
- **Zero AI per post** — 트리거 path는 LLM 호출 0회

## §6 시나리오에 의존하는 후속 작업

| Task | 본 문서 의존 영역 |
|---|---|
| **Phase 1.6** (UX quick wins) | §3 0:14–0:30 sec — Clarify select field + 성공 toast 메시지 |
| **Phase 3** (README screenshots) | §3 자체 — 5장 = compose form / clarify modal / dashboard / undo toast / outro |
| **Phase 4a** (영상 OBS 가이드) | §3 전체 + §2 setup |
| **Phase 4b** (Playwright video) | §4 |
| **Phase 5** (Devpost) | §0 한 줄, §3 와우 3개 |

## §7 Open question (사용자 결정 필요)

1. **테스트 post 작성용 sock-puppet 계정** — 사용자 보유 vs 새로 만들기?
2. **Outro 카드 디자인** — 별도 PNG 만들지 vs Reddit 페이지에서 페이드아웃?
3. **자막 폰트** — system-default sans (가벼움) vs Inter (디자인) ?
4. **README screenshot 5장 위치** — `docs/screenshots/*.png` (작은 repo) vs `claudedocs/screenshots/*.png` (gitignore에 가까움) — 사용자 의도?

## §8 References

- Phase 1.5b audit: `claudedocs/2026-05-14-compose-flow-audit.md`
- 직전 핸드오프: `claudedocs/2026-05-14-openai-400-resolved-handoff.md`
- README: `README.md`
- Postmortem: `docs/postmortems/2026-05-14-openai-400-selection-array.md`
- 라이브 검증 캡처: `playwright/.auth/v3-05-after-submit-1.png` (gitignored)

작성: 2026-05-14 KST / Phase 2.5b
