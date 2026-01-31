INSERT INTO core_exception_events
(id, utc_time, handled, severity, exception_type, message, stacktrace, source, bit_id, correlation_id, trace_id, path, method)
VALUES
(@id, @utc, @handled, @severity, @type, @message, @stack, @source, @bit, @correlation, @trace, @path, @method);