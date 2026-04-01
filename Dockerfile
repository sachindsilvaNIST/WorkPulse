FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Install Node.js for Tailwind CSS build
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy project files first for layer caching
COPY NistAttendance.Shared/NistAttendance.Shared.csproj NistAttendance.Shared/
COPY NistAttendance.Api/NistAttendance.Api.csproj NistAttendance.Api/
COPY NistAttendance.Web/NistAttendance.Web.csproj NistAttendance.Web/

# Install npm dependencies for Tailwind
COPY NistAttendance.Web/package.json NistAttendance.Web/package-lock.json* NistAttendance.Web/
RUN cd NistAttendance.Web && npm install

RUN dotnet restore NistAttendance.Api/NistAttendance.Api.csproj

# Copy all source
COPY NistAttendance.Shared/ NistAttendance.Shared/
COPY NistAttendance.Api/ NistAttendance.Api/
COPY NistAttendance.Web/ NistAttendance.Web/

# Publish API (includes Blazor WASM via ProjectReference, MSBuild target runs Tailwind)
RUN dotnet publish NistAttendance.Api/NistAttendance.Api.csproj \
    -c Release -o /app/api

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/api .

ENV ASPNETCORE_URLS=http://+:${PORT:-10000}
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 10000
ENTRYPOINT ["dotnet", "NistAttendance.Api.dll"]
