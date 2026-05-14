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

## §3 60초 시나리오 (cut by cut)

| Sec | 화면 / 액션 | 자막 (영문) | 노출되는 README 약속 |
|---:|---|---|---|
| 0:00–0:03 | r/SocialSeeding subreddit 메인. 우상단 ⋯ overflow menu open. "vibe-mod: Compose rule" highlight. | *Plain English → moderation rule.* | (intro) |
| 0:03–0:05 | 클릭 → Compose form 열림. helpText example 가시. | — | — |
| 0:05–0:13 | textarea에 입력: **`Send to mod queue posts from brand-new accounts under 50 chars`**. ban/mute toggle = OFF. "Compile + Preview" 버튼 highlight. | *AI compiles. But it asks before it guesses.* | #1 plain English |
| 0:13–0:14 | 클릭 → loading spinner 짧게 | — | — |
| 0:14–0:23 | **Clarify modal** open. Question: *"What should count as 'brand-new account'?"*. **Select field**으로 옵션 표시: `[ under 24 hours ▾ ]` `under 7 days` `Both`. (UX fix #1 적용 후) | **AI gives concrete options. (Wow #1)** | #1 + clarify |
| 0:23–0:25 | "under 7 days" 선택. ban/mute toggle 그대로 OFF. "Re-compile" 버튼 클릭. | — | — |
| 0:25–0:30 | 성공 toast (UX fix #6 적용 후): *"Compiled rule 'New-account short post → modqueue'. Will send to mod queue when account < 7 days. Dry-run started — open menu → View rules + log."* | *Deterministic JSON. Auditable.* | #1 deterministic |
| 0:30–0:33 | ⋯ overflow menu 다시 열기 → "vibe-mod: View rules + log" 클릭 | — | — |
| 0:33–0:42 | Dashboard 모달. 강조: `Dry-run preview (draft rules):  r_new_account_short_post: would match 3/20 recent post(s) → modqueue`. **3/20 숫자 highlight** (cursor + 노란 박스 overlay) | **Dry-run before activation. (Wow #2)** | #2 dry-run |
| 0:42–0:45 | "Activate 1 draft rule(s)" toggle ON → submit. toast: *"Draft activated. Shadow mode is ON by default — promote per rule in next 24h."* (실제로는 setup §2.1에서 `shadowDurationHours=0` 이므로 즉시 live, 다음 trigger 발화부터 액션) | *Always shadow first. Then live.* | #3 shadow mode |
| 0:45–0:48 | 화면 전환. 자막: **"Live now (shadowDurationHours=0). On a real post:"** | — | — |
| 0:48–0:54 | (사전 작성한 테스트 post 페이지) ⋯ menu open → "vibe-mod: Undo this action" 클릭 → toast: *"Rolled back."* | **30-day undo on every action. (Wow #3)** | #4 rollback |
| 0:54–0:60 | Outro card: **vibe-mod** logo + tagline *"Deterministic. Auditable. Reversible."* + URL `developers.reddit.com/apps/vibe-mod` | — | summary |

**총 60초** (실제 cut에 따라 ±2초). 와우 3개 + 약속 5/7 (#1, #2, #3, #4 + 메시지로 #5/#6 암시).

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
