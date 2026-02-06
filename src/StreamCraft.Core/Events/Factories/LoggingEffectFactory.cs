using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace StreamCraft.Core.Events.Factories;

public sealed class LoggingEffectFactory : IEventEffectFactory
{
    private readonly ILoggerFactory _loggerFactory;

    public LoggingEffectFactory(ILoggerFactory loggerFactory)
    {
        _loggerFactory = loggerFactory;
    }

    public string TypeName => "core.logging";

    public IEffect? Create(EventEffectDefinition definition, IServiceProvider services)
    {
        if (string.IsNullOrWhiteSpace(definition?.Id))
        {
            return null;
        }

        var config = ParseConfiguration(definition.ConfigurationJson);
        var logger = _loggerFactory.CreateLogger($"EventEffect:{definition.Id}");
        return new LoggingEffect(definition.Id, logger, config);
    }

    private static LoggingEffectConfiguration ParseConfiguration(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return LoggingEffectConfiguration.Default;
        }

        try
        {
            var config = JsonSerializer.Deserialize<LoggingEffectConfiguration>(json, JsonSerializerOptions);
            return config ?? LoggingEffectConfiguration.Default;
        }
        catch (JsonException)
        {
            return LoggingEffectConfiguration.Default;
        }
    }

    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private sealed class LoggingEffect : IEffect
    {
        private readonly string _id;
        private readonly ILogger _logger;
        private readonly LoggingEffectConfiguration _config;

        public LoggingEffect(string id, ILogger logger, LoggingEffectConfiguration config)
        {
            _id = id;
            _logger = logger;
            _config = config;
        }

        public string Id => _id;

        public Task<EffectExecutionResult> ExecuteAsync(EventEnvelope envelope, CancellationToken cancellationToken = default)
        {
            var level = _config.ParsedLevel;
            var message = _config.Message ?? "Event effect executed.";
            var metadata = envelope.Metadata;

            var logMessage = $"{message} (Effect='{_id}', MessageType='{envelope.MessageType}', Source='{metadata.Source ?? "unknown"}')";

            if (_config.Properties is { Count: > 0 })
            {
                foreach (var kvp in _config.Properties)
                {
                    logMessage += $", {kvp.Key}='{kvp.Value}'";
                }
            }

            switch (level)
            {
                case LogLevel.Trace:
                    _logger.LogTrace(logMessage);
                    break;
                case LogLevel.Debug:
                    _logger.LogDebug(logMessage);
                    break;
                case LogLevel.Information:
                    _logger.LogInformation(logMessage);
                    break;
                case LogLevel.Warning:
                    _logger.LogWarning(logMessage);
                    break;
                case LogLevel.Error:
                    _logger.LogError(logMessage);
                    break;
                case LogLevel.Critical:
                    _logger.LogCritical(logMessage);
                    break;
                default:
                    _logger.LogInformation(logMessage);
                    break;
            }

            return Task.FromResult(EffectExecutionResult.Completed());
        }
    }

    private sealed record LoggingEffectConfiguration
    {
        public string? Message { get; init; }
        public string? Level { get; init; }
        public Dictionary<string, string>? Properties { get; init; }

        public LogLevel ParsedLevel => ParseLogLevel(Level);

        public static LoggingEffectConfiguration Default { get; } = new() { Level = nameof(LogLevel.Information) };

        private static LogLevel ParseLogLevel(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return LogLevel.Information;
            }

            if (Enum.TryParse<LogLevel>(value, true, out var parsed))
            {
                return parsed;
            }

            return LogLevel.Information;
        }
    }
}
