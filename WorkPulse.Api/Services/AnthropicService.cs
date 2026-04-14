using System.Text;
using System.Text.Json;

namespace WorkPulse.Api.Services;

/// <summary>
/// Thin wrapper around the Anthropic Messages API. Reads the API key from configuration
/// (`Anthropic:ApiKey` or env var `Anthropic__ApiKey`). Uses Claude Haiku for low cost.
/// </summary>
public class AnthropicService
{
    private readonly HttpClient _http;
    private readonly string? _apiKey;
    private readonly string _model;

    public AnthropicService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _apiKey = config["Anthropic:ApiKey"];
        _model = config["Anthropic:Model"] ?? "claude-haiku-4-5-20251001";
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

    /// <summary>
    /// Generates example sentences for a Japanese dictionary entry.
    /// Returns a list of (japanese, english) pairs, or null if the API is not configured / call fails.
    /// </summary>
    public async Task<List<VocabExample>?> GenerateExamplesAsync(string japanese, string? reading, string meaning, int count = 3)
    {
        if (!IsConfigured) return null;

        var prompt = $$"""
            Generate {{count}} natural example sentences in Japanese using the word below, each with an English translation.
            Keep sentences short (5-15 words), conversational, and realistic.

            Japanese word: {{japanese}}
            Reading: {{reading ?? "(not provided)"}}
            Meaning: {{meaning}}

            Respond with ONLY valid JSON in this exact shape:
            {"examples":[{"jp":"...","en":"..."},{"jp":"...","en":"..."}]}
            No markdown, no preamble, no trailing commentary.
            """;

        var requestBody = new
        {
            model = _model,
            max_tokens = 600,
            messages = new[]
            {
                new { role = "user", content = prompt }
            }
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        req.Headers.Add("x-api-key", _apiKey);
        req.Headers.Add("anthropic-version", "2023-06-01");
        req.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        try
        {
            using var resp = await _http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return null;

            using var stream = await resp.Content.ReadAsStreamAsync();
            using var doc = await JsonDocument.ParseAsync(stream);

            // Anthropic response shape: { content: [{ type: "text", text: "..." }], ... }
            var textBlock = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString();
            if (string.IsNullOrWhiteSpace(textBlock)) return null;

            // Model returns strict JSON per prompt; parse it
            using var inner = JsonDocument.Parse(textBlock);
            var examples = new List<VocabExample>();
            foreach (var ex in inner.RootElement.GetProperty("examples").EnumerateArray())
            {
                examples.Add(new VocabExample
                {
                    Jp = ex.GetProperty("jp").GetString() ?? "",
                    En = ex.GetProperty("en").GetString() ?? ""
                });
            }
            return examples;
        }
        catch
        {
            return null;
        }
    }
}

public class VocabExample
{
    public string Jp { get; set; } = "";
    public string En { get; set; } = "";
}
