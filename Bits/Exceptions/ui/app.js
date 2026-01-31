const { h, render } = preact;
const { useEffect, useMemo, useState } = preactHooks;
const html = htm.bind(h);

const levelOrder = ['Verbose', 'Debug', 'Info', 'Warning', 'Error', 'Critical'];
const levelClasses = {
  Verbose: 'verbose',
  Debug: 'debug',
  Info: 'info',
  Warning: 'warning',
  Error: 'error',
  Critical: 'critical'
};

function normalizeLevel(value) {
  if (typeof value === 'string' && levelOrder.includes(value)) {
    return value;
  }
  return 'Info';
}

function formatTimestamp(value) {
  if (!value) return '?';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '?';
  return date.toLocaleString();
}

function resolveBasePath() {
  const path = window.location.pathname;
  if (path.includes('/ui/')) {
    return path.slice(0, path.indexOf('/ui/'));
  }
  if (path.endsWith('/ui')) {
    return path.slice(0, -3);
  }
  return '/logging';
}

function useEventStream() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const basePath = resolveBasePath();
    const source = new EventSource(`${basePath}/state/stream`);

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
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [bitFilter, setBitFilter] = useState('all');
  const [search, setSearch] = useState('');

  const counts = state?.levelCounts || {};
  const items = Array.isArray(state?.recent) ? state.recent : [];
  const bitOptions = useMemo(() => {
    const bits = new Set();
    items.forEach(entry => {
      const key = entry.bitId || entry.sourceContext;
      if (key) {
        bits.add(key);
      }
    });
    return Array.from(bits).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter(entry => {
      const level = normalizeLevel(entry.level);
      if (filter !== 'all' && level !== filter) {
        return false;
      }

      if (exceptionsOnly && !entry.isException) {
        return false;
      }

      if (bitFilter !== 'all') {
        const key = entry.bitId || entry.sourceContext;
        if (bitFilter === 'unknown') {
          if (key) {
            return false;
          }
        } else if (key !== bitFilter) {
          return false;
        }
      }

      if (!query) {
        return true;
      }
      const haystack = [
        entry.message,
        entry.exceptionType,
        entry.sourceContext,
        entry.bitId,
        entry.correlationId,
        level
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [items, filter, search, exceptionsOnly, bitFilter]);

  return html`
    <div>
      <div class="background"></div>
      <main class="shell">
        <header class="hero">
          <div>
            <p class="eyebrow">StreamCraft Logging</p>
            <h1>Logging</h1>
            <p class="subtitle">Exceptions, warnings, and diagnostic signals in one view.</p>
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
            <span>Exceptions</span>
            <strong>${state?.exceptionCount ?? 0}</strong>
          </div>
          <div class="stat-card">
            <span>Last Seen</span>
            <strong>${formatTimestamp(state?.lastSeenUtc)}</strong>
          </div>
          <div class="stat-card verbose">
            <span>Verbose</span>
            <strong>${counts.Verbose ?? 0}</strong>
          </div>
          <div class="stat-card debug">
            <span>Debug</span>
            <strong>${counts.Debug ?? 0}</strong>
          </div>
          <div class="stat-card info">
            <span>Info</span>
            <strong>${counts.Info ?? 0}</strong>
          </div>
          <div class="stat-card warning">
            <span>Warning</span>
            <strong>${counts.Warning ?? 0}</strong>
          </div>
          <div class="stat-card error">
            <span>Error</span>
            <strong>${counts.Error ?? 0}</strong>
          </div>
          <div class="stat-card critical">
            <span>Critical</span>
            <strong>${counts.Critical ?? 0}</strong>
          </div>
        </section>

        <section class="controls">
          <div class="filters">
            ${['all', ...levelOrder].map(item => html`
              <button
                class=${`filter ${filter === item ? 'active' : ''}`}
                data-filter=${item}
                onClick=${() => setFilter(item)}>
                ${item === 'all' ? 'All' : item}
              </button>
            `)}
            <button
              class=${`filter ${exceptionsOnly ? 'active' : ''}`}
              onClick=${() => setExceptionsOnly(!exceptionsOnly)}>
              Exceptions Only
            </button>
          </div>
          <div class="search">
            <input
              type="text"
              placeholder="Search messages, source, bit id?"
              value=${search}
              onInput=${event => setSearch(event.target.value)} />
          </div>
          <div class="select">
            <select value=${bitFilter} onChange=${event => setBitFilter(event.target.value)}>
              <option value="all">All Bits</option>
              <option value="unknown">Unknown Bit</option>
              ${bitOptions.map(bit => html`<option value=${bit}>${bit}</option>`)}
            </select>
          </div>
        </section>

        <section class="list">
          ${filtered.length === 0 ? html`
            <div class="empty">
              <h3>No log entries yet</h3>
              <p>Exceptions and warnings will appear here as soon as they are published.</p>
            </div>
          ` : filtered.map(entry => {
            const level = normalizeLevel(entry.level);
            return html`
              <article class=${`entry ${levelClasses[level] || ''}`}>
                <div class="entry-header">
                  <div class="entry-meta">
                    <span class="severity">${level}</span>
                    <span>${formatTimestamp(entry.timestampUtc)}</span>
                    <span>${entry.sourceContext || 'Unknown source'}</span>
                    <span>${entry.bitId ? `Bit: ${entry.bitId}` : 'Bit: ?'}</span>
                    ${entry.isException ? html`<span class="pill">Exception</span>` : null}
                  </div>
                  <div class="entry-message">${entry.message || 'No message provided.'}</div>
                </div>
                <div class="entry-details">
                  <div class="entry-line">${entry.exceptionType || 'No exception attached'}</div>
                  <div class="entry-line muted">
                    ${entry.correlationId ? `Correlation: ${entry.correlationId}` : 'Correlation: ?'}
                  </div>
                  <pre class="stack">${entry.stackTrace || 'No stack trace.'}</pre>
                  ${entry.properties && Object.keys(entry.properties).length > 0 ? html`
                    <div class="entry-context">
                      <div class="entry-line">Context</div>
                      <ul>
                        ${Object.entries(entry.properties).map(([key, value]) => html`
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
