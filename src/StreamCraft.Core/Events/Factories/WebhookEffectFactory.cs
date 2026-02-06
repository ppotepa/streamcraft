using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace StreamCraft.Core.Events.Factories;

public sealed class WebhookEffectFactory : IEventEffectFactory
{
    private readonly IHttpClientFactory? _httpClientFactory;
    private readonly ILogger<WebhookEffectFactory> _logger;

    public WebhookEffectFactory(IHttpClientFactory? httpClientFactory, ILogger<WebhookEffectFactory> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public string TypeName => "core.webhook";

    public IEffect? Create(EventEffectDefinition definition, IServiceProvider services)
    {
        if (definition == null)
        {
            return null;
        }

        var config = ParseConfiguration(definition.ConfigurationJson);
        if (config == null || string.IsNullOrWhiteSpace(config.Url))
        {
            _logger.LogWarning("Webhook effect {EffectId} missing URL or configuration; skipping.", definition.Id);
            return null;
        }

        HttpClient client = _httpClientFactory != null
            ? _httpClientFactory.CreateClient("event-effects")
            : new HttpClient();

        if (config.TimeoutSeconds.HasValue && config.TimeoutSeconds.Value > 0)
        {
            client.Timeout = TimeSpan.FromSeconds(config.TimeoutSeconds.Value);
        }

        return new WebhookEffect(definition.Id, client, config, _logger);
    }

    private static WebhookEffectConfiguration? ParseConfiguration(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<WebhookEffectConfiguration>(json, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private sealed class WebhookEffect : IEffect
    {
        private readonly string _id;
        private readonly HttpClient _client;
        private readonly WebhookEffectConfiguration _config;
        private readonly ILogger _logger;

        public WebhookEffect(string id, HttpClient client, WebhookEffectConfiguration config, ILogger logger)
        {
            _id = id;
            _client = client;
            _config = config;
            _logger = logger;
        }

        public string Id => _id;

        public async Task<EffectExecutionResult> ExecuteAsync(EventEnvelope envelope, CancellationToken cancellationToken = default)
        {
            try
            {
                using var request = BuildRequest(envelope);
                using var response = await _client.SendAsync(request, cancellationToken).ConfigureAwait(false);
                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
                    var message = $"Webhook returned {(int)response.StatusCode}: {body}";
                    _logger.LogWarning("Webhook effect {EffectId} failed: {Message}", _id, message);
                    return EffectExecutionResult.Failed(message, retrySuggested: _config.RetryOnFailure);
                }

                _logger.LogInformation("Webhook effect {EffectId} invoked {Url} successfully.", _id, _config.Url);
                return EffectExecutionResult.Completed();
            }
            catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Webhook effect {EffectId} exception.", _id);
                return EffectExecutionResult.Failed(ex.Message, ex, retrySuggested: _config.RetryOnFailure);
            }
        }

        private HttpRequestMessage BuildRequest(EventEnvelope envelope)
        {
            var method = string.IsNullOrWhiteSpace(_config.Method) ? HttpMethod.Post : new HttpMethod(_config.Method!);
            var request = new HttpRequestMessage(method, _config.Url);

            if (_config.Headers != null)
            {
                foreach (var header in _config.Headers)
                {
                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value))
                    {
                        if (request.Content == null)
                        {
                            request.Content = new StringContent(string.Empty);
                        }

                        request.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
                    }
                }
            }

            var body = BuildBody(envelope);
            request.Content = new StringContent(body, Encoding.UTF8, _config.ContentType ?? "application/json");
            return request;
        }

        private string BuildBody(EventEnvelope envelope)
        {
            if (!string.IsNullOrWhiteSpace(_config.BodyTemplate))
            {
                var replacements = BuildTemplateValues(envelope);
                var templated = _config.BodyTemplate;
                foreach (var kvp in replacements)
                {
                    templated = templated.Replace(kvp.Key, kvp.Value, StringComparison.OrdinalIgnoreCase);
                }

                return templated;
            }

            var payload = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
            {
                ["effectId"] = _id,
                ["messageType"] = envelope.MessageType.Id,
                ["capturedAtUtc"] = DateTime.UtcNow
            };

            if (_config.IncludePayload)
            {
                payload["payload"] = envelope.Payload;
            }

            if (_config.IncludeMetadata)
            {
                payload["metadata"] = new
                {
                    envelope.Metadata.Source,
                    envelope.Metadata.CorrelationId,
                    envelope.Metadata.MessageId,
                    envelope.Metadata.Timestamp
                };
            }

            if (_config.StaticPayload != null)
            {
                foreach (var kvp in _config.StaticPayload)
                {
                    payload[kvp.Key] = kvp.Value;
                }
            }

            return JsonSerializer.Serialize(payload, JsonOptions);
        }

        private Dictionary<string, string> BuildTemplateValues(EventEnvelope envelope)
        {
            var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["{{messageType}}"] = envelope.MessageType.Id,
                ["{{effectId}}"] = _id,
                ["{{timestamp}}"] = DateTime.UtcNow.ToString("O"),
                ["{{payloadJson}}"] = SerializePayload(envelope.Payload),
                ["{{metadataJson}}"] = JsonSerializer.Serialize(new
                {
                    envelope.Metadata.Source,
                    envelope.Metadata.CorrelationId,
                    envelope.Metadata.MessageId,
                    envelope.Metadata.Timestamp
                }, JsonOptions)
            };

            if (_config.StaticPayload != null)
            {
                values["{{staticPayloadJson}}"] = JsonSerializer.Serialize(_config.StaticPayload, JsonOptions);
            }

            return values;
        }

        private static string SerializePayload(object? payload)
        {
            if (payload == null)
            {
                return "null";
            }

            try
            {
                return JsonSerializer.Serialize(payload, JsonOptions);
            }
            catch
            {
                return JsonSerializer.Serialize(new { value = payload.ToString() }, JsonOptions);
            }
        }
    }

    private sealed class WebhookEffectConfiguration
    {
        public string? Url { get; init; }
        public string? Method { get; init; }
        public Dictionary<string, string>? Headers { get; init; }
        public string? ContentType { get; init; }
        public string? BodyTemplate { get; init; }
        public bool IncludePayload { get; init; } = true;
        public bool IncludeMetadata { get; init; } = true;
        public Dictionary<string, object?>? StaticPayload { get; init; }
        public bool RetryOnFailure { get; init; } = true;
        public int? TimeoutSeconds { get; init; }
    }
}
