using System.Net.Http.Headers;
using Blazored.LocalStorage;

namespace WorkPulse.Web.Auth;

public class JwtAuthHandler : DelegatingHandler
{
    private readonly ILocalStorageService _localStorage;

    public JwtAuthHandler(ILocalStorageService localStorage)
    {
        _localStorage = localStorage;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var token = await _localStorage.GetItemAsStringAsync("authToken");
        if (!string.IsNullOrWhiteSpace(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
