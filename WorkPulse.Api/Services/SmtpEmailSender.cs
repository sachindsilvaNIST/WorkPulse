using System.Net;
using System.Net.Mail;

namespace WorkPulse.Api.Services;

/// <summary>
/// Sends via SMTP when Smtp:Host is configured. No SMTP credentials exist in this project yet
/// (dev or prod), so when unconfigured this logs the email instead of throwing — the 2FA/login
/// flow stays fully usable in local dev (read the code from the log) without real email
/// infrastructure, and swapping in real SMTP later is a config-only change, no code change.
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string body)
    {
        var host = _config["Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host))
        {
            _logger.LogWarning(
                "Smtp:Host not configured — logging email instead of sending.\nTo: {To}\nSubject: {Subject}\nBody: {Body}",
                toEmail, subject, body);
            return;
        }

        var port = int.TryParse(_config["Smtp:Port"], out var p) ? p : 587;
        var user = _config["Smtp:User"] ?? "";
        var pass = _config["Smtp:Password"] ?? "";
        var from = _config["Smtp:From"] ?? user;

        using var client = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(user, pass),
            EnableSsl = true,
        };
        using var message = new MailMessage(from, toEmail, subject, body);
        await client.SendMailAsync(message);
    }
}
