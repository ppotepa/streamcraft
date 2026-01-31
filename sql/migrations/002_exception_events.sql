CREATE TABLE IF NOT EXISTS core_exception_events (
    id UUID PRIMARY KEY,
    utc_time TIMESTAMPTZ NOT NULL,
    handled BOOLEAN NOT NULL,
    severity TEXT NOT NULL,
    exception_type TEXT NOT NULL,
    message TEXT NOT NULL,
    stacktrace TEXT NULL,
    source TEXT NULL,
    bit_id TEXT NULL,
    correlation_id TEXT NULL,
    trace_id TEXT NULL,
    path TEXT NULL,
    method TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_core_exception_events_time ON core_exception_events (utc_time DESC);
CREATE INDEX IF NOT EXISTS idx_core_exception_events_severity ON core_exception_events (severity);
CREATE INDEX IF NOT EXISTS idx_core_exception_events_bit_id ON core_exception_events (bit_id);