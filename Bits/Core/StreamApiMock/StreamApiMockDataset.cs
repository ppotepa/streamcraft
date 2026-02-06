using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace StreamCraft.Bits.StreamApiMock;

public sealed class StreamApiMockDataset
{
    private readonly string[] _chatMessages;
    private readonly string[] _usernames =
    {
        "PixelPilot",
        "LunarWisp",
        "CritterCore",
        "NebulaKnight",
        "EchoFrost",
        "SolarRogue",
        "CobaltCaster",
        "DeltaFox",
        "MythicMara",
        "VibeMage",
        "JupiterJet",
        "ChromaDrift",
        "AeroPulse",
        "RustRunner",
        "CyberLily",
        "QuartzBlade"
    };

    private readonly string[] _channelNames =
    {
        "ContosoLive",
        "NorthwindArena",
        "TailspinGaming",
        "AdventureWorksHQ",
        "FabrikamShow",
        "BlueYonderBase",
        "WingtipStreams",
        "LucerneLabs",
        "LITWCraft",
        "CohoCollective"
    };

    private readonly string[] _games =
    {
        "Fortnite",
        "VALORANT",
        "League of Legends",
        "Minecraft",
        "Just Chatting",
        "Baldur's Gate 3",
        "Apex Legends",
        "Palworld",
        "Rust",
        "Stardew Valley"
    };

    private readonly string[] _moderationReasons =
    {
        "Spam",
        "Harassment",
        "Spoilers",
        "Self-promo",
        "Link dumping",
        "All caps",
        "Off-topic",
        "Backseat gaming"
    };

    private StreamApiMockDataset(string[] chatMessages)
    {
        _chatMessages = chatMessages.Length > 0 ? chatMessages : DefaultMessages;
    }

    public static StreamApiMockDataset Load(string bitDirectory)
    {
        try
        {
            var dataPath = Path.Combine(bitDirectory, "data", "messages.txt");
            if (File.Exists(dataPath))
            {
                var lines = File.ReadAllLines(dataPath)
                    .Select(line => line?.Trim())
                    .Where(line => !string.IsNullOrWhiteSpace(line))
                    .Take(10_000)
                    .ToArray()!;
                if (lines.Length > 0)
                {
                    return new StreamApiMockDataset(lines);
                }
            }
        }
        catch
        {
        }

        return new StreamApiMockDataset(DefaultMessages);
    }

    public string NextChatMessage(Random random) => _chatMessages[random.Next(_chatMessages.Length)];
    public string NextUsername(Random random) => _usernames[random.Next(_usernames.Length)];
    public string NextChannel(Random random) => _channelNames[random.Next(_channelNames.Length)];
    public string NextGame(Random random) => _games[random.Next(_games.Length)];
    public string NextModerationReason(Random random) => _moderationReasons[random.Next(_moderationReasons.Length)];

    public int NextViewerCount(Random random, int min = 25, int max = 7500) => random.Next(min, max);
    public decimal NextAmount(Random random, decimal min = 1, decimal max = 1000) => Math.Round(min + (decimal)random.NextDouble() * (max - min), 2);

    public string NextUserId(Random random)
    {
        return $"user_{random.Next(100000, 999999)}";
    }

    public string NextChannelId(Random random)
    {
        return $"ch_{random.Next(1000, 9999)}";
    }

    private static readonly string[] DefaultMessages =
    {
        "Let's gooooo!",
        "This boss fight is wild",
        "Donating because this run is insane",
        "Sending love from the EU",
        "Reminder to hydrate!",
        "Chat behaving tonight?",
        "Streamer cracked confirmed",
        "Queue me up coach",
        "Music choice is immaculate",
        "We need more emotes like this",
        "Had to drop a prime for this",
        "First time catching live!",
        "BRB grabbing snacks",
        "This overlay goes hard",
        "That clutch deserves a cheer",
        "Team Contoso for life",
        "Redeeming channel points like crazy",
        "Mods you seeing this?",
        "Production value unmatched",
        "Streamer deserves all the hype"
    };
}
