namespace Core.Diagnostics.StartupChecks;

public sealed class BitsFolderStartupCheck : IStartupCheck
{
    public string Name => "BitsFolder";
    public bool IsCritical => true;

    public Task<StartupCheckResult> RunAsync(StartupCheckContext context, CancellationToken cancellationToken = default)
    {
        var bitsFolder = context.Configuration["StreamCraft:BitsFolder"] ?? "bits";
        var baseDir = AppContext.BaseDirectory;
        var fullPath = Path.IsPathRooted(bitsFolder)
            ? bitsFolder
            : Path.Combine(baseDir, bitsFolder);

        try
        {
            if (!Directory.Exists(fullPath))
            {
                Directory.CreateDirectory(fullPath);
            }

            var testFile = Path.Combine(fullPath, ".writecheck");
            File.WriteAllText(testFile, "ok");
            File.Delete(testFile);

            return Task.FromResult(StartupCheckResult.Ok(Name, "Bits folder accessible.", new Dictionary<string, string?>
            {
                ["Path"] = fullPath
            }));
        }
        catch (Exception ex)
        {
            return Task.FromResult(StartupCheckResult.Fail(Name, ex.Message, new Dictionary<string, string?>
            {
                ["Path"] = fullPath
            }));
        }
    }
}
