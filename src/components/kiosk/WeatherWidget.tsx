import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  icon: string;
  wind: number;
  humidity: number;
}

function getWeatherIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('ясно') || c.includes('солнечно') || c.includes('clear') || c.includes('sunny')) return 'Sun';
  if (c.includes('облачно') || c.includes('cloud') || c.includes('пасмур')) return 'Cloud';
  if (c.includes('дождь') || c.includes('ливень') || c.includes('rain')) return 'CloudRain';
  if (c.includes('снег') || c.includes('snow') || c.includes('метель')) return 'CloudSnow';
  if (c.includes('гроза') || c.includes('thunder') || c.includes('storm')) return 'CloudLightning';
  if (c.includes('туман') || c.includes('fog') || c.includes('mist')) return 'CloudFog';
  if (c.includes('переменн') || c.includes('partly')) return 'CloudSun';
  return 'Thermometer';
}

const DEMO: WeatherData = {
  temp: 8,
  feelsLike: 5,
  condition: 'Переменная облачность',
  icon: 'CloudSun',
  wind: 4,
  humidity: 72,
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData>(DEMO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) { setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m&wind_speed_unit=ms&timezone=auto`
          );
          const data = await res.json();
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

          setWeather({
            temp: Math.round(c.temperature_2m),
            feelsLike: Math.round(c.apparent_temperature),
            condition,
            icon,
            wind: Math.round(c.windspeed_10m),
            humidity: Math.round(c.relativehumidity_2m),
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

  const iconName = loading ? 'Loader2' : weather.icon;

  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-card border border-border elevation-2 p-2 h-full">
      <Icon
        name={iconName}
        size={28}
        className={`text-primary ${loading ? 'animate-spin' : ''}`}
      />
      <div className="flex items-end gap-0.5 leading-none">
        <span className="text-3xl tablet:text-4xl font-black tabular-nums text-foreground leading-none">
          {weather.temp}
        </span>
        <span className="text-base font-bold text-muted-foreground mb-0.5">°C</span>
      </div>
      <span className="text-[9px] tablet:text-[10px] text-muted-foreground font-medium text-center leading-tight line-clamp-2">
        {weather.condition}
      </span>
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <Icon name="Wind" size={9} />
        <span>{weather.wind} м/с</span>
        <span className="opacity-40">·</span>
        <Icon name="Droplets" size={9} />
        <span>{weather.humidity}%</span>
      </div>
    </div>
  );
}