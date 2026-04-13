using System.Text.Json;
using System.Text.Json.Serialization;
using Blazored.LocalStorage;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using WorkPulse.Converters;
using WorkPulse.Services;
using WorkPulse.Web;
using WorkPulse.Web.Auth;
using WorkPulse.Web.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

var apiBaseUrl = builder.Configuration["ApiBaseUrl"] ?? builder.HostEnvironment.BaseAddress;

// Configure JSON serialization to match the API
var jsonOptions = new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true,
    Converters =
    {
        new JsonStringEnumConverter(),
        new DateOnlyJsonConverter(),
        new TimeOnlyJsonConverter()
    }
};
builder.Services.AddSingleton(jsonOptions);

// Local storage for JWT tokens
builder.Services.AddBlazoredLocalStorage();

// Auth state
builder.Services.AddScoped<JwtAuthStateProvider>();
builder.Services.AddScoped<AuthenticationStateProvider>(sp => sp.GetRequiredService<JwtAuthStateProvider>());
builder.Services.AddAuthorizationCore();

// JWT delegating handler
builder.Services.AddScoped<JwtAuthHandler>();

// HttpClient with JWT handler
builder.Services.AddHttpClient("NistApi", client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
}).AddHttpMessageHandler<JwtAuthHandler>();

// Register a default HttpClient that uses the named factory
builder.Services.AddScoped(sp =>
    sp.GetRequiredService<IHttpClientFactory>().CreateClient("NistApi"));

// Application services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ApiDataService>();
builder.Services.AddScoped<IDataService>(sp => sp.GetRequiredService<ApiDataService>());
builder.Services.AddScoped<ApiContactDataService>();
builder.Services.AddScoped<ApiSettingsService>();
builder.Services.AddScoped<ApiDictionaryService>();
builder.Services.AddScoped<FeatureService>();
builder.Services.AddScoped<ToastService>();

await builder.Build().RunAsync();
