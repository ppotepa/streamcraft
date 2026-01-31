using Microsoft.Extensions.Options;

namespace Core.Diagnostics;

public sealed class ExceptionPipelineOptions
{
    public int MaxRecent { get; set; } = 200;
    public bool CaptureOperationCanceled { get; set; } = true;
}
