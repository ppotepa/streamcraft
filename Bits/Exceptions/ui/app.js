const { h, render } = preact;
const { useEffect, useMemo, useState } = preactHooks;
const html = htm.bind(h);

const severityOrder = ['Info', 'Warning', 'Error', 'Critical'];
const severityClasses = {
  Info: 'info',
  Warning: 'warning',
  Error: 'error',
  Critical: 'critical'
};
const severityLabels = {
  0: 'Info',
  1: 'Warning',
  2: 'Error',
  3: 'Critical'
};

function normalizeSeverity(value) {
  if (typeof value === 'number') {
    return severityLabels[value] || 'Error';
  }

  if (typeof value === 'string') {
    if (severityLabels[value]) {
      return severityLabels[value];
    }
    if (severityOrder.includes(value)) {
      return value;
    }
  }

  return 'Error';
}

function formatTimestamp(value) {
  if (!value) return '?';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '?';
  return date.toLocaleString();
}

function useEventStream() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource('/exceptions/state/stream');

    source.onopen = () => setConnected(true);
    source.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        setState(payload);
      } catch (err) {
        console.error('Failed to parse exception state', err);
      }
    };
    source.onerror = () => setConnected(false);

    return () => {
      source.close();
    };
  }, []);

  return { state, connected };
}

function App() {
  const { state, connected } = useEventStream();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const counts = state?.severityCounts || {};
  const items = Array.isArray(state?.recent) ? state.recent : [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter(entry => {
      const severity = normalizeSeverity(entry.severity);
      if (filter !== 'all' && severity !== filter) {
        return false;
      }

      if (!query) return true;
      const haystack = [
        entry.message,
        entry.exceptionType,
        entry.source,
        entry.bitId,
        entry.correlationId,
        severity
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [items, filter, search]);

  return html`
    <div>
      <div class="background"></div>
      <main class="shell">
        <header class="hero">
          <div>
            <p class="eyebrow">StreamCraft Diagnostics</p>
            <h1>Exceptions</h1>
            <p class="subtitle">Real-time exception stream with severity filtering and quick context.</p>
          </div>
          <div class=${`status ${connected ? 'connected' : ''}`}>
            <span class="dot"></span>
            <span class="label">${connected ? 'Live' : 'Disconnected'}</span>
          </div>
        </header>

        <section class="stats">
          <div class="stat-card">
            <span>Total</span>
            <strong>${state?.totalCount ?? 0}</strong>
          </div>
          <div class="stat-card">
            <span>Last Seen</span>
            <strong>${formatTimestamp(state?.lastSeenUtc)}</strong>
          </div>
          <div class="stat-card info">
            <span>Info</span>
            <strong>${counts.Info ?? counts[0] ?? 0}</strong>
          </div>
          <div class="stat-card warning">
            <span>Warning</span>
            <strong>${counts.Warning ?? counts[1] ?? 0}</strong>
          </div>
          <div class="stat-card error">
            <span>Error</span>
            <strong>${counts.Error ?? counts[2] ?? 0}</strong>
          </div>
          <div class="stat-card critical">
            <span>Critical</span>
            <strong>${counts.Critical ?? counts[3] ?? 0}</strong>
          </div>
        </section>

        <section class="controls">
          <div class="filters">
            ${['all', ...severityOrder].map(item => html`
              <button
                class=${`filter ${filter === item ? 'active' : ''}`}
                data-filter=${item}
                onClick=${() => setFilter(item)}>
                ${item === 'all' ? 'All' : item}
              </button>
            `)}
          </div>
          <div class="search">
            <input
              type="text"
              placeholder="Search messages, source, bit id?"
              value=${search}
              onInput=${event => setSearch(event.target.value)} />
          </div>
        </section>

        <section class="list">
          ${filtered.length === 0 ? html`
            <div class="empty">
              <h3>No exceptions yet</h3>
              <p>Exceptions will appear here as soon as they are published.</p>
            </div>
          ` : filtered.map(entry => {
            const severity = normalizeSeverity(entry.severity);
            return html`
              <article class=${`entry ${severityClasses[severity] || ''}`}>
                <div class="entry-header">
                  <div class="entry-meta">
                    <span class="severity">${severity}</span>
                    <span>${formatTimestamp(entry.timestampUtc)}</span>
                    <span>${entry.source || 'Unknown source'}</span>
                    <span>${entry.bitId ? `Bit: ${entry.bitId}` : 'Bit: ?'}</span>
                  </div>
                  <div class="entry-message">${entry.message || 'No message provided.'}</div>
                </div>
                <div class="entry-details">
                  <div class="entry-line">${entry.exceptionType || 'Exception type unavailable'}</div>
                  <div class="entry-line muted">
                    ${entry.correlationId ? `Correlation: ${entry.correlationId}` : 'Correlation: ?'}
                  </div>
                  <pre class="stack">${entry.stackTrace || 'No stack trace.'}</pre>
                  ${entry.context && Object.keys(entry.context).length > 0 ? html`
                    <div class="entry-context">
                      <div class="entry-line">Context</div>
                      <ul>
                        ${Object.entries(entry.context).map(([key, value]) => html`
                          <li>${key}: ${value ?? 'null'}</li>
                        `)}
                      </ul>
                    </div>
                  ` : null}
                </div>
              </article>
            `;
          })}
        </section>
      </main>
    </div>
  `;
}

render(h(App, {}), document.getElementById('app'));
