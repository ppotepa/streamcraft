namespace Core.Designer.Layouts;

public sealed class UnsupportedSchemaVersionException : Exception
{
    public UnsupportedSchemaVersionException(string layoutId, int schemaVersion, int supportedVersion)
        : base($"Layout '{layoutId}' uses schema version {schemaVersion}, but supported version is {supportedVersion}.")
    {
        LayoutId = layoutId;
        SchemaVersion = schemaVersion;
        SupportedVersion = supportedVersion;
    }

    public string LayoutId { get; }
    public int SchemaVersion { get; }
    public int SupportedVersion { get; }
}
