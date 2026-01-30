using Bits.Sc2.Messages;
using Bits.Sc2.Panels;
using Core.Messaging;
using Core.Runners;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Serilog;

namespace Bits.Sc2.Runners;

/// <summary>
/// Runner that fetches ISS position and crew data, publishing updates via message bus.
/// </summary>
public class ISSPanelRunner : Runner<ISSPanel, ISSPanelState>
{
    private readonly TimeSpan _positionPollInterval = TimeSpan.FromSeconds(10);
    private readonly TimeSpan _crewPollInterval = TimeSpan.FromSeconds(60);
    private readonly IMessageBus _messageBus;
    private readonly HttpClient _httpClient;
    private readonly ILogger _logger;
    private DateTime _lastCrewUpdate = DateTime.MinValue;

    public ISSPanelRunner(IMessageBus messageBus, HttpClient httpClient, ILogger logger)
    {
        _messageBus = messageBus;
        _httpClient = httpClient;
        _logger = logger;
    }

    protected override async Task RunAsync(CancellationToken cancellationToken)
    {
        _logger.Information("ISS Panel Runner starting.");

        // Initial fetch
        await FetchISSPositionAsync(cancellationToken);
        await FetchISSCrewAsync(cancellationToken);

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                // Fetch position every 10 seconds
                await FetchISSPositionAsync(cancellationToken);

                // Fetch crew every 60 seconds
                if ((DateTime.UtcNow - _lastCrewUpdate) >= _crewPollInterval)
                {
                    await FetchISSCrewAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                // Log but keep runner alive
                _logger.Error(ex, "ISS Panel Runner error.");
            }

            try
            {
                await Task.Delay(_positionPollInterval, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task FetchISSPositionAsync(CancellationToken cancellationToken)
    {
        try
        {
            var response = await _httpClient.GetFromJsonAsync<ISSNowResponse>(
                "http://api.open-notify.org/iss-now.json",
                cancellationToken
            );

            if (response?.Message == "success" && response.IssPosition != null)
            {
                _logger.Debug("ISS Position fetched: {Latitude}, {Longitude}", response.IssPosition.Latitude, response.IssPosition.Longitude);

                var positionData = new ISSPositionData
                {
                    Latitude = response.IssPosition.Latitude,
                    Longitude = response.IssPosition.Longitude,
                    Timestamp = response.Timestamp,
                    Location = "Loading..."
                };

                _messageBus.Publish(Sc2MessageType.ISSPositionUpdated, positionData);
                _logger.Debug("ISS position published to message bus.");

                // Fetch location in background
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var location = await FetchLocationAsync(
                            positionData.Latitude,
                            positionData.Longitude,
                            cancellationToken
                        );

                        positionData.Location = location.Location;
                        positionData.Country = location.Country;
                        positionData.City = location.City;

                        _messageBus.Publish(Sc2MessageType.ISSPositionUpdated, positionData);
                    }
                    catch
                    {
                        // Ignore location fetch errors
                    }
                }, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error fetching ISS position.");
        }
    }

    private async Task FetchISSCrewAsync(CancellationToken cancellationToken)
    {
        try
        {
            var response = await _httpClient.GetFromJsonAsync<AstrosResponse>(
                "http://api.open-notify.org/astros.json",
                cancellationToken
            );

            if (response?.Message == "success" && response.People != null)
            {
                var issCrewCount = response.People.Count(p => p.Craft == "ISS");

                var crewData = new ISSCrewData
                {
                    CrewCount = issCrewCount,
                    Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                };

                _messageBus.Publish(Sc2MessageType.ISSCrewUpdated, crewData);
                _lastCrewUpdate = DateTime.UtcNow;
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error fetching ISS crew.");
        }
    }

    private async Task<(string Location, string? Country, string? City)> FetchLocationAsync(
        double lat,
        double lon,
        CancellationToken cancellationToken)
    {
        try
        {
            var url = $"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=5&accept-language=en";
            _httpClient.DefaultRequestHeaders.UserAgent.Clear();
            _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("ISS-Tracker/1.0");

            var response = await _httpClient.GetFromJsonAsync<NominatimResponse>(url, cancellationToken);

            if (response?.Address != null)
            {
                var country = response.Address.Country;
                var city = response.Address.City ?? response.Address.Town ?? response.Address.Village;
                var ocean = response.Address.Ocean ?? response.Address.Sea;

                string location = "Open Ocean";
                if (!string.IsNullOrWhiteSpace(city) && !string.IsNullOrWhiteSpace(country))
                {
                    location = $"{city}, {country}";
                }
                else if (!string.IsNullOrWhiteSpace(country))
                {
                    location = country;
                }
                else if (!string.IsNullOrWhiteSpace(ocean))
                {
                    location = ocean;
                }

                return (location, country, city);
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error fetching ISS location.");
        }

        return ("Open Ocean", null, null);
    }

    #region API Response Models

    private class ISSNowResponse
    {
        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("timestamp")]
        public long Timestamp { get; set; }

        [JsonPropertyName("iss_position")]
        public ISSPosition? IssPosition { get; set; }
    }

    private class ISSPosition
    {
        [JsonPropertyName("latitude")]
        public double Latitude { get; set; }

        [JsonPropertyName("longitude")]
        public double Longitude { get; set; }
    }

    private class AstrosResponse
    {
        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("number")]
        public int Number { get; set; }

        [JsonPropertyName("people")]
        public List<Person>? People { get; set; }
    }

    private class Person
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("craft")]
        public string? Craft { get; set; }
    }

    private class NominatimResponse
    {
        [JsonPropertyName("address")]
        public NominatimAddress? Address { get; set; }
    }

    private class NominatimAddress
    {
        [JsonPropertyName("country")]
        public string? Country { get; set; }

        [JsonPropertyName("city")]
        public string? City { get; set; }

        [JsonPropertyName("town")]
        public string? Town { get; set; }

        [JsonPropertyName("village")]
        public string? Village { get; set; }

        [JsonPropertyName("ocean")]
        public string? Ocean { get; set; }

        [JsonPropertyName("sea")]
        public string? Sea { get; set; }
    }

    #endregion
}
