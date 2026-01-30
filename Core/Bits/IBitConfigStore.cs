namespace Core.Bits;

public interface IBitConfigStore
{
    bool Exists(string bitId);
    string? Read(string bitId);
    void Write(string bitId, string json);
}
