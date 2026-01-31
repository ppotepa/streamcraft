using System.Threading.Channels;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Hosting;

namespace Core.Diagnostics;

public sealed class ExceptionPipeline : IExceptionPipeline, IHostedService, IDisposable
{
    private readonly IEnumerable<IExceptionSink> _sinks;
    private readonly IEnumerable<IExceptionFilter> _filters;
    private readonly IEnumerable<IExceptionEnricher> _enrichers;
    private readonly ILogger<ExceptionPipeline> _logger;
    private readonly ExceptionPipelineOptions _options;
    private readonly Channel<ExceptionNotice> _queue;
    private readonly CancellationTokenSource _cts = new();
    private Task? _processor;

    public ExceptionPipeline(
        IEnumerable<IExceptionSink> sinks,
        IEnumerable<IExceptionFilter> filters,
        IEnumerable<IExceptionEnricher> enrichers,
        IOptions<ExceptionPipelineOptions> options,
        ILogger<ExceptionPipeline> logger)
    {
        _sinks = sinks ?? Array.Empty<IExceptionSink>();
        _filters = filters ?? Array.Empty<IExceptionFilter>();
        _enrichers = enrichers ?? Array.Empty<IExceptionEnricher>();
        _options = options?.Value ?? new ExceptionPipelineOptions();
        _logger = logger;
        _queue = Channel.CreateUnbounded<ExceptionNotice>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _processor ??= Task.Run(ProcessAsync, _cts.Token);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _queue.Writer.TryComplete();
        _cts.Cancel();
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _queue.Writer.TryComplete();
        _cts.Cancel();
        try
        {
            _processor?.Wait(TimeSpan.FromSeconds(2));
        }
        catch
        {
            // ignore
        }
        finally
        {
            _cts.Dispose();
        }
    }

    public void Report(ExceptionNotice notice)
    {
        if (!_queue.Writer.TryWrite(notice))
        {
            _logger.LogWarning("Exception pipeline queue is closed. Dropping exception {ExceptionType}.", notice.ExceptionType);
        }
    }

    private async Task ProcessAsync()
    {
        try
        {
            while (await _queue.Reader.WaitToReadAsync(_cts.Token))
            {
                while (_queue.Reader.TryRead(out var notice))
                {
                    if (!_options.CaptureOperationCanceled && notice.ExceptionType == typeof(OperationCanceledException).FullName)
                    {
                        continue;
                    }

                    foreach (var enricher in _enrichers)
                    {
                        try
                        {
                            notice = enricher.Enrich(notice);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogDebug(ex, "Exception enricher failed.");
                        }
                    }

                    var allow = true;
                    foreach (var filter in _filters)
                    {
                        try
                        {
                            if (!filter.ShouldStore(notice))
                            {
                                allow = false;
                                break;
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogDebug(ex, "Exception filter failed.");
                        }
                    }

                    if (!allow)
                    {
                        continue;
                    }

                    foreach (var sink in _sinks)
                    {
                        try
                        {
                            await sink.WriteAsync(notice, _cts.Token).ConfigureAwait(false);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogDebug(ex, "Exception sink failed.");
                        }
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            // shutdown
        }
    }
}
