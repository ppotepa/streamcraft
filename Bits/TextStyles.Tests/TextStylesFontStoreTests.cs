using System.Text;
using StreamCraft.Core.Data.DuckDb;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StreamCraft.Core.Media.Fonts;
using Xunit;

namespace StreamCraft.Bits.TextStyles.Tests;

public sealed class TextStylesFontStoreTests
{
    [Fact]
    public void UpsertFamilies_PersistsAndReads()
    {
        var tempPath = Path.Combine(Path.GetTempPath(), $"textstyles-{Guid.NewGuid():N}.duckdb");
        try
        {
            var factory = new DuckDbConnectionFactory(Options.Create(new DuckDbOptions { Path = tempPath }), NullLogger<DuckDbConnectionFactory>.Instance);
            var store = new TextStylesFontStore(factory);
            var family = new GoogleFontFamily(
                "Test Sans",
                "sans-serif",
                "v1",
                "2026-02-03",
                new[] { "regular", "700" },
                new[] { "latin" },
                new Dictionary<string, string> { ["regular"] = "https://example.com/font.ttf" }
            );

            store.UpsertFamilies(new[] { family });

            Assert.Equal(1, store.GetFamilyCount());
            var fetched = store.GetFamily("Test Sans");
            Assert.NotNull(fetched);
            Assert.Equal("Test Sans", fetched!.Family);
            Assert.Equal("sans-serif", fetched.Category);
            Assert.Contains("regular", fetched.Variants);
        }
        finally
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
        }
    }

    [Fact]
    public void UpsertFontFile_PersistsBlob()
    {
        var tempPath = Path.Combine(Path.GetTempPath(), $"textstyles-{Guid.NewGuid():N}.duckdb");
        try
        {
            var factory = new DuckDbConnectionFactory(Options.Create(new DuckDbOptions { Path = tempPath }), NullLogger<DuckDbConnectionFactory>.Instance);
            var store = new TextStylesFontStore(factory);
            var bytes = Encoding.UTF8.GetBytes("font-bytes");

            store.UpsertFontFile(new CachedFontFile("Test Sans", "regular", "https://example.com/font.ttf", "font/ttf", bytes));

            var fetched = store.GetFontFile("Test Sans", "regular");
            Assert.NotNull(fetched);
            Assert.Equal(bytes, fetched!.Bytes);
        }
        finally
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
        }
    }
}

public sealed class TextStylesFontServiceTests
{
    [Fact]
    public async Task RefreshCatalogAndDownloadFont()
    {
        var tempPath = Path.Combine(Path.GetTempPath(), $"textstyles-{Guid.NewGuid():N}.duckdb");
        try
        {
            var factory = new DuckDbConnectionFactory(Options.Create(new DuckDbOptions { Path = tempPath }), NullLogger<DuckDbConnectionFactory>.Instance);
            var store = new TextStylesFontStore(factory);
            var client = new FakeGoogleFontsClient();
            var service = new TextStylesFontService(store, client, NullLogger<TextStylesFontService>.Instance);

            var refreshed = await service.RefreshCatalogAsync(CancellationToken.None);
            Assert.Equal(1, refreshed);

            var file = await service.GetFontFileAsync("Test Sans", "regular", CancellationToken.None);
            Assert.NotNull(file);
            Assert.Equal("font/ttf", file!.ContentType);
            Assert.Equal(client.FontBytes, file.Bytes);
        }
        finally
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
        }
    }

    private sealed class FakeGoogleFontsClient : IGoogleFontsClient
    {
        public byte[] FontBytes { get; } = Encoding.UTF8.GetBytes("fake-font");

        public Task<IReadOnlyList<GoogleFontFamily>> FetchCatalogAsync(CancellationToken cancellationToken)
        {
            var family = new GoogleFontFamily(
                "Test Sans",
                "sans-serif",
                "v1",
                "2026-02-03",
                new[] { "regular" },
                new[] { "latin" },
                new Dictionary<string, string> { ["regular"] = "https://example.com/font.ttf" }
            );
            return Task.FromResult<IReadOnlyList<GoogleFontFamily>>(new[] { family });
        }

        public Task<(byte[] Bytes, string ContentType)> DownloadFontAsync(string url, CancellationToken cancellationToken)
        {
            return Task.FromResult<(byte[] Bytes, string ContentType)>((FontBytes, "font/ttf"));
        }
    }
}



