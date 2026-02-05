namespace StreamCraft.Bits.Ai;

internal static class AiUiMarkup
{
    public static readonly string Html = @"<!doctype html>
<html lang=""en""><head>
<meta charset=""utf-8"" />
<meta name=""viewport"" content=""width=device-width, initial-scale=1"" />
<title>StreamCraft AI Console</title>
<style>
    :root {
        color-scheme: light dark;
        font-family: "Segoe UI", Tahoma, sans-serif;
        background: #0f1217;
        color: #e6e8ef;
    }
    body {
        margin: 0;
        padding: 20px;
        background: #0f1217;
        color: #e6e8ef;
    }
    .shell {
        max-width: 980px;
        margin: 0 auto;
        background: #141925;
        border: 1px solid #283042;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.35);
        display: grid;
        gap: 16px;
    }
    h1 {
        margin: 0;
        font-size: 20px;
    }
    .row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
    }
    .card {
        background: #101520;
        border: 1px solid #283042;
        border-radius: 10px;
        padding: 14px;
        display: grid;
        gap: 10px;
    }
    label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8f98b3;
    }
    input, textarea, select {
        width: 100%;
        background: #0b0f17;
        border: 1px solid #3a445c;
        border-radius: 8px;
        color: #e6e8ef;
        padding: 8px 10px;
        font-size: 14px;
    }
    textarea {
        min-height: 140px;
        resize: vertical;
    }
    button {
        background: #2d6cff;
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
    }
    button.secondary {
        background: #394056;
    }
    button:disabled {
        opacity: 0.6;
        cursor: default;
    }
    .status {
        font-size: 13px;
        color: #c9d2ea;
    }
    .pill {
        background: #1b2232;
        border: 1px solid #2a3246;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        color: #9fb2ff;
    }
</style>
</head>
<body>
<div class=""shell"">
  <div class=""row"" style=""justify-content: space-between"">
    <h1>StreamCraft AI Console</h1>
    <span class=""pill"" id=""activeModel"">model: -</span>
  </div>

  <div class=""card"">
    <label>Status</label>
    <div class=""row"">
      <div class=""status"" id=""statusText"">Loading status...</div>
      <button class=""secondary"" id=""refreshStatus"">Refresh</button>
    </div>
  </div>

  <div class=""card"">
    <label>Model</label>
    <div class=""row"">
      <select id=""modelSelect"" style=""flex:1""></select>
      <input id=""modelInput"" placeholder=""Custom model id"" style=""flex:1"" />
      <button id=""applyModel"">Set Model</button>
    </div>
    <div class=""status"">Model selection is stored in KeyVault key <strong>openai-model</strong>.</div>
  </div>

  <div class=""card"">
    <label>Prompt</label>
    <textarea id=""prompt"" placeholder=""Describe what you want (themes, TTS, etc.)""></textarea>
    <div class=""row"">
      <button id=""runPrompt"">Run Prompt</button>
      <button class=""secondary"" id=""clearOutput"">Clear Output</button>
    </div>
  </div>

  <div class=""card"">
    <label>Response</label>
    <textarea id=""output"" readonly></textarea>
  </div>
</div>

<script>
const statusText = document.getElementById('statusText');
const activeModel = document.getElementById('activeModel');
const modelSelect = document.getElementById('modelSelect');
const modelInput = document.getElementById('modelInput');
const output = document.getElementById('output');
const prompt = document.getElementById('prompt');

async function loadStatus() {
  try {
    const res = await fetch('/ai/status', { cache: 'no-store' });
    const data = await res.json();
    statusText.textContent = data.message + ' (' + data.environment + ')';
    activeModel.textContent = 'model: ' + data.model;
  } catch (err) {
    statusText.textContent = 'Status error: ' + err;
  }
}

async function loadModels() {
  try {
    const res = await fetch('/ai/models', { cache: 'no-store' });
    const data = await res.json();
    modelSelect.innerHTML = '';
    (data.models || []).forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      if (model === data.activeModel) option.selected = true;
      modelSelect.appendChild(option);
    });
    if (data.activeModel) {
      activeModel.textContent = 'model: ' + data.activeModel;
    }
  } catch (err) {
    statusText.textContent = 'Model list error: ' + err;
  }
}

async function setModel(model) {
  if (!model) return;
  try {
    const res = await fetch('/ai/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Model update failed');
    }
    await loadModels();
    await loadStatus();
  } catch (err) {
    statusText.textContent = 'Model update error: ' + err;
  }
}

async function runPrompt() {
  const text = prompt.value.trim();
  if (!text) {
    output.value = 'Enter a prompt first.';
    return;
  }
  output.value = 'Running prompt...';
  try {
    const res = await fetch('/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Prompt failed');
    }
    const data = await res.json();
    output.value = data.output || '(No output)';
  } catch (err) {
    output.value = 'Prompt error: ' + err;
  }
}

modelSelect.addEventListener('change', () => {
  if (modelSelect.value) {
    modelInput.value = '';
  }
});

document.getElementById('refreshStatus').addEventListener('click', async () => {
  await loadStatus();
});

document.getElementById('applyModel').addEventListener('click', async () => {
  const chosen = modelInput.value.trim() || modelSelect.value;
  await setModel(chosen);
});

document.getElementById('runPrompt').addEventListener('click', runPrompt);

document.getElementById('clearOutput').addEventListener('click', () => {
  output.value = '';
});

loadStatus();
loadModels();
</script>
</body>
</html>";
}
