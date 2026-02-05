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
    statusDot.className = `status-dot${state ? ` ${state}` : ''}`;
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function loadStatus() {
    try {
        const res = await fetch('/ai/status', { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`Status request failed (${res.status})`);
        }
        const data = await res.json();
        const configured = Boolean(data.configured);
        statusTitle.textContent = configured ? 'AI ready' : 'AI not configured';
        statusMessage.textContent = data.message || 'No status message available.';
        envChip.textContent = `env: ${data.environment || '-'}`;
        modelChip.textContent = `model: ${data.model || '-'}`;
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
            throw new Error(`Model request failed (${res.status})`);
        }
        const data = await res.json();
        modelList.innerHTML = '';
        const models = data.models || [];
        if (!models.length) {
            modelList.innerHTML = "<div class='muted'>No models configured.</div>";
            return;
        }
        models.forEach((model) => {
            const row = document.createElement('div');
            row.className = `model-item${model === data.activeModel ? ' active' : ''}`;
            row.innerHTML = `<span>${model}</span><span class='tag'>${model === data.activeModel ? 'active' : 'available'}</span>`;
            modelList.appendChild(row);
        });
        if (data.activeModel) {
            modelChip.textContent = `model: ${data.activeModel}`;
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
