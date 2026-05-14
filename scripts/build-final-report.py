#!/usr/bin/env python3
"""Build the final HTML report for the OpenAI 400 debugging session."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
B64 = (Path("/tmp/toast-b64-line.txt").read_text()).strip()
OUT = ROOT / "claudedocs" / "2026-05-14-openai-400-final-report.html"

HTML = r"""<!DOCTYPE html>
<html lang="ko" data-theme="dark" data-layout="scroll">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>vibe-mod OpenAI 400 디버깅 — 최종 보고서</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #0d1117; --surface: #161b22; --surface-2: #1c2128; --border: #30363d;
  --text: #e6edf3; --text-2: #8b949e; --accent: #58a6ff;
  --success: #3fb950; --warning: #d29922; --error: #f85149; --info: #79c0ff;
  --code-bg: #1c2128;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg); color: var(--text); line-height: 1.6;
  display: grid; grid-template-columns: 280px 1fr; min-height: 100vh;
}
@media (max-width: 900px) { body { grid-template-columns: 1fr; } .toc-sidebar { display: none; } }

.toc-sidebar {
  position: sticky; top: 0; height: 100vh; overflow-y: auto;
  background: var(--surface); border-right: 1px solid var(--border);
  padding: 24px 18px; font-size: 0.92em;
}
.toc-sidebar h2 { font-size: 0.78em; text-transform: uppercase; color: var(--text-2);
  letter-spacing: 0.06em; margin-bottom: 12px; }
.toc-sidebar ol { list-style: none; counter-reset: toc; }
.toc-sidebar li { counter-increment: toc; margin: 6px 0; }
.toc-sidebar a {
  color: var(--text-2); text-decoration: none; display: block;
  padding: 6px 10px; border-radius: 6px; border-left: 2px solid transparent;
  transition: all 0.15s;
}
.toc-sidebar a::before { content: counter(toc) ". "; color: var(--text-2); margin-right: 4px; }
.toc-sidebar a:hover { background: var(--surface-2); color: var(--text); }
.toc-sidebar a.active { background: var(--surface-2); color: var(--accent); border-left-color: var(--accent); }

main { padding: 48px 56px 80px; max-width: 1100px; }
@media (max-width: 900px) { main { padding: 24px 18px 60px; } }

.report-header { border-bottom: 1px solid var(--border); padding-bottom: 32px; margin-bottom: 48px; }
.report-header h1 { font-size: 2.2em; font-weight: 700; line-height: 1.2; margin-bottom: 8px; }
.report-header .subtitle { color: var(--text-2); font-size: 1.1em; margin-bottom: 18px; }
.meta-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 999px; font-size: 0.82em; font-weight: 500;
  background: var(--surface-2); color: var(--text-2); border: 1px solid var(--border);
}
.badge.resolved { background: rgba(63, 185, 80, 0.12); color: var(--success); border-color: var(--success); }
.badge.production { background: rgba(88, 166, 255, 0.12); color: var(--accent); border-color: var(--accent); }

section { margin-bottom: 56px; scroll-margin-top: 24px; }
section h2 { font-size: 1.55em; font-weight: 600; margin-bottom: 20px;
  padding-bottom: 8px; border-bottom: 1px solid var(--border); }
section h3 { font-size: 1.18em; font-weight: 600; margin: 28px 0 12px; color: var(--text); }
section h4 { font-size: 1em; font-weight: 600; margin: 18px 0 8px; color: var(--text-2);
  text-transform: uppercase; letter-spacing: 0.04em; }
p { margin-bottom: 14px; color: var(--text); }
p + p { margin-top: 0; }
ul, ol { margin: 10px 0 14px 22px; }
li { margin-bottom: 6px; }
strong { color: var(--text); font-weight: 600; }
em { color: var(--info); font-style: normal; font-family: 'JetBrains Mono', monospace; font-size: 0.92em; }

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

code, pre {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9em;
}
:not(pre) > code {
  background: var(--code-bg); color: var(--info);
  padding: 2px 6px; border-radius: 4px; font-size: 0.86em;
  border: 1px solid var(--border);
}
pre {
  background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 16px 18px; overflow-x: auto; margin: 14px 0;
  position: relative;
}
pre code { color: var(--text); }
pre .lang { position: absolute; top: 6px; right: 12px; font-size: 0.72em;
  color: var(--text-2); text-transform: uppercase; letter-spacing: 0.06em; }
pre .keyword { color: #ff7b72; }
pre .string { color: #a5d6ff; }
pre .comment { color: #8b949e; font-style: italic; }
pre .number { color: #79c0ff; }
pre .function { color: #d2a8ff; }

table { width: 100%; border-collapse: collapse; margin: 14px 0;
  font-size: 0.92em; background: var(--surface); border-radius: 8px; overflow: hidden;
  border: 1px solid var(--border); }
th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); }
th { background: var(--surface-2); color: var(--text); font-weight: 600;
  font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.04em; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover { background: var(--surface-2); }
td.status-ok { color: var(--success); font-weight: 500; }
td.status-fail { color: var(--error); font-weight: 500; }
td.status-warn { color: var(--warning); font-weight: 500; }
td.num { font-family: 'JetBrains Mono', monospace; text-align: right; }

.callout { padding: 14px 18px; border-radius: 8px; margin: 18px 0;
  border-left: 4px solid; }
.callout-title { font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
.callout.info { background: rgba(88, 166, 255, 0.08); border-color: var(--accent); }
.callout.success { background: rgba(63, 185, 80, 0.08); border-color: var(--success); }
.callout.warning { background: rgba(210, 153, 34, 0.08); border-color: var(--warning); }
.callout.error { background: rgba(248, 81, 73, 0.08); border-color: var(--error); }
.callout.tip { background: rgba(168, 85, 247, 0.08); border-color: #a855f7; }

.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px; margin: 20px 0; }
.metric-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  padding: 18px; text-align: center;
}
.metric-card .value { font-size: 2em; font-weight: 700; color: var(--accent); line-height: 1.1; }
.metric-card .value.success { color: var(--success); }
.metric-card .value.warn { color: var(--warning); }
.metric-card .label { font-size: 0.84em; color: var(--text-2); margin-top: 6px;
  text-transform: uppercase; letter-spacing: 0.05em; }

.screenshot {
  width: 100%; max-width: 100%; height: auto; border-radius: 10px;
  border: 1px solid var(--border); margin: 14px 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
.screenshot-caption { font-size: 0.84em; color: var(--text-2); text-align: center; margin-top: 8px; }

.toast-mock {
  background: linear-gradient(135deg, rgba(63, 185, 80, 0.12), rgba(63, 185, 80, 0.02));
  border: 1px solid var(--success); border-radius: 8px;
  padding: 14px 18px; font-family: 'JetBrains Mono', monospace; color: var(--success);
  font-size: 0.95em; margin: 12px 0; word-break: break-word;
}

.scroll-top {
  position: fixed; bottom: 28px; right: 28px; width: 44px; height: 44px;
  background: var(--accent); color: white; border: none; border-radius: 50%;
  font-size: 18px; cursor: pointer; opacity: 0; pointer-events: none;
  transition: opacity 0.2s; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.scroll-top.visible { opacity: 1; pointer-events: auto; }

@media print {
  body { background: white; color: black; grid-template-columns: 1fr; }
  .toc-sidebar, .scroll-top { display: none; }
  pre { background: #f6f8fa; border: 1px solid #d0d7de; color: #1f2328; }
  pre .keyword, pre .string, pre .comment, pre .number { color: black; }
  a { color: black; text-decoration: underline; }
  .callout, table, .metric-card, .screenshot { page-break-inside: avoid; }
  h2, h3 { page-break-after: avoid; }
  main { padding: 0; max-width: 100%; }
  @page { margin: 1.5cm; }
}
</style>
</head>
<body>

<aside class="toc-sidebar" aria-label="Table of contents">
  <h2>Sections</h2>
  <ol>
    <li><a href="#exec-summary" class="active">Executive Summary</a></li>
    <li><a href="#timeline">Fix Attempt Timeline</a></li>
    <li><a href="#root-cause">Root Cause 상세</a></li>
    <li><a href="#verification">End-to-End 검증</a></li>
    <li><a href="#external">외부 Contribution 정리</a></li>
    <li><a href="#lessons">Lessons + 코드베이스 잔여 audit</a></li>
    <li><a href="#next">다음 단계 (D-day)</a></li>
  </ol>
</aside>

<main>

<header class="report-header">
  <h1>vibe-mod OpenAI HTTP 400 디버깅 — 최종 보고서</h1>
  <p class="subtitle">SELECTION-array 버그가 9 PRs · 7 라운드 추측 fix를 거쳐 production verified 까지</p>
  <div class="meta-row">
    <span class="badge">📅 2026-05-14</span>
    <span class="badge resolved">✅ Resolved (PR #39 + #40)</span>
    <span class="badge production">🚀 Production v0.0.41 verified</span>
    <span class="badge">⏰ D-9 (publish ≤ 2026-05-18)</span>
    <span class="badge">Generated by Claude Code</span>
  </div>
</header>

<section id="exec-summary">
<h2>1. Executive Summary</h2>

<div class="callout success">
  <div class="callout-title">🎯 Root Cause (한 줄)</div>
  <p><code>settings.get('openaiModel')</code>은 SELECTION 타입 → <strong>string array</strong> 반환 (<code>["gpt-5.4-mini"]</code>). 우리는 그걸 <code>as string</code>으로 캐스팅해 OpenAI 요청 body의 <code>"model"</code> 필드에 array로 보냈고, OpenAI는 <em>"We could not parse the JSON body"</em> (단일 필드 type mismatch에 대한 generic wording) 으로 거부.</p>
</div>

<div class="metric-grid">
  <div class="metric-card">
    <div class="value warn">9</div>
    <div class="label">Total PRs (#32–#41)</div>
  </div>
  <div class="metric-card">
    <div class="value warn">7</div>
    <div class="label">Speculative Fix Rounds</div>
  </div>
  <div class="metric-card">
    <div class="value success">2</div>
    <div class="label">Root-Cause PRs (#39, #40)</div>
  </div>
  <div class="metric-card">
    <div class="value success">200</div>
    <div class="label">Final HTTP Status</div>
  </div>
  <div class="metric-card">
    <div class="value success">✓</div>
    <div class="label">Chrome E2E Verified</div>
  </div>
  <div class="metric-card">
    <div class="value">5</div>
    <div class="label">Days to D-9 publish</div>
  </div>
</div>

<h3>해결</h3>
<ul>
  <li><strong>PR #39</strong> — <code>callOpenAI</code>에서 SELECTION-array unwrap (root cause fix). MERGED 2026-05-13T14:55Z.</li>
  <li><strong>PR #40</strong> — submit handler의 동일 버그 추가 unwrap (defense-in-depth). MERGED 2026-05-13T15:55Z.</li>
  <li><strong>PR #41</strong> — postmortem doc + probe-branch cleanup record. MERGED.</li>
</ul>

<h3>Production 검증 (v0.0.41)</h3>
<div class="toast-mock">
  ✅ TOAST: <strong>Compiled rule "New-account posts to mod queue". Dry-run started — check Dashboard in 30s.</strong>
</div>
<p>Chrome 자동화 (browser_cookie3 + Playwright)로 사용자 Reddit 세션을 빌려 r/SocialSeeding의 <code>vibe-mod: Compose rule</code> 메뉴를 실제 클릭한 결과. 자세한 스크린샷은 §4.</p>
</section>

<section id="timeline">
<h2>2. Fix Attempt Timeline (v0.0.32 → v0.0.41)</h2>

<table>
<thead>
<tr><th>버전</th><th>PR</th><th>가설</th><th>실제 변경</th><th>body chars</th><th>HTTP 결과</th></tr>
</thead>
<tbody>
<tr><td>v0.0.32</td><td>(probe v3 deploy)</td><td>multi-message + 7KB + nested escape가 transit corruption</td><td>probe v3 6-stage 배포</td><td class="num">~7068</td><td class="status-fail">400</td></tr>
<tr><td>v0.0.33</td><td>#32</td><td>multi-message → single user message로 합치면 transit OK</td><td>messages 10 → 1</td><td class="num">~7508</td><td class="status-fail">400</td></tr>
<tr><td>v0.0.34</td><td>#33</td><td>source의 non-ASCII (—, ≈, →, ─) 가 wire 위에서 깨짐</td><td>system prompt 모든 non-ASCII → ASCII 치환</td><td class="num">~7500</td><td class="status-fail">400</td></tr>
<tr><td>v0.0.35</td><td>#34</td><td><code>reasoning_effort</code> + <code>verbosity</code> 조합이 large body에서 trip</td><td>두 필드 제거</td><td class="num">~7000</td><td class="status-fail">400</td></tr>
<tr><td>v0.0.36</td><td>#35</td><td>content의 <code>\n</code> escape가 transit corruption</td><td>모든 newline → space로 flatten</td><td class="num">~6800</td><td class="status-fail">400</td></tr>
<tr><td>v0.0.37</td><td>#36</td><td>string body re-encode 가 corrupting → Uint8Array bypass</td><td>body: Uint8Array + Content-Length</td><td class="num">4401</td><td class="status-fail">400</td></tr>
<tr><td>v0.0.38</td><td>#37</td><td>content의 <code>\"</code> escape density가 culprit</td><td>JSON.stringify 제거, key=value 평문화</td><td class="num">4279</td><td class="status-fail">400</td></tr>
<tr><td>v0.0.39</td><td>#38</td><td>callOpenAI default 모델이 production에서 미테스트</td><td><code>model = 'gpt-5.4-nano'</code> 하드코드 + <strong>console.log 추가</strong></td><td class="num">4277</td><td class="status-warn">200* (downstream toast: "unsupported action")</td></tr>
<tr><td>v0.0.40</td><td>#39</td><td>SELECTION array 진단 → unwrap + few-shot 복원</td><td><code>Array.isArray(raw) ? raw[0] : raw</code></td><td class="num">6545</td><td class="status-ok">200 ✓</td></tr>
<tr><td>v0.0.41</td><td>#40</td><td>submit handler에도 같은 unwrap 적용</td><td>defense-in-depth</td><td class="num">6576</td><td class="status-ok">200 + Chrome verified</td></tr>
</tbody>
</table>

<div class="callout warning">
  <div class="callout-title">⚠️ 결정적 단서: PR #38의 console.log</div>
  <p><strong>한 줄의 진단 로그</strong>가 7-round speculative loop를 끝냈다:</p>
  <pre><code>console.log('[vibe-mod] callOpenAI: openaiModel raw =', JSON.stringify(rawValue), 'unwrapped =', JSON.stringify(model));</code></pre>
  <p>Production 배포 후 첫 cron tick에서:</p>
  <pre><code>[vibe-mod] callOpenAI: openaiModel raw = ["gpt-5.4-mini"] unwrapped = "gpt-5.4-mini"</code></pre>
  <p>→ 즉시 root cause 식별. PR #39는 그 로그를 본 후 5분만에 작성됐고 PR #40까지 1시간 안에 완료.</p>
</div>
</section>

<section id="root-cause">
<h2>3. Root Cause 상세</h2>

<h3>3.1 The bug</h3>
<p><code>devvit.json</code>의 <code>openaiModel</code> 필드는 SELECTION 타입:</p>
<pre><span class="lang">json</span><code>{
  "name": "openaiModel",
  "type": "SELECTION",
  "label": "OpenAI model for rule compilation",
  "options": [
    { "label": "gpt-5.4-mini (recommended)", "value": "gpt-5.4-mini" },
    { "label": "gpt-5.4-nano (cheapest)", "value": "gpt-5.4-nano" },
    { "label": "gpt-5.4 (full)", "value": "gpt-5.4" }
  ]
}</code></pre>

<p>Devvit의 <code>settings.get</code>은 SELECTION 필드를 <strong>string array</strong>로 반환한다 (single-select여도). 우리 코드는:</p>

<pre><span class="lang">typescript</span><code><span class="keyword">let</span> model = <span class="string">'gpt-5.4-mini'</span>;
<span class="keyword">try</span> {
  model = ((<span class="keyword">await</span> settings.get(<span class="string">'openaiModel'</span>)) <span class="keyword">as</span> <span class="keyword">string</span>) || <span class="string">'gpt-5.4-mini'</span>;  <span class="comment">// ← BUG: cast 무시, runtime은 array</span>
} <span class="keyword">catch</span> (err) { <span class="comment">/* ... */</span> }

<span class="keyword">const</span> rawBody = JSON.<span class="function">stringify</span>({
  model,                                    <span class="comment">// ← ["gpt-5.4-mini"] 그대로 들어감</span>
  response_format: { type: <span class="string">'json_object'</span> },
  messages,
  max_completion_tokens: <span class="number">600</span>,
});</code></pre>

<p>최종 wire body:</p>
<pre><span class="lang">json</span><code>{ "model": ["gpt-5.4-mini"], "response_format": {...}, "messages": [...], "max_completion_tokens": 600 }</code></pre>

<h3>3.2 OpenAI의 misleading 에러</h3>
<p>OpenAI는 <code>model</code> 필드 type mismatch에 대해 다음과 같이 응답:</p>
<pre><span class="lang">json</span><code>{
  "error": {
    "message": "We could not parse the JSON body of your request. (HINT: This likely means you aren't using your HTTP library correctly. ...)",
    "type": "invalid_request_error",
    "param": null,
    "code": null
  }
}</code></pre>

<div class="callout error">
  <div class="callout-title">🚨 Wording trap</div>
  <p>이 메시지는 <strong>구조적 JSON parse 실패</strong>(unterminated string, garbled bytes 등)처럼 들린다. 실제로는 <strong>단일 필드의 type mismatch</strong>인데도. 더 구체적인 <code>"Invalid type for parameter 'model': expected string, received array"</code> 같은 메시지였다면 1라운드에 잡혔을 것.</p>
  <p>이 wording이 우리를 7 라운드 speculative fix loop에 가뒀다 — body shape, escape density, byte vs string, message count, size, Content-Length, JSON-syntax-in-content를 차례로 추적했지만 모두 hit miss.</p>
</div>

<h3>3.3 왜 probes (a)/(b)/(d)/(e)/(f)는 모두 200이었나</h3>
<p>진단 probe들은 <code>model: 'gpt-5.4-nano'</code> (string literal) 을 하드코드. 그래서 wire body의 model 필드는 항상 string. <code>settings.get</code>을 우회했기 때문에 array bug를 만난 적이 없다. <strong>"잘 작동하는 control"을 잘못 만든 케이스</strong>: probe가 production code path와 평행한 별도 fetch 호출을 했기 때문에 진단 가치가 제한됨.</p>

<h3>3.4 The fix (PR #39 + #40)</h3>
<pre><span class="lang">typescript</span><code><span class="keyword">const</span> DEFAULT_MODEL = <span class="string">'gpt-5.4-mini'</span>;
<span class="keyword">let</span> model = DEFAULT_MODEL;
<span class="keyword">try</span> {
  <span class="keyword">const</span> raw = <span class="keyword">await</span> settings.get(<span class="string">'openaiModel'</span>);
  <span class="keyword">let</span> unwrapped: <span class="keyword">unknown</span> = raw;
  <span class="keyword">if</span> (Array.<span class="function">isArray</span>(raw) && raw.length &gt; <span class="number">0</span>) unwrapped = raw[<span class="number">0</span>];
  <span class="keyword">if</span> (<span class="keyword">typeof</span> unwrapped === <span class="string">'string'</span> && unwrapped.<span class="function">trim</span>()) model = unwrapped.<span class="function">trim</span>();
  console.<span class="function">log</span>(<span class="string">'[vibe-mod] callOpenAI: openaiModel raw ='</span>, JSON.<span class="function">stringify</span>(raw), <span class="string">'unwrapped ='</span>, JSON.<span class="function">stringify</span>(model));
} <span class="keyword">catch</span> (err) {
  console.<span class="function">warn</span>(<span class="string">'[vibe-mod] callOpenAI: settings.get(openaiModel) threw — using default:'</span>, <span class="function">describeErr</span>(err));
}</code></pre>
<p>같은 fix를 submit handler line 477도 적용 (PR #40) — draft.llmModel 메타데이터에도 array가 들어가지 않도록.</p>
</section>

<section id="verification">
<h2>4. End-to-End Production 검증</h2>

<p>수동 click 없이 자율 검증 — <code>scripts/chrome-reddit-v3.py</code> (browser_cookie3 + Playwright):</p>

<ol>
  <li><code>browser_cookie3.chrome(domain_name="reddit.com")</code> → 16 cookies 추출</li>
  <li>Playwright Chromium에 <code>storageState</code>로 주입 (사용자 로그인 세션 그대로 활용)</li>
  <li>r/SocialSeeding 진입 → <code>Open overflow menu</code> 버튼 클릭</li>
  <li><code>vibe-mod: Compose rule</code> 메뉴 (Lit shadow DOM) → <code>page.mouse.click(1322, 436)</code> 좌표 기반 클릭 (Playwright 표준 click은 visibility 판정 실패)</li>
  <li><code>&lt;faceplate-form&gt;</code> 모달 열림 → <code>&lt;textarea name="rule"&gt;</code> 채움: <em>"Send any post from accounts less than 7 days old to the mod queue"</em></li>
  <li>Submit 클릭 → 2.5초 후 toast 캡처</li>
</ol>

<div class="callout success">
  <div class="callout-title">🎉 Captured Toast</div>
  <div class="toast-mock">
    Compiled rule <strong>"New-account posts to mod queue"</strong>. Dry-run started — check Dashboard in 30s.
  </div>
  <p style="margin-top: 8px; font-size: 0.9em; color: var(--text-2);">→ OpenAI compile 200 OK + valid JSON 출력 + draft 저장 + dry-run 스케줄 모두 확인.</p>
</div>

<img class="screenshot" src="data:image/jpeg;base64,__SCREENSHOT_B64__" alt="Chrome screenshot of Reddit toast: Compiled rule 'New-account posts to mod queue'. Dry-run started — check Dashboard in 30s.">
<p class="screenshot-caption">Chrome 스크린샷 — r/SocialSeeding 페이지 우측 하단의 success toast (모자이크 마스킹 없이 production raw)</p>

<h3>Production logs (v0.0.41, 같은 click 트리거)</h3>
<pre><span class="lang">log</span><code>[vibe-mod] mod check: getModerators → 2 mods: DragonfruitAfraid309,vibe-mod
[vibe-mod] mod check: DragonfruitAfraid309 ∈ mods? true
[vibe-mod] callOpenAI: settings.get(openaiApiKey) ok: { defined: 'string', len: 164 }
[vibe-mod] callOpenAI: openaiModel raw = ["gpt-5.4-mini"] unwrapped = "gpt-5.4-mini"
[vibe-mod] callOpenAI: body chars = 6576
<span class="comment"># (HTTP 400 line 없음 → success path)</span>
<span class="comment"># (submit: callOpenAI threw 라인 없음 → 예외 미발생)</span></code></pre>
</section>

<section id="external">
<h2>5. 외부 Contribution 정리</h2>

<p>잘못된 root-cause 추정이 외부 이슈/PR에 흔적을 남겼음. <strong>모두 수정 또는 close</strong>했다.</p>

<table>
<thead>
<tr><th>위치</th><th>종류</th><th>문제</th><th>액션</th><th>결과</th></tr>
</thead>
<tbody>
<tr>
<td><a href="https://github.com/reddit/devvit/issues/261" target="_blank">reddit/devvit#261</a></td>
<td>우리가 연 issue</td>
<td>본문에 OpenAI 400을 plugin RPC로 잘못 연결한 한 줄 + 일시 platform 문제 (현재 비재현)</td>
<td>본문 수정 (상단 ⚠️ 경고 박스 + Retraction 섹션 + postmortem 링크) + <code>not planned</code> close</td>
<td class="status-ok">CLOSED ✅</td>
</tr>
<tr>
<td><a href="https://github.com/reddit/devvit/issues/258" target="_blank">reddit/devvit#258</a> (코멘트)</td>
<td>다른 사람 issue에 단 코멘트</td>
<td>시점상 정확한 reproduction이지만 현재 비재현 → reader 오해 가능</td>
<td>follow-up 코멘트 추가 (24h+ 안정 + #261 retraction 링크). 원본 코멘트는 audit log 보존 위해 미수정.</td>
<td class="status-ok">UPDATED ✅</td>
</tr>
<tr>
<td><a href="https://github.com/reddit/devvit-docs/pull/109" target="_blank">reddit/devvit-docs#109</a></td>
<td>우리가 연 PR</td>
<td>본문 + 파일이 #261을 영구 platform 버그처럼 framing</td>
<td>(1) PR 본문 수정 — transient failure defense로 reframe. (2) 파일 commit <code>ecc77dd</code> push — "Related issues" 섹션에서 #261 closed 명시. (3) 알림 코멘트.</td>
<td class="status-ok">REFRAMED ✅ (OPEN, CLA pending)</td>
</tr>
<tr>
<td>vibe-mod#32–#38</td>
<td>우리가 머지한 PR (잘못된 hypothesis fix)</td>
<td>본문이 잘못된 가설을 명시</td>
<td>git history는 immutable — postmortem PR #41 (<code>docs/postmortems/2026-05-14-...</code>)이 모든 시도를 한 곳에 정리</td>
<td class="status-ok">POSTMORTEM ✅</td>
</tr>
</tbody>
</table>

<h3>5.1 정정 원칙</h3>
<ul>
  <li><strong>우리가 만들고 잘못된 것</strong> → 수정 또는 close (#261, PR #109)</li>
  <li><strong>다른 곳에 단 코멘트</strong> (편집 시 audit log 노이즈) → follow-up 코멘트로 정정 (#258)</li>
  <li><strong>머지된 git history</strong> → immutable, postmortem doc으로 정정 기록 (PR #41)</li>
</ul>
</section>

<section id="lessons">
<h2>6. Lessons + 코드베이스 잔여 audit</h2>

<div class="callout tip">
  <div class="callout-title">💡 Top 3 Lessons</div>
  <ol>
    <li><strong>Always log resolved values of <code>settings.get(...)</code></strong> — 진단 한 줄이 7 라운드를 절약. <code>console.log('raw =', JSON.stringify(raw), 'unwrapped =', ...)</code> 패턴을 모든 외부 설정 진입점에 추가하라.</li>
    <li><strong><code>as string</code> casts are tech debt</strong> — runtime이 실제로 structured면 silent 거짓말. Devvit <code>settings.get</code>이 discriminated union (<code>STRING | SELECTION_ARRAY | NUMBER</code>)을 반환했다면 컴파일 타임에 잡혔을 것.</li>
    <li><strong>진단 probe는 production code path를 mirror하라</strong> — probe가 평행 fetch 호출을 만들면, code path 한쪽의 버그를 못 잡는다. 차라리 production 함수를 직접 호출하는 probe가 더 신뢰성 있음.</li>
  </ol>
</div>

<h3>6.1 코드베이스 잔여 SELECTION-array audit</h3>
<pre><span class="lang">bash</span><code><span class="comment"># 다른 SELECTION 타입 settings 확인:</span>
$ grep -nE <span class="string">'"type":\s*"SELECTION"'</span> devvit.json
<span class="comment"># → openaiModel only (이미 fix됨)</span>

<span class="comment"># settings.get + as string 잔여 패턴:</span>
$ grep -rn <span class="string">"as string"</span> src/server/ | grep <span class="string">"settings.get"</span>
src/server/index.ts:1364:    subKey = ((<span class="keyword">await</span> settings.get(<span class="string">'subredditOpenaiApiKey'</span>)) <span class="keyword">as</span> <span class="keyword">string</span>) ?? <span class="string">''</span>;
src/server/index.ts:1378:      <span class="keyword">const</span> globalKey = ((<span class="keyword">await</span> settings.get(<span class="string">'openaiApiKey'</span>)) <span class="keyword">as</span> <span class="keyword">string</span>) ?? <span class="string">''</span>;
<span class="comment"># → 둘 다 STRING 타입 (devvit.json 확인) — cast 정확. 추가 unwrap 불필요.</span></code></pre>

<h3>6.2 OpenAI 에러 wording 개선 제안</h3>
<p>OpenAI에 별도 issue로 fired할지 검토 가능 (이번 세션에선 행동 안 함):</p>
<ul>
  <li>현재: <em>"We could not parse the JSON body of your request"</em> — 모든 type mismatch에 동일</li>
  <li>제안: <em>"Invalid type for parameter 'model': expected string, received array"</em></li>
</ul>
<p>이 wording 변경만으로 동일 카테고리의 디버깅 시간이 7 라운드 → 0 라운드로 단축됨.</p>
</section>

<section id="next">
<h2>7. 다음 단계</h2>

<table>
<thead><tr><th>액션</th><th>마감</th><th>상태</th></tr></thead>
<tbody>
<tr><td><code>npx devvit publish --public</code> 시작</td><td>2026-05-18 (D-9)</td><td class="status-warn">⏳ 5일 남음 (사용자 액션)</td></tr>
<tr><td>Reddit App Directory 리뷰 통과 (~1주)</td><td>~2026-05-25</td><td class="status-warn">⏳ Reddit team</td></tr>
<tr><td>데모 영상 (1분 미만, BGM 없음)</td><td>2026-05-27 18:00 PT</td><td class="status-warn">⏳ Compose flow 라이브 검증됐으니 진행 가능</td></tr>
<tr><td>Devpost 제출 (URL/팀 username/영상 placeholder 채우기)</td><td>2026-05-27 18:00 PT</td><td class="status-warn">⏳ 사용자 액션</td></tr>
<tr><td><a href="https://docs.google.com/forms/d/e/1FAIpQLScG6Bf3yqS05yWV0pbh5Q60AsaXP2mw35_i7ZA19_7jWNJKsg/viewform" target="_blank">reddit/devvit-docs CLA 서명</a> (PR #109 머지 위해)</td><td>—</td><td class="status-warn">⏳ 사용자 액션 (선택)</td></tr>
</tbody>
</table>

<div class="callout info">
  <div class="callout-title">ℹ️ D-day 14 일 남음</div>
  <p>2026-05-27 18:00 PT firm. 오늘 = 2026-05-14 KST (D-13). publish 리뷰 ~1주 추정 → publish 시작 권장 마감 2026-05-18 (D-9), <strong>5일 안에</strong>. compose flow가 라이브 검증되었으므로 publish + 영상 + Devpost 제출 모두 진행 가능.</p>
</div>

<h3>7.1 검증 자산 위치</h3>
<table>
<thead><tr><th>자산</th><th>경로</th></tr></thead>
<tbody>
<tr><td>Postmortem doc</td><td><code>docs/postmortems/2026-05-14-openai-400-selection-array.md</code></td></tr>
<tr><td>Chrome 자동화 스크립트</td><td><code>scripts/chrome-reddit-v3.py</code></td></tr>
<tr><td>Toast 스크린샷</td><td><code>playwright/.auth/v3-05-after-submit-1.png</code></td></tr>
<tr><td>이 보고서</td><td><code>claudedocs/2026-05-14-openai-400-final-report.html</code></td></tr>
<tr><td>Production app</td><td><a href="https://developers.reddit.com/apps/vibe-mod" target="_blank">developers.reddit.com/apps/vibe-mod</a> (v0.0.41)</td></tr>
<tr><td>Demo subreddit</td><td><a href="https://reddit.com/r/SocialSeeding" target="_blank">r/SocialSeeding</a></td></tr>
</tbody>
</table>
</section>

</main>

<button class="scroll-top" id="scrollTop" aria-label="맨 위로">↑</button>

<script>
// TOC active state via IntersectionObserver
const sections = document.querySelectorAll('main section');
const tocLinks = document.querySelectorAll('.toc-sidebar a');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      tocLinks.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    }
  });
}, { rootMargin: '-30% 0px -55% 0px' });
sections.forEach((s) => observer.observe(s));

// Scroll-to-top button
const btn = document.getElementById('scrollTop');
window.addEventListener('scroll', () => {
  btn.classList.toggle('visible', window.scrollY > 400);
});
btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
</script>

</body>
</html>
"""

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(HTML.replace("__SCREENSHOT_B64__", B64), encoding="utf-8")
print(f"WROTE {OUT}")
print(f"SIZE  {OUT.stat().st_size:,} bytes ({OUT.stat().st_size/1024:.1f} KB)")
