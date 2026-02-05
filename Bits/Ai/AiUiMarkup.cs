namespace StreamCraft.Bits.Ai;

internal static class AiUiMarkup
{
    public static readonly string Html = @"<!doctype html>
<html lang='en'>
<head>
<meta charset='utf-8' />
<meta name='viewport' content='width=device-width, initial-scale=1' />
<title>StreamCraft AI Status</title>
<style>
    :root {
        color-scheme: light;
        --font: 'Bahnschrift', 'Trebuchet MS', 'Segoe UI', sans-serif;
        --mono: 'Consolas', 'Courier New', monospace;
        --ink: #1c1f24;
        --muted: #5d6472;
        --muted-soft: #7b8494;
        --bg: #f7f1e6;
        --bg-alt: #e6eef5;
        --card: #fbf9f4;
        --border: rgba(28, 31, 36, 0.12);
        --accent: #0e7c7b;
        --accent-strong: #0a5f5e;
        --accent-soft: rgba(14, 124, 123, 0.12);
        --ok: #2f855a;
        --warn: #b86a1e;
        --error: #b22b2b;
        --shadow: 0 16px 40px rgba(33, 41, 54, 0.12);
    }
    * {
        box-sizing: border-box;
    }
    body {
        margin: 0;
        min-height: 100vh;
        font-family: var(--font);
        color: var(--ink);
        background: radial-gradient(circle at 20% 20%, #fef8ed 0%, var(--bg) 36%, var(--bg-alt) 100%);
        position: relative;
        overflow-x: hidden;
    }
    body::before,
    body::after {
        content: '';
        position: fixed;
        width: 340px;
        height: 340px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(14, 124, 123, 0.18) 0%, rgba(14, 124, 123, 0) 70%);
        z-index: 0;
        pointer-events: none;
    }
    body::before {
        top: -140px;
        right: -120px;
    }
    body::after {
        bottom: -180px;
        left: -120px;
        background: radial-gradient(circle, rgba(184, 106, 30, 0.2) 0%, rgba(184, 106, 30, 0) 70%);
    }
    .page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 34px 24px 64px;
        position: relative;
        z-index: 1;
    }
    .hero {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 24px;
        align-items: center;
    }
    .hero-copy {
        display: grid;
        gap: 12px;
        animation: fadeUp 0.6s ease both;
    }
    .eyebrow {
        font-size: 12px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--accent-strong);
    }
    h1 {
        margin: 0;
        font-size: 34px;
        letter-spacing: -0.02em;
    }
    p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
    }
    .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }
    .chip {
        background: var(--accent-soft);
        color: var(--accent-strong);
        border: 1px solid rgba(14, 124, 123, 0.2);
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
    }
    .card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px;
        box-shadow: var(--shadow);
    }
    .status-card {
        display: grid;
        gap: 16px;
        animation: fadeUp 0.6s ease both;
        animation-delay: 0.1s;
    }
    .status-row {
        display: flex;
        gap: 12px;
        align-items: center;
    }
    .status-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--warn);
        box-shadow: 0 0 0 6px rgba(184, 106, 30, 0.12);
        animation: pulse 2s infinite;
    }
    .status-dot.ok {
        background: var(--ok);
        box-shadow: 0 0 0 6px rgba(47, 133, 90, 0.16);
    }
    .status-dot.error {
        background: var(--error);
        box-shadow: 0 0 0 6px rgba(178, 43, 43, 0.15);
    }
    .status-title {
        font-size: 18px;
        font-weight: 600;
    }
    .status-sub {
        font-size: 13px;
        color: var(--muted);
    }
    .status-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        font-size: 13px;
        color: var(--muted);
    }
    .status-meta span {
        display: block;
    }
    .label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted-soft);
        margin-bottom: 4px;
    }
    button {
        border: none;
        background: var(--accent);
        color: #fff;
        border-radius: 10px;
        padding: 10px 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    button:disabled {
        opacity: 0.6;
        cursor: default;
        transform: none;
        box-shadow: none;
    }
    button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 10px 20px rgba(14, 124, 123, 0.2);
    }
    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 18px;
        margin-top: 26px;
    }
    h2 {
        margin: 0 0 12px 0;
        font-size: 18px;
    }
    .config-list {
        display: grid;
        gap: 10px;
    }
    .config-item {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 16px;
        font-size: 14px;
    }
    .mono,
    code {
        font-family: var(--mono);
        font-size: 12px;
    }
    .model-list {
        display: grid;
        gap: 8px;
    }
    .model-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px dashed var(--border);
        background: rgba(14, 124, 123, 0.04);
    }
    .model-item.active {
        border-style: solid;
        border-color: rgba(14, 124, 123, 0.4);
        background: rgba(14, 124, 123, 0.12);
        color: var(--accent-strong);
        font-weight: 600;
    }
    .model-item .tag {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted-soft);
    }
    .endpoint-list {
        display: grid;
        gap: 10px;
        font-size: 13px;
    }
    .endpoint {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(28, 31, 36, 0.05);
    }
    .endpoint code {
        background: rgba(14, 124, 123, 0.1);
        padding: 3px 6px;
        border-radius: 6px;
        color: var(--accent-strong);
    }
    .note {
        font-size: 12px;
        color: var(--muted);
        margin-top: 10px;
        line-height: 1.5;
    }
    .muted {
        color: var(--muted);
        font-size: 13px;
    }
    .footer {
        margin-top: 24px;
        font-size: 12px;
        color: var(--muted-soft);
    }
    @keyframes fadeUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
        0% { transform: scale(1); opacity: 0.9; }
        70% { transform: scale(1.25); opacity: 0; }
        100% { opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; transition: none !important; }
    }
    @media (max-width: 720px) {
        h1 { font-size: 28px; }
        .card { padding: 16px; }
    }
</style>
</head>
<body>
<div class='page'>
  <header class='hero'>
    <div class='hero-copy'>
      <div class='eyebrow'>StreamCraft Bit</div>
      <h1>AI Status Console</h1>
      <p>Gateway health check for external AI engines. Use this page to confirm keys, models, and environment before experimenting with AI themes.</p>
      <div class='chips'>
        <span class='chip' id='envChip'>env: -</span>
        <span class='chip' id='modelChip'>model: -</span>
      </div>
    </div>
    <div class='card status-card' id='statusCard'>
      <div class='status-row'>
        <span class='status-dot' id='statusDot'></span>
        <div>
          <div class='status-title' id='statusTitle'>Checking AI service</div>
          <div class='status-sub' id='statusMessage'>Loading...</div>
        </div>
      </div>
      <div class='status-meta'>
        <div>
          <span class='label'>Last check</span>
          <span id='lastCheck'>-</span>
        </div>
        <div>
          <span class='label'>Configured</span>
          <span id='configuredValue'>-</span>
        </div>
      </div>
      <div class='status-actions'>
        <button id='refreshButton'>Refresh status</button>
      </div>
    </div>
  </header>

  <section class='grid'>
    <div class='card' style='--i: 1; animation: fadeUp 0.6s ease both; animation-delay: 0.16s;'>
      <h2>Configuration</h2>
      <div class='config-list'>
        <div class='config-item'>
          <span class='label'>Environment</span>
          <span id='envValue'>-</span>
        </div>
        <div class='config-item'>
          <span class='label'>Active model</span>
          <span id='modelValue'>-</span>
        </div>
        <div class='config-item'>
          <span class='label'>Config table</span>
          <span class='mono'>bit_ai_config</span>
        </div>
        <div class='config-item'>
          <span class='label'>KeyVault fallback</span>
          <span class='mono'>openai</span>
        </div>
      </div>
      <div class='note'>Environment variables supported: STREAMCRAFT_ENV, STREAMCRAFT_OPENAI_MODEL, STREAMCRAFT_OPENAI_MODELS.</div>
    </div>

    <div class='card' style='--i: 2; animation: fadeUp 0.6s ease both; animation-delay: 0.22s;'>
      <h2>Models</h2>
      <div class='model-list' id='modelList'>
        <div class='muted'>Loading models...</div>
      </div>
      <div class='note'>Active model is highlighted. Edit AI config or env vars to change the list.</div>
    </div>

    <div class='card' style='--i: 3; animation: fadeUp 0.6s ease both; animation-delay: 0.28s;'>
      <h2>Endpoints</h2>
      <div class='endpoint-list'>
        <div class='endpoint'><span class='mono'>GET</span><code>/ai/status</code></div>
        <div class='endpoint'><span class='mono'>GET</span><code>/ai/models</code></div>
        <div class='endpoint'><span class='mono'>POST</span><code>/ai/themes/generate</code></div>
        <div class='endpoint'><span class='mono'>POST</span><code>/ai/prompt</code></div>
      </div>
      <div class='note'>Use the Theme Viewer dialog in Designer for AI theme experiments.</div>
    </div>
  </section>

  <div class='footer'>AI bit UI is intentionally minimal. It is a quick status check when a full UI bundle is not present.</div>
</div>

<script>
const statusTitle = document.getElementById('statusTitle');
const statusMessage = document.getElementById('statusMessage');
const statusDot = document.getElementById('statusDot');
const envChip = document.getElementById('envChip');
const modelChip = document.getElementById('modelChip');
const envValue = document.getElementById('envValue');
const modelValue = document.getElementById('modelValue');
const configuredValue = document.getElementById('configuredValue');
const lastCheck = document.getElementById('lastCheck');
const modelList = document.getElementById('modelList');
const refreshButton = document.getElementById('refreshButton');

function setStatus(state) {
  statusDot.className = 'status-dot' + (state ? ' ' + state : '');
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function loadStatus() {
  try {
    const res = await fetch('/ai/status', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Status request failed (' + res.status + ')');
    }
    const data = await res.json();
    const configured = !!data.configured;
    statusTitle.textContent = configured ? 'AI ready' : 'AI not configured';
    statusMessage.textContent = data.message || 'No status message available.';
    envChip.textContent = 'env: ' + (data.environment || '-');
    modelChip.textContent = 'model: ' + (data.model || '-');
    envValue.textContent = data.environment || '-';
    modelValue.textContent = data.model || '-';
    configuredValue.textContent = configured ? 'Yes' : 'No';
    setStatus(configured ? 'ok' : 'warn');
  } catch (err) {
    statusTitle.textContent = 'Status error';
    statusMessage.textContent = String(err || 'Unknown error');
    configuredValue.textContent = 'Unknown';
    setStatus('error');
  } finally {
    lastCheck.textContent = formatTime(new Date());
  }
}

async function loadModels() {
  try {
    const res = await fetch('/ai/models', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Model request failed (' + res.status + ')');
    }
    const data = await res.json();
    modelList.innerHTML = '';
    const models = data.models || [];
    if (!models.length) {
      modelList.innerHTML = `<div class='muted'>No models configured.</div>`;
      return;
    }
    models.forEach(model => {
      const row = document.createElement('div');
      row.className = 'model-item' + (model === data.activeModel ? ' active' : '');
      row.innerHTML = `<span>${model}</span><span class='tag'>${model === data.activeModel ? 'active' : 'available'}</span>`;
      modelList.appendChild(row);
    });
    if (data.activeModel) {
      modelChip.textContent = 'model: ' + data.activeModel;
      modelValue.textContent = data.activeModel;
    }
  } catch (err) {
    modelList.innerHTML = `<div class='muted'>Failed to load models. ${String(err || '')}</div>`;
  }
}

async function refreshAll() {
  refreshButton.disabled = true;
  await Promise.all([loadStatus(), loadModels()]);
  refreshButton.disabled = false;
}

refreshButton.addEventListener('click', refreshAll);
refreshAll();
setInterval(refreshAll, 30000);
</script>
</body>
</html>";
}
