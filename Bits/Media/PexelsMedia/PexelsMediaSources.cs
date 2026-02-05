using StreamCraft.Core.DataSources;

namespace StreamCraft.Bits.PexelsMedia;

public sealed class PexelsImagesSource : IMediaDataSource
{
    public string Id => "pexels-images";
    public string Name => "Pexels Images (Cached)";
    public string Description => "Cached Pexels images served from local storage.";
    public string Kind => "media";
    public string? CategoryId => "media-pexels-images";
    public string BaseUrl => "/localmedia";
    public string? DocsUrl => "https://www.pexels.com/api/";
    public IReadOnlyList<ApiEndpointSpec> Endpoints => new[]
    {
        new ApiEndpointSpec("Random Image", "/images/random", "GET", "Get a random cached image."),
        new ApiEndpointSpec("Random Picture", "/pictures/random", "GET", "Get a random cached image (alias).")
    };
}

public sealed class PexelsVideosSource : IMediaDataSource
{
    public string Id => "pexels-videos";
    public string Name => "Pexels Videos (Cached)";
    public string Description => "Cached Pexels videos served from local storage.";
    public string Kind => "media";
    public string? CategoryId => "media-pexels-videos";
    public string BaseUrl => "/localmedia";
    public string? DocsUrl => "https://www.pexels.com/api/";
    public IReadOnlyList<ApiEndpointSpec> Endpoints => new[]
    {
        new ApiEndpointSpec("Random Video", "/video/random", "GET", "Get a random cached video."),
        new ApiEndpointSpec("Random Video (Plural)", "/videos/random", "GET", "Get a random cached video.")
    };
}




