using Blazored.LocalStorage;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using NistAttendance.Web;
using NistAttendance.Web.Auth;
using NistAttendance.Web.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

var apiBaseUrl = builder.Configuration["ApiBaseUrl"] ?? builder.HostEnvironment.BaseAddress;

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
builder.Services.AddScoped<ApiContactDataService>();
builder.Services.AddScoped<ApiSettingsService>();

await builder.Build().RunAsync();
