using System.Text;

namespace Bits.Sc2.Parsing;

/// <summary>
/// Parses StarCraft II lobby file to extract player battle tags and names.
/// </summary>
public static class LobbyFileParser
{
    private static readonly (int Off, int Len)[] LobbySpans =
    {
        (0x6E00, 0x100),
        (0x6E80, 0x100),
        (0x6F00, 0x100)
    };

    public record ParseResult(
        string Player1BattleTag,
        string Player1Name,
        string Player2BattleTag,
        string Player2Name);

    /// <summary>
    /// Parses the lobby file and extracts both players' information.
    /// Returns null if parsing fails or insufficient data is found.
    /// </summary>
    public static ParseResult? ParseLobbyFile(string lobbyFilePath)
    {
        if (!File.Exists(lobbyFilePath))
        {
            return null;
        }

        try
        {
            using var fs = new FileStream(lobbyFilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            return ParseLobbyFile(fs);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Parses the lobby file from an open stream.
    /// </summary>
    public static ParseResult? ParseLobbyFile(FileStream fs)
    {
        var tokens = new List<Token>();

        foreach (var (off, len) in LobbySpans)
        {
            if (off >= fs.Length)
            {
                continue;
            }

            var toRead = (int)Math.Min(len, fs.Length - off);
            var buf = ReadExactly(fs, off, toRead);
            tokens.AddRange(ScanNameHashTokens(buf, off));
        }

        tokens = tokens
            .DistinctBy(t => (t.Offset, t.Length, t.Text))
            .OrderBy(t => t.Offset)
            .ToList();

        if (tokens.Count < 6)
        {
            return null;
        }

        var startIndex = Math.Max(0, tokens.Count - 6);
        var lastSix = tokens.Skip(startIndex).Take(6).ToList();

        if (lastSix.Count < 6)
        {
            return null;
        }

        var p1NameTag = lastSix[0].Text;
        var p1BattleTag = lastSix[2].Text;
        var p2NameTag = lastSix[3].Text;
        var p2BattleTag = lastSix[5].Text;

        var p1Name = ExtractName(p1NameTag);
        var p2Name = ExtractName(p2NameTag);

        return new ParseResult(p1BattleTag, p1Name, p2BattleTag, p2Name);
    }

    private readonly record struct Token(long Offset, int Length, string Text);

    private static byte[] ReadExactly(FileStream fs, long offset, int length)
    {
        fs.Seek(offset, SeekOrigin.Begin);
        var buf = new byte[length];

        var read = 0;
        while (read < length)
        {
            var n = fs.Read(buf, read, length - read);
            if (n <= 0)
            {
                break;
            }

            read += n;
        }

        if (read != length)
        {
            Array.Resize(ref buf, read);
        }

        return buf;
    }

    private static List<Token> ScanNameHashTokens(ReadOnlySpan<byte> buf, long baseOffset, int maxDigits = 6, int maxName = 64)
    {
        static bool IsNameByte(byte b)
        {
            if (b >= 0x80) return true;
            if (b < 0x20 || b == 0x7F) return false;
            var c = (char)b;
            return char.IsLetterOrDigit(c) || c is '_' or '-' or '.';
        }

        var res = new List<Token>();

        for (var i = 0; i < buf.Length; i++)
        {
            if (buf[i] != (byte)'#') continue;

            var j = i + 1;
            if (j >= buf.Length || buf[j] < '0' || buf[j] > '9') continue;

            var k = j;
            while (k < buf.Length && (k - j) < maxDigits && buf[k] >= '0' && buf[k] <= '9') k++;

            var digitCount = k - j;
            if (digitCount < 3) continue;

            var s = i - 1;
            while (s >= 0 && (i - s) <= maxName && IsNameByte(buf[s])) s--;
            var start = s + 1;
            var end = k;

            var len = end - start;
            if (len < 3) continue;

            var slice = buf.Slice(start, len);
            var text = DecodeUtf8StrictOrLatin1(slice);
            if (!LooksLikeNameHash(text)) continue;

            res.Add(new Token(baseOffset + start, len, text));
        }

        return res;
    }

    private static string DecodeUtf8StrictOrLatin1(ReadOnlySpan<byte> slice)
    {
        try
        {
            var utf8 = new UTF8Encoding(false, true);
            return utf8.GetString(slice);
        }
        catch
        {
            return Encoding.Latin1.GetString(slice);
        }
    }

    private static bool LooksLikeNameHash(string s)
    {
        var idx = s.LastIndexOf('#');
        if (idx <= 0 || idx >= s.Length - 1) return false;

        for (var i = idx + 1; i < s.Length; i++)
        {
            if (s[i] < '0' || s[i] > '9') return false;
        }

        return true;
    }

    private static string ExtractName(string tag)
    {
        if (string.IsNullOrWhiteSpace(tag))
        {
            return string.Empty;
        }

        var hashIndex = tag.IndexOf('#');
        if (hashIndex <= 0)
        {
            return tag;
        }

        return tag[..hashIndex];
    }
}
