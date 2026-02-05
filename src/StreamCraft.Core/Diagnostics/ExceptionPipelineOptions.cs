using Microsoft.Extensions.Options;

namespace StreamCraft.Core.Diagnostics;

public sealed class ExceptionPipelineOptions
{
    public int MaxRecent { get; set; } = 200;
    public bool CaptureOperationCanceled { get; set; } = true;
}



