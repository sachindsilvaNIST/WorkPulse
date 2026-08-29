"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, MapPin, Sun } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

// WMO weather codes (used by Open-Meteo) collapsed into the handful of conditions worth a
// distinct icon and scene color — https://open-meteo.com/en/docs has the full table, this covers
// what actually shows up day to day. Colors mirror how Apple's own Weather app changes its
// background by condition, rather than one flat tint for every forecast.
function weatherScene(code: number) {
  if (code === 0) return { Icon: Sun, label: "Clear", from: "#FF9F0A", via: "#0A84FF", to: "#0040DD" };
  if (code <= 2) return { Icon: CloudSun, label: "Partly Cloudy", from: "#64D2FF", via: "#0A84FF", to: "#3634A3" };
  if (code === 3) return { Icon: Cloud, label: "Overcast", from: "#98A6C2", via: "#5E6C94", to: "#2C3556" };
  if (code === 45 || code === 48) return { Icon: CloudFog, label: "Foggy", from: "#B8C4D9", via: "#7C8BA8", to: "#3F4A66" };
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, label: "Drizzle", from: "#5AC8FA", via: "#0A84FF", to: "#1B4B91" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { Icon: CloudRain, label: "Rain", from: "#4FA8D8", via: "#0864B4", to: "#0A2E52" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icon: CloudSnow, label: "Snow", from: "#E8F4FF", via: "#8FC5EA", to: "#3E6A93" };
  if (code >= 95) return { Icon: CloudLightning, label: "Thunderstorm", from: "#8E8CD8", via: "#5856D6", to: "#241F5C" };
  return { Icon: Cloud, label: "Cloudy", from: "#98A6C2", via: "#5E6C94", to: "#2C3556" };
}

interface WeatherData {
  tempC: number;
  code: number;
  highC: number;
  lowC: number;
}

/** Apple-style Liquid Glass weather widget — real current conditions from Open-Meteo (free, no
 * API key) for the browser's geolocation, with a scene color that shifts by condition (sunny gold
 * vs. stormy indigo, ...) rather than one flat tint regardless of weather. Degrades gracefully
 * (its own error/permission state) rather than blocking the rest of the dashboard. */
export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=celsius&timezone=auto`
          );
          if (!res.ok) throw new Error("Weather fetch failed");
          const data = await res.json();
          setWeather({
            tempC: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
            highC: Math.round(data.daily.temperature_2m_max[0]),
            lowC: Math.round(data.daily.temperature_2m_min[0]),
          });
          setStatus("ready");
        } catch {
          setStatus("error");
        }
      },
      () => setStatus("denied"),
      { timeout: 8000 }
    );
  }, []);

  const scene = weatherScene(weather?.code ?? 0);
  const Icon = scene.Icon;

  return (
    <div
      className="relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl border border-white/20 p-6 text-white backdrop-blur-2xl backdrop-saturate-200 sm:h-full"
      style={{
        background: `linear-gradient(150deg, ${scene.from} 0%, ${scene.via} 55%, ${scene.to} 100%)`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -20px 40px -20px rgba(0,0,0,0.25), 0 12px 32px -12px rgba(0,0,0,0.4)",
      }}
    >
      <div className="liquid-sheen pointer-events-none absolute inset-0" />
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-1 text-xs font-medium text-white/90 drop-shadow-sm">
          <MapPin className="size-3" /> Your location
        </span>
        {status === "ready" && (
          <div className="widget-float">
            <Icon className="size-7 drop-shadow-md" strokeWidth={1.75} />
          </div>
        )}
      </div>

      {status === "loading" && (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size={22} className="text-white/90" />
        </div>
      )}
      {status === "denied" && <p className="text-sm text-white/90">Enable location access for weather</p>}
      {status === "error" && <p className="text-sm text-white/90">Weather unavailable right now</p>}
      {status === "ready" && weather && (
        <div>
          <p className="text-4xl font-bold leading-tight drop-shadow-sm">{weather.tempC}°</p>
          <p className="text-sm text-white/90 drop-shadow-sm">
            {scene.label} · H:{weather.highC}° L:{weather.lowC}°
          </p>
        </div>
      )}
    </div>
  );
}
