import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/icon';

interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  icon: string;
  wind: number;
  humidity: number;
  pressure?: number;
  visibility?: number;
  uvIndex?: number;
  dewPoint?: number;
  city?: string;
}

const DEMO: WeatherData = {
  temp: 8,
  feelsLike: 5,
  condition: 'Переменная облачность',
  icon: 'CloudSun',
  wind: 4,
  humidity: 72,
  pressure: 1013,
  visibility: 10,
  uvIndex: 2,
  dewPoint: 2,
  city: 'Ваш город',
};

function WeatherPopup({ weather, loading, onClose }: { weather: WeatherData; loading: boolean; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-[340px] tablet:w-[400px] rounded-3xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 flex flex-col items-center gap-1"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--primary)/0.05))' }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center"
          >
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>

          {loading ? (
            <Icon name="Loader2" size={56} className="text-primary animate-spin" />
          ) : (
            <Icon name={weather.icon} size={64} className="text-primary" />
          )}

          <div className="flex items-start gap-1 leading-none mt-1">
            <span className="text-6xl font-black tabular-nums text-foreground">{weather.temp}</span>
            <span className="text-2xl font-bold text-muted-foreground mt-2">°C</span>
          </div>
          <p className="text-base font-semibold text-foreground">{weather.condition}</p>
          {weather.city && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Icon name="MapPin" size={11} />
              <span>{weather.city}</span>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          {[
            { icon: 'Thermometer', label: 'Ощущается', value: `${weather.feelsLike}°C` },
            { icon: 'Wind', label: 'Ветер', value: `${weather.wind} м/с` },
            { icon: 'Droplets', label: 'Влажность', value: `${weather.humidity}%` },
            { icon: 'Gauge', label: 'Давление', value: weather.pressure ? `${weather.pressure} гПа` : '—' },
            { icon: 'Eye', label: 'Видимость', value: weather.visibility ? `${weather.visibility} км` : '—' },
            { icon: 'Thermometer', label: 'Точка росы', value: weather.dewPoint !== undefined ? `${weather.dewPoint}°C` : '—' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Icon name={row.icon} size={16} className="text-primary" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground leading-none">{row.label}</div>
                <div className="text-sm font-bold text-foreground leading-tight mt-0.5">{row.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm ripple active:scale-[0.98] transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface WeatherWidgetProps {
  timeStr?: string;
  dateStr?: string;
}

export default function WeatherWidget({ timeStr, dateStr }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData>(DEMO);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m,surface_pressure,visibility,dew_point_2m&wind_speed_unit=ms&timezone=auto`),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`),
          ]);
          const data = await weatherRes.json();
          const geo = await geoRes.json().catch(() => null);
          const c = data.current;
          const code: number = c.weathercode;

          let condition = 'Ясно';
          let icon = 'Sun';
          if (code === 0) { condition = 'Ясно'; icon = 'Sun'; }
          else if (code <= 2) { condition = 'Переменная облачность'; icon = 'CloudSun'; }
          else if (code === 3) { condition = 'Облачно'; icon = 'Cloud'; }
          else if (code <= 49) { condition = 'Туман'; icon = 'CloudFog'; }
          else if (code <= 57) { condition = 'Морось'; icon = 'CloudDrizzle'; }
          else if (code <= 67) { condition = 'Дождь'; icon = 'CloudRain'; }
          else if (code <= 77) { condition = 'Снег'; icon = 'CloudSnow'; }
          else if (code <= 82) { condition = 'Ливень'; icon = 'CloudRain'; }
          else if (code <= 86) { condition = 'Снегопад'; icon = 'CloudSnow'; }
          else { condition = 'Гроза'; icon = 'CloudLightning'; }

          const city = geo?.address?.city || geo?.address?.town || geo?.address?.village || geo?.address?.county || undefined;

          setWeather({
            temp: Math.round(c.temperature_2m),
            feelsLike: Math.round(c.apparent_temperature),
            condition,
            icon,
            wind: Math.round(c.windspeed_10m),
            humidity: Math.round(c.relativehumidity_2m),
            pressure: c.surface_pressure ? Math.round(c.surface_pressure) : undefined,
            visibility: c.visibility ? Math.round(c.visibility / 1000) : undefined,
            dewPoint: c.dew_point_2m !== undefined ? Math.round(c.dew_point_2m) : undefined,
            city,
          });
        } catch (_) {
          setLoading(false);
        }
        setLoading(false);
      },
      () => setLoading(false),
      { timeout: 5000 }
    );
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-card border border-border elevation-2 p-3 h-full w-full ripple active:scale-95 transition-all"
      >
        {/* Иконка + температура в одну строку */}
        <div className="flex items-center gap-2">
          <Icon
            name={loading ? 'Loader2' : weather.icon}
            size={36}
            className={`text-primary flex-shrink-0 ${loading ? 'animate-spin' : ''}`}
          />
          <div className="flex items-end gap-0.5 leading-none">
            <span className="text-5xl tablet:text-6xl font-black tabular-nums text-foreground leading-none">
              {weather.temp}
            </span>
            <span className="text-xl font-bold text-muted-foreground mb-1">°C</span>
          </div>
        </div>
        <span className="text-[10px] tablet:text-xs text-muted-foreground font-medium text-center leading-tight line-clamp-1">
          {weather.condition}
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Icon name="Wind" size={10} />
          <span>{weather.wind} м/с</span>
          <span className="opacity-40">·</span>
          <Icon name="Droplets" size={10} />
          <span>{weather.humidity}%</span>
        </div>
        {timeStr && (
          <>
            <div className="w-full h-px bg-border/50 my-0.5" />
            <span className="text-5xl tablet:text-6xl font-bold tabular-nums text-foreground leading-none">{timeStr}</span>
            {dateStr && (
              <span className="text-xs tablet:text-sm font-semibold text-muted-foreground capitalize leading-none text-center">{dateStr}</span>
            )}
          </>
        )}
      </button>

      {open && <WeatherPopup weather={weather} loading={loading} onClose={() => setOpen(false)} />}
    </>
  );
}