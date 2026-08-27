using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace WorkPulse.Api.Services;

/// <summary>
/// Sends via the Resend HTTP API when Resend:ApiKey is configured. Replaces an earlier SMTP-based
/// sender — Render's free tier blocks outbound traffic on SMTP ports entirely (confirmed via a
/// SocketException: "Network is unreachable" connecting to smtp.gmail.com:587), so plain SMTP
/// can never work here regardless of provider/credentials. An HTTP API sends over regular HTTPS,
/// which is already open (the app calls Google's APIs the same way). When unconfigured, this logs
/// the email instead of sending — same fallback behavior as before, so local dev needs no real
/// email infrastructure.
/// </summary>
public class ResendEmailSender : IEmailSender
{
    private const string ApiUrl = "https://api.resend.com/emails";

    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<ResendEmailSender> logger)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string body)
    {
        var apiKey = _config["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning(
                "Resend:ApiKey not configured — logging email instead of sending.\nTo: {To}\nSubject: {Subject}\nBody: {Body}",
                toEmail, subject, body);
            return;
        }

        var from = _config["Resend:From"] ?? "WorkPulse <onboarding@resend.dev>";

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var response = await client.PostAsJsonAsync(ApiUrl, new { from, to = new[] { toEmail }, subject, text = body });
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Resend send failed ({(int)response.StatusCode}): {error}");
        }
    }
}
