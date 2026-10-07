"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, MapPin, Sun } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

// WMO weather codes (used by Open-Meteo) collapsed into the handful of conditions worth a
// distinct icon and tint color — https://open-meteo.com/en/docs has the full table, this covers
// what actually shows up day to day.
function weatherScene(code: number) {
  if (code === 0) return { Icon: Sun, label: "Clear", color: "var(--brand-orange)" };
  if (code <= 2) return { Icon: CloudSun, label: "Partly Cloudy", color: "var(--brand-blue)" };
  if (code === 3) return { Icon: Cloud, label: "Overcast", color: "var(--text-tertiary)" };
  if (code === 45 || code === 48) return { Icon: CloudFog, label: "Foggy", color: "var(--text-tertiary)" };
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, label: "Drizzle", color: "var(--brand-blue)" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { Icon: CloudRain, label: "Rain", color: "var(--brand-blue)" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icon: CloudSnow, label: "Snow", color: "var(--brand-blue)" };
  if (code >= 95) return { Icon: CloudLightning, label: "Thunderstorm", color: "var(--brand-purple)" };
  return { Icon: Cloud, label: "Cloudy", color: "var(--text-tertiary)" };
}

interface WeatherData {
  tempC: number;
  code: number;
  highC: number;
  lowC: number;
}

/** Glass weather tile, styled like the rest of the app's stat tiles — real current conditions from
 * Open-Meteo (free, no API key) for the browser's geolocation. Degrades gracefully (its own error/
 * permission state) rather than blocking the rest of the home page. */
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
    <div className="glass flex min-h-[152px] flex-col justify-between gap-3 rounded-tile p-[18px]">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1 text-[13px] font-semibold text-text-secondary">
          <MapPin className="size-3" /> Your location
        </span>
        {status === "ready" && (
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-icon"
            style={{ backgroundColor: `color-mix(in srgb, ${scene.color} 15%, transparent)`, color: scene.color }}
          >
            <Icon className="size-[18px]" strokeWidth={1.8} />
          </span>
        )}
      </div>

      {status === "loading" && (
        <div className="flex flex-1 items-center justify-center py-2">
          <Spinner size={20} className="text-text-secondary" />
        </div>
      )}
      {status === "denied" && <p className="text-sm text-text-secondary">Enable location access for weather</p>}
      {status === "error" && <p className="text-sm text-text-secondary">Weather unavailable right now</p>}
      {status === "ready" && weather && (
        <div>
          <p className="text-[30px] font-bold leading-none tracking-[-0.03em] text-text-primary">{weather.tempC}°</p>
          <p className="mt-1 text-sm text-text-secondary">
            {scene.label} · H:{weather.highC}° L:{weather.lowC}°
          </p>
        </div>
      )}
    </div>
  );
}
