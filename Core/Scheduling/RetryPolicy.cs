namespace Core.Scheduling;

public static class RetryPolicy
{
    public static async Task ExecuteAsync(
        Func<CancellationToken, Task> action,
        int maxAttempts = 3,
        TimeSpan? initialDelay = null,
        double backoffFactor = 2.0,
        TimeSpan? maxDelay = null,
        CancellationToken cancellationToken = default)
    {
        if (action == null) throw new ArgumentNullException(nameof(action));
        if (maxAttempts <= 0) throw new ArgumentOutOfRangeException(nameof(maxAttempts));
        if (backoffFactor < 1.0) throw new ArgumentOutOfRangeException(nameof(backoffFactor));

        var delay = initialDelay ?? TimeSpan.FromSeconds(1);
        var cap = maxDelay ?? TimeSpan.FromSeconds(30);

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await action(cancellationToken).ConfigureAwait(false);
                return;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch when (attempt < maxAttempts)
            {
                var jitterMs = Random.Shared.Next(0, 250);
                var nextDelay = TimeSpan.FromMilliseconds(Math.Min(delay.TotalMilliseconds * backoffFactor, cap.TotalMilliseconds));
                await Task.Delay(delay + TimeSpan.FromMilliseconds(jitterMs), cancellationToken).ConfigureAwait(false);
                delay = nextDelay;
            }
        }
    }
}
