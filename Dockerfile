FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files first for layer caching
COPY NistAttendance.Shared/NistAttendance.Shared.csproj NistAttendance.Shared/
COPY NistAttendance.Api/NistAttendance.Api.csproj NistAttendance.Api/
COPY NistAttendance.Web/NistAttendance.Web.csproj NistAttendance.Web/
RUN dotnet restore NistAttendance.Api/NistAttendance.Api.csproj

# Copy all source
COPY NistAttendance.Shared/ NistAttendance.Shared/
COPY NistAttendance.Api/ NistAttendance.Api/
COPY NistAttendance.Web/ NistAttendance.Web/

# Publish API (includes Blazor WASM via ProjectReference)
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
