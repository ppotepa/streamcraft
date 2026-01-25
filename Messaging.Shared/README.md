# StreamCraft.Messaging.Shared

This library contains shared event types and payload models that can be reused across multiple bits.

## Purpose

- **Common Event Types**: Universal events like `UserIdentified`, `MatchStarted`, `ToolConnected`
- **Shared Payloads**: Reusable data structures for common scenarios
- **Decoupling**: Allows bits to communicate without direct dependencies
- **Type Safety**: Strongly-typed events and payloads

## Usage

### In Your Bit

1. Reference `StreamCraft.Messaging.Shared` in your bit project
2. Use `CommonEventType` for universal events
3. Define bit-specific events in your own enum
4. Use shared payloads or create custom ones

### Example

```csharp
// Use common events
MessageBus.Publish(CommonEventType.UserIdentified, new UserIdentifiedPayload(
    UserId: "Player#1234",
    UserName: "Player"
));

// Bit-specific events
public enum Sc2MessageType
{
    LobbyFileParsed,  // Sc2-specific
    MetricDataReceived
}

MessageBus.Publish(Sc2MessageType.LobbyFileParsed, lobbyData);
```

## Event Naming Convention

Common events use the format: `Common.{Category}.{EventName}`
- Example: `Common.User.UserIdentified`
- Example: `Common.Match.MatchStarted`

Bit-specific events: `{BitName}.{Category}.{EventName}`
- Example: `Sc2.Lobby.Parsed`
- Example: `Lol.Champion.Selected`

## Design Decisions

### Why Enums?

- **Type Safety**: Compile-time checking prevents typos
- **IntelliSense**: IDE support for discovering available events
- **Refactoring**: Safe renames across the codebase
- **Performance**: No string allocations or comparisons

### Why Not Strings?

While strings offer flexibility, they:
- Lack compile-time validation
- Are error-prone (typos)
- Don't support IDE navigation
- Make refactoring difficult

### Hybrid Approach

The `IMessageType` interface allows:
- Enums for type safety within bits
- String representations for cross-bit communication
- Extension methods for metadata (category, full name)
