# EventPlayground Bit

Mock event generator for testing StreamCraft's event/trigger/effect framework.

## Features

- **Manual Event Emission**: POST endpoint to emit donation/chat events on demand
- **Development Simulation**: Background loop that randomly generates events every 3-9 seconds
- **Event Types**: Donation and chat message events with realistic payloads

## Routes

### GET `/eventplayground`

Status endpoint showing simulation state.

**Response**:
```json
{
  "status": "running",
  "simulation": {
    "running": true,
    "eventsEmitted": 42
  }
}
```

### POST `/eventplayground/emit`

Manually emit test events.

**Request Body**:
```json
{
  "type": "donation",           // "donation" or "chat"
  "count": 1,                  // optional, default 1
  "payload": {
    "Amount": 100.0,
    "Currency": "USD",
    "FromUser": "TestUser",
    "Message": "Great stream!",
    "Timestamp": "2025-01-15T10:00:00Z"
  }
}
```

**Response**:
```json
{
  "status": "emitted",
  "type": "donation",
  "count": 1
}
```

## Event Types

### DonationEvent

```csharp
public record DonationEvent(
    decimal Amount,
    string Currency,
    string FromUser,
    string Message,
    DateTime Timestamp
);
```

**Example Payload**:
```json
{
  "Amount": 50.0,
  "Currency": "USD",
  "FromUser": "Alice",
  "Message": "Love the content!",
  "Timestamp": "2025-01-15T12:00:00Z"
}
```

### ChatMessageEvent

```csharp
public record ChatMessageEvent(
    string User,
    string Text,
    string Channel,
    DateTime Timestamp
);
```

**Example Payload**:
```json
{
  "User": "Bob",
  "Text": "Hello chat!",
  "Channel": "main",
  "Timestamp": "2025-01-15T12:00:00Z"
}
```

## Registered Components

The bit registers the following components on initialization:

### Producers
- `FakeDonationProducer` (category: `donation`, name: `FakeDonationProducer`)
- `FakeChatProducer` (category: `chat`, name: `FakeChatProducer`)

### Triggers
- `DonationThresholdTrigger`: Fires when donation amount >= threshold
- `ChatKeywordTrigger`: Fires when chat text contains keyword

### Effects
- `ConfettiEffect`: Visual overlay effect
- `LogEffect<DonationEvent>`: Logs donation events
- `LogEffect<ChatMessageEvent>`: Logs chat events
- `OverlayChatEffect`: Displays chat message on overlay

## Development Simulation

When `ASPNETCORE_ENVIRONMENT=Development`, the bit automatically starts a background simulation:

1. Waits 3-9 seconds (random)
2. Emits either:
   - **DonationEvent**: Random amount 10-500 USD from random user
   - **ChatMessageEvent**: Random message from random user
3. Repeats until application shutdown

**Enable Simulation**:
```powershell
# PowerShell
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run --project src/StreamCraft.App

# Bash
ASPNETCORE_ENVIRONMENT=Development dotnet run --project src/StreamCraft.App
```

**Monitor Events**:
```bash
# Watch diagnostics
curl http://localhost:5000/events/diagnostics

# Check simulation status
curl http://localhost:5000/eventplayground
```

## Usage Examples

### Test Big Donation Alert

```bash
curl -X POST http://localhost:5000/eventplayground/emit \
  -H "Content-Type: application/json" \
  -d '{
    "type": "donation",
    "payload": {
      "Amount": 500.0,
      "Currency": "USD",
      "FromUser": "MrBeast",
      "Message": "Amazing stream!",
      "Timestamp": "2025-01-15T18:00:00Z"
    }
  }'
```

### Spam Chat Messages

```bash
curl -X POST http://localhost:5000/eventplayground/emit \
  -H "Content-Type: application/json" \
  -d '{
    "type": "chat",
    "count": 10,
    "payload": {
      "User": "SpamBot",
      "Text": "Kappa Kappa Kappa",
      "Channel": "main",
      "Timestamp": "2025-01-15T18:00:00Z"
    }
  }'
```

### Test Trigger Flow

1. **Create effect**:
   ```bash
   curl -X POST http://localhost:5000/events/effects \
     -H "Content-Type: application/json" \
     -d '{
       "id": "test-log",
       "type": "LogEffect",
       "description": "Test logger",
       "config": "{}",
       "isEnabled": true
     }'
   ```

2. **Create trigger**:
   ```bash
   curl -X POST http://localhost:5000/events/triggers \
     -H "Content-Type: application/json" \
     -d '{
       "id": "test-trigger",
       "category": "donation",
       "name": "FakeDonationProducer",
       "type": "DonationThresholdTrigger",
       "effectIds": ["test-log"],
       "filterExpression": "{}",
       "description": "Test",
       "isEnabled": true
     }'
   ```

3. **Emit event**:
   ```bash
   curl -X POST http://localhost:5000/eventplayground/emit \
     -H "Content-Type: application/json" \
     -d '{
       "type": "donation",
       "payload": {
         "Amount": 25.0,
         "Currency": "USD",
         "FromUser": "Tester",
         "Message": "Testing...",
         "Timestamp": "2025-01-15T18:00:00Z"
       }
     }'
   ```

4. **Check logs** for `[LogEffect] Executing effect for event type: DonationEvent`

## Configuration

No configuration needed. The bit is self-contained and registers all components on startup.

## Troubleshooting

**Simulation not running**:
- Check `ASPNETCORE_ENVIRONMENT` is set to `Development`
- Verify bit is loaded: `curl http://localhost:5000/eventplayground` should return `"status": "running"`

**Events not triggering effects**:
- Verify event system is enabled: `appsettings.json` → `StreamCraft:Features:EventSystem:Enabled: true`
- Check diagnostics: `curl http://localhost:5000/events/diagnostics`
- Ensure trigger `category` and `name` match producer registration

**Manual emit fails**:
- Validate JSON payload matches event record structure (exact property names)
- Check response for error messages
- Verify bit is initialized: logs should contain `[EventPlayground] Registered...`

## See Also

- [Event/Trigger/Effect Framework Documentation](../../../docs/architecture/event-trigger-effect-framework.md)
- [Events API Documentation](../../../docs/architecture/event-trigger-effect-framework.md#api-documentation)
- [Console UI Testing Guide](../../../docs/architecture/event-trigger-effect-framework.md#testing-workflow)
