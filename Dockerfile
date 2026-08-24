FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Install Node.js for Tailwind CSS build
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy project files first for layer caching
COPY WorkPulse.Shared/WorkPulse.Shared.csproj WorkPulse.Shared/
COPY WorkPulse.Api/WorkPulse.Api.csproj WorkPulse.Api/
COPY WorkPulse.Web/WorkPulse.Web.csproj WorkPulse.Web/

# Install npm dependencies for Tailwind
COPY WorkPulse.Web/package.json WorkPulse.Web/package-lock.json* WorkPulse.Web/
RUN cd WorkPulse.Web && npm install

RUN dotnet restore WorkPulse.Api/WorkPulse.Api.csproj

# Copy all source
COPY WorkPulse.Shared/ WorkPulse.Shared/
COPY WorkPulse.Api/ WorkPulse.Api/
COPY WorkPulse.Web/ WorkPulse.Web/

# Publish API (includes Blazor WASM via ProjectReference, MSBuild target runs Tailwind)
RUN dotnet publish WorkPulse.Api/WorkPulse.Api.csproj \
    -c Release -o /app/api

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/api .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
# Constrained containers (e.g. Render's free tier) cap inotify instances low enough that
# ASP.NET Core's appsettings.json file-watcher crashes WebApplication.CreateBuilder() before
# any app code runs. We don't need config hot-reload in production, so disable it outright.
ENV DOTNET_hostBuilder__reloadConfigOnChange=false

EXPOSE 8080
ENTRYPOINT ["dotnet", "WorkPulse.Api.dll"]
