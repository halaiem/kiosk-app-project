import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Icon from "@/components/ui/icon";
import urls from '@/api/config';

// Fix default Leaflet marker icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ── API helpers ─────────────────────────────────────────────────── */
const API_URL = urls["dashboard-messages"];
const TOKEN_KEY = "dashboard_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function hdrs(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) h["X-Dashboard-Token"] = t;
  return h;
}

/* ── Types ───────────────────────────────────────────────────────── */
interface GeoZone {
  id: number;
  name: string;
  type: "circle" | "polygon" | "line" | "marker";
  coordinates: number[][];
  radius_km?: number;
  color: string;
  trigger: "entry" | "exit" | "nearby";
  nearby_distance_km?: number;
  notification_template_id?: number;
  notification_template_title?: string;
  is_active: boolean;
  city?: string;
}

interface NotifTemplate {
  id: number;
  title: string;
}

interface GeoZoneEvent {
  id: number;
  driver_id: number;
  driver_name: string;
  zone_id: number;
  zone_name: string;
  event_type: "entry" | "exit" | "nearby";
  notification_sent: boolean;
  latitude: number;
  longitude: number;
  distance_km: number;
  created_at: string;
}

type DrawMode = "circle" | "polygon" | "line" | "marker" | null;

/* ── Constants ───────────────────────────────────────────────────── */
const CITIES: { name: string; lat: number; lng: number; zoom: number }[] = [
  { name: "Москва", lat: 55.7558, lng: 37.6173, zoom: 11 },
  { name: "Санкт-Петербург", lat: 59.9343, lng: 30.3351, zoom: 11 },
  { name: "Новосибирск", lat: 55.0084, lng: 82.9357, zoom: 12 },
  { name: "Екатеринбург", lat: 56.8389, lng: 60.6057, zoom: 12 },
  { name: "Казань", lat: 55.7887, lng: 49.1221, zoom: 12 },
  { name: "Нижний Новгород", lat: 56.2965, lng: 43.9361, zoom: 12 },
  { name: "Челябинск", lat: 55.1644, lng: 61.4368, zoom: 12 },
  { name: "Самара", lat: 53.1959, lng: 50.1002, zoom: 12 },
  { name: "Омск", lat: 54.9893, lng: 73.3682, zoom: 12 },
  { name: "Ростов-на-Дону", lat: 47.2357, lng: 39.7015, zoom: 12 },
  { name: "Уфа", lat: 54.7388, lng: 55.9721, zoom: 12 },
  { name: "Красноярск", lat: 56.0153, lng: 92.8932, zoom: 12 },
  { name: "Воронеж", lat: 51.6683, lng: 39.1843, zoom: 12 },
  { name: "Пермь", lat: 58.0105, lng: 56.2502, zoom: 12 },
  { name: "Волгоград", lat: 48.708, lng: 44.5133, zoom: 12 },
  { name: "Краснодар", lat: 45.0355, lng: 38.9753, zoom: 12 },
  { name: "Саратов", lat: 51.5336, lng: 46.0344, zoom: 12 },
  { name: "Тюмень", lat: 57.1522, lng: 65.5272, zoom: 12 },
  { name: "Тольятти", lat: 53.5078, lng: 49.4204, zoom: 12 },
  { name: "Ижевск", lat: 56.8527, lng: 53.2114, zoom: 12 },
  { name: "Барнаул", lat: 53.3548, lng: 83.7698, zoom: 12 },
  { name: "Ульяновск", lat: 54.3142, lng: 48.4031, zoom: 12 },
  { name: "Иркутск", lat: 52.2978, lng: 104.296, zoom: 12 },
  { name: "Хабаровск", lat: 48.4827, lng: 135.084, zoom: 12 },
  { name: "Ярославль", lat: 57.6299, lng: 39.8737, zoom: 12 },
  { name: "Владивосток", lat: 43.1155, lng: 131.885, zoom: 12 },
  { name: "Махачкала", lat: 42.9849, lng: 47.5047, zoom: 12 },
  { name: "Томск", lat: 56.4884, lng: 84.948, zoom: 12 },
  { name: "Оренбург", lat: 51.7727, lng: 55.0988, zoom: 12 },
  { name: "Кемерово", lat: 55.3544, lng: 86.088, zoom: 12 },
  { name: "Рязань", lat: 54.6296, lng: 39.7416, zoom: 12 },
  { name: "Набережные Челны", lat: 55.7433, lng: 52.3959, zoom: 12 },
  { name: "Астрахань", lat: 46.3479, lng: 48.0336, zoom: 12 },
  { name: "Пенза", lat: 53.1959, lng: 45.0183, zoom: 12 },
  { name: "Липецк", lat: 52.6031, lng: 39.5708, zoom: 12 },
  { name: "Тула", lat: 54.1961, lng: 37.6182, zoom: 12 },
  { name: "Киров", lat: 58.6036, lng: 49.668, zoom: 12 },
  { name: "Чебоксары", lat: 56.1322, lng: 47.2519, zoom: 12 },
  { name: "Калининград", lat: 54.7104, lng: 20.4522, zoom: 12 },
  { name: "Брянск", lat: 53.2434, lng: 34.3637, zoom: 12 },
  { name: "Курск", lat: 51.7306, lng: 36.1543, zoom: 12 },
  { name: "Иваново", lat: 57.0004, lng: 40.9737, zoom: 12 },
  { name: "Магнитогорск", lat: 53.4074, lng: 59.0684, zoom: 12 },
  { name: "Улан-Удэ", lat: 51.8349, lng: 107.584, zoom: 12 },
  { name: "Тверь", lat: 56.8684, lng: 35.9006, zoom: 12 },
  { name: "Ставрополь", lat: 45.0448, lng: 41.9692, zoom: 12 },
  { name: "Белгород", lat: 50.5977, lng: 36.5858, zoom: 12 },
  { name: "Сочи", lat: 43.5855, lng: 39.7231, zoom: 12 },
  { name: "Нижний Тагил", lat: 57.9195, lng: 59.965, zoom: 12 },
  { name: "Архангельск", lat: 64.5399, lng: 40.5152, zoom: 12 },
  { name: "Владимир", lat: 56.1366, lng: 40.3966, zoom: 12 },
  { name: "Калуга", lat: 54.5293, lng: 36.2754, zoom: 12 },
  { name: "Смоленск", lat: 54.7826, lng: 32.0453, zoom: 12 },
  { name: "Чита", lat: 52.0515, lng: 113.471, zoom: 12 },
  { name: "Саранск", lat: 54.1838, lng: 45.1749, zoom: 12 },
  { name: "Вологда", lat: 59.2181, lng: 39.8914, zoom: 12 },
  { name: "Орёл", lat: 52.9651, lng: 36.0785, zoom: 12 },
  { name: "Грозный", lat: 43.3177, lng: 45.6949, zoom: 12 },
  { name: "Тамбов", lat: 52.7212, lng: 41.4524, zoom: 12 },
  { name: "Мурманск", lat: 68.9585, lng: 33.0827, zoom: 12 },
  { name: "Петрозаводск", lat: 61.7849, lng: 34.3469, zoom: 12 },
  { name: "Кострома", lat: 57.7678, lng: 40.9268, zoom: 12 },
  { name: "Новокузнецк", lat: 53.7596, lng: 87.1216, zoom: 12 },
  { name: "Йошкар-Ола", lat: 56.6343, lng: 47.8995, zoom: 12 },
  { name: "Сургут", lat: 61.25, lng: 73.3964, zoom: 12 },
  { name: "Нижневартовск", lat: 60.9344, lng: 76.5531, zoom: 12 },
  { name: "Якутск", lat: 62.0355, lng: 129.675, zoom: 12 },
  { name: "Псков", lat: 57.8136, lng: 28.3496, zoom: 12 },
  { name: "Великий Новгород", lat: 58.5228, lng: 31.2694, zoom: 12 },
  { name: "Комсомольск-на-Амуре", lat: 50.5504, lng: 137.008, zoom: 12 },
  { name: "Стерлитамак", lat: 53.6305, lng: 55.9308, zoom: 12 },
  { name: "Дзержинск", lat: 56.2412, lng: 43.4553, zoom: 12 },
  { name: "Абакан", lat: 53.7211, lng: 91.4425, zoom: 12 },
  { name: "Благовещенск", lat: 50.2785, lng: 127.54, zoom: 12 },
  { name: "Сыктывкар", lat: 61.6688, lng: 50.836, zoom: 12 },
  { name: "Петропавловск-Камчатский", lat: 53.0452, lng: 158.651, zoom: 12 },
  { name: "Южно-Сахалинск", lat: 46.9641, lng: 142.731, zoom: 12 },
  { name: "Норильск", lat: 69.3535, lng: 88.1892, zoom: 12 },
  { name: "Волжский", lat: 48.7856, lng: 44.7719, zoom: 12 },
  { name: "Подольск", lat: 55.4312, lng: 37.5447, zoom: 12 },
];

const PRESET_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

const TRIGGER_OPTIONS: {
  key: GeoZone["trigger"];
  label: string;
  icon: string;
}[] = [
  { key: "entry", label: "Входит в зону", icon: "LogIn" },
  { key: "exit", label: "Выходит из зоны", icon: "LogOut" },
  { key: "nearby", label: "Ближе чем X км", icon: "Radar" },
];

const TYPE_ICON: Record<GeoZone["type"], string> = {
  circle: "Circle",
  polygon: "Pentagon",
  line: "Route",
  marker: "MapPin",
};

const TYPE_LABEL: Record<GeoZone["type"], string> = {
  circle: "Круг",
  polygon: "Полигон",
  line: "Маршрут",
  marker: "Маркер",
};

/* ── Empty editor state ──────────────────────────────────────────── */
interface EditorState {
  id?: number;
  name: string;
  type: GeoZone["type"];
  coordinates: number[][];
  radius_km: string;
  color: string;
  trigger: GeoZone["trigger"];
  nearby_distance_km: string;
  notification_template_id: string;
  is_active: boolean;
  city: string;
}

function emptyEditor(): EditorState {
  return {
    name: "",
    type: "circle",
    coordinates: [],
    radius_km: "1",
    color: PRESET_COLORS[0],
    trigger: "entry",
    nearby_distance_km: "5",
    notification_template_id: "",
    is_active: true,
    city: "",
  };
}

function zoneToEditor(z: GeoZone): EditorState {
  return {
    id: z.id,
    name: z.name,
    type: z.type,
    coordinates: z.coordinates,
    radius_km: z.radius_km != null ? String(z.radius_km) : "1",
    color: z.color,
    trigger: z.trigger,
    nearby_distance_km:
      z.nearby_distance_km != null ? String(z.nearby_distance_km) : "5",
    notification_template_id: z.notification_template_id
      ? String(z.notification_template_id)
      : "",
    is_active: z.is_active,
    city: z.city || "",
  };
}

/* ── City search dropdown ─────────────────────────────────────────── */
function CitySearchDropdown({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return CITIES;
    const q = search.trim().toLowerCase();
    return CITIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [search]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className={`relative ${className ?? ""}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-8 px-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors flex items-center justify-between gap-2"
      >
        <span className="truncate">{value || placeholder || "Выберите город"}</span>
        <Icon
          name={open ? "ChevronUp" : "ChevronDown"}
          className="w-3.5 h-3.5 text-muted-foreground shrink-0"
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Icon
                name="Search"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск города..."
                className="w-full h-7 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {placeholder !== undefined && (
              <button
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  !value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {placeholder}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                Не найдено
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    onChange(c.name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    value === c.name
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {c.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  COMPONENT
 * ════════════════════════════════════════════════════════════════════ */
export default function GeoTargetingSettings() {
  /* ── State ──────────────────────────────────────────────────────── */
  const [zones, setZones] = useState<GeoZone[]>([]);
  const [templates, setTemplates] = useState<NotifTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [selectedCity, setSelectedCity] = useState(CITIES[0].name);

  /* ── Events tab state ──────────────────────────────────────────── */
  const [viewTab, setViewTab] = useState<"zones" | "events">("zones");
  const [events, setEvents] = useState<GeoZoneEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsFilterZone, setEventsFilterZone] = useState<string>("");

  /* ── Refs ───────────────────────────────────────────────────────── */
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const drawLayerRef = useRef<L.LayerGroup | null>(null);
  const drawPointsRef = useRef<number[][]>([]);
  const drawPreviewRef = useRef<L.Layer | null>(null);
  const drawCircleCenterRef = useRef<number[] | null>(null);

  /* ── Next local id ──────────────────────────────────────────────── */
  const nextIdRef = useRef(-1);
  const getNextId = () => {
    const id = nextIdRef.current;
    nextIdRef.current -= 1;
    return id;
  };

  /* ── Load data ──────────────────────────────────────────────────── */
  const loadZones = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}?action=geo_zones`, {
        headers: hdrs(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setZones(data.zones || []);
    } catch {
      // API may not exist yet -- silently start empty
      setZones([]);
    }
    setLoading(false);
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=notif_templates`, {
        headers: hdrs(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTemplates(
        (data.templates || []).map((t: { id: number; title: string }) => ({
          id: t.id,
          title: t.title,
        }))
      );
    } catch {
      setTemplates([]);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=geo_zone_events&limit=200`, {
        headers: hdrs(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      setEvents([]);
    }
    setEventsLoading(false);
  }, []);

  useEffect(() => {
    loadZones();
    loadTemplates();
  }, [loadZones, loadTemplates]);

  useEffect(() => {
    if (viewTab === "events") {
      loadEvents();
    }
  }, [viewTab, loadEvents]);

  /* ── Map initialization ─────────────────────────────────────────── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const city = CITIES.find((c) => c.name === selectedCity) || CITIES[0];
    const map = L.map(mapContainerRef.current, {
      center: [city.lat, city.lng],
      zoom: city.zoom,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    const drawLayer = L.layerGroup().addTo(map);

    layerGroupRef.current = layerGroup;
    drawLayerRef.current = drawLayer;
    mapRef.current = map;

    // Invalidate size after mount (flex/grid can cause issues)
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      drawLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── City change → move map ─────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const city = CITIES.find((c) => c.name === selectedCity);
    if (city) {
      map.setView([city.lat, city.lng], city.zoom, { animate: true });
    }
  }, [selectedCity]);

  /* ── Render zones on map ────────────────────────────────────────── */
  useEffect(() => {
    const lg = layerGroupRef.current;
    if (!lg) return;
    lg.clearLayers();

    for (const z of zones) {
      const isSelected = z.id === selectedId;
      const style: L.PathOptions = {
        color: z.color,
        weight: isSelected ? 3 : 2,
        opacity: z.is_active ? 0.9 : 0.35,
        fillOpacity: isSelected ? 0.3 : 0.15,
        dashArray: z.is_active ? undefined : "6 4",
      };

      let layer: L.Layer | null = null;

      if (z.type === "circle" && z.coordinates.length > 0) {
        const [lat, lng] = z.coordinates[0];
        layer = L.circle([lat, lng], {
          ...style,
          radius: (z.radius_km || 1) * 1000,
        });
      } else if (z.type === "polygon" && z.coordinates.length >= 3) {
        layer = L.polygon(
          z.coordinates.map(([lat, lng]) => [lat, lng] as [number, number]),
          style
        );
      } else if (z.type === "line" && z.coordinates.length >= 2) {
        layer = L.polyline(
          z.coordinates.map(([lat, lng]) => [lat, lng] as [number, number]),
          { ...style, fill: false }
        );
      } else if (z.type === "marker" && z.coordinates.length > 0) {
        const [lat, lng] = z.coordinates[0];
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:${z.color};border:3px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,.3);
            ${isSelected ? "transform:scale(1.25);" : ""}
          "></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        layer = L.marker([lat, lng], { icon });
      }

      if (layer) {
        layer.on("click", () => {
          setSelectedId(z.id);
          setEditor(zoneToEditor(z));
        });
        const tooltip = `${z.name}${z.is_active ? "" : " (неактивна)"}`;
        layer.bindTooltip(tooltip, {
          direction: "top",
          offset: [0, -10],
        });
        lg.addLayer(layer);
      }
    }
  }, [zones, selectedId]);

  /* ── Drawing handlers ───────────────────────────────────────────── */
  const cancelDraw = useCallback(() => {
    setDrawMode(null);
    drawPointsRef.current = [];
    drawCircleCenterRef.current = null;
    if (drawPreviewRef.current && drawLayerRef.current) {
      drawLayerRef.current.removeLayer(drawPreviewRef.current);
      drawPreviewRef.current = null;
    }
    drawLayerRef.current?.clearLayers();
  }, []);

  const finishDraw = useCallback(
    (coords: number[][], type: GeoZone["type"], radiusKm?: number) => {
      if (!editor) return;
      setEditor((prev) =>
        prev
          ? {
              ...prev,
              type,
              coordinates: coords,
              radius_km: radiusKm != null ? String(radiusKm) : prev.radius_km,
            }
          : prev
      );
      cancelDraw();
    },
    [editor, cancelDraw]
  );

  /* Map click handler for drawing */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !drawMode) return;

    // Change cursor
    const container = map.getContainer();
    container.style.cursor = "crosshair";

    const onClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (drawMode === "marker") {
        finishDraw([[lat, lng]], "marker");
        return;
      }

      if (drawMode === "circle") {
        if (!drawCircleCenterRef.current) {
          drawCircleCenterRef.current = [lat, lng];
          // Show center marker
          const centerMarker = L.circleMarker([lat, lng], {
            radius: 4,
            color: editor?.color || PRESET_COLORS[0],
            fillOpacity: 1,
          });
          drawLayerRef.current?.addLayer(centerMarker);
        } else {
          const [cLat, cLng] = drawCircleCenterRef.current;
          const center = L.latLng(cLat, cLng);
          const edge = L.latLng(lat, lng);
          const radiusM = center.distanceTo(edge);
          const radiusKm = Math.round((radiusM / 1000) * 100) / 100;
          finishDraw([[cLat, cLng]], "circle", radiusKm);
        }
        return;
      }

      // polygon / line
      drawPointsRef.current = [...drawPointsRef.current, [lat, lng]];

      // Update preview
      if (drawPreviewRef.current && drawLayerRef.current) {
        drawLayerRef.current.removeLayer(drawPreviewRef.current);
      }
      const pts = drawPointsRef.current.map(
        ([a, b]) => [a, b] as [number, number]
      );
      const color = editor?.color || PRESET_COLORS[0];
      if (drawMode === "polygon" && pts.length >= 2) {
        drawPreviewRef.current = L.polygon(pts, {
          color,
          weight: 2,
          fillOpacity: 0.15,
          dashArray: "4 4",
        });
      } else {
        drawPreviewRef.current = L.polyline(pts, {
          color,
          weight: 2,
          dashArray: "4 4",
        });
      }
      if (drawPreviewRef.current) {
        drawLayerRef.current?.addLayer(drawPreviewRef.current);
      }
      // Also add vertex dots
      const dot = L.circleMarker([lat, lng], {
        radius: 4,
        color,
        fillOpacity: 1,
      });
      drawLayerRef.current?.addLayer(dot);
    };

    const onDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      const pts = drawPointsRef.current;
      if (drawMode === "polygon" && pts.length >= 3) {
        finishDraw(pts, "polygon");
      } else if (drawMode === "line" && pts.length >= 2) {
        finishDraw(pts, "line");
      }
    };

    // Circle preview on mousemove
    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (drawMode === "circle" && drawCircleCenterRef.current) {
        const [cLat, cLng] = drawCircleCenterRef.current;
        const center = L.latLng(cLat, cLng);
        const edge = e.latlng;
        const radiusM = center.distanceTo(edge);
        if (drawPreviewRef.current && drawLayerRef.current) {
          drawLayerRef.current.removeLayer(drawPreviewRef.current);
        }
        drawPreviewRef.current = L.circle([cLat, cLng], {
          radius: radiusM,
          color: editor?.color || PRESET_COLORS[0],
          weight: 2,
          fillOpacity: 0.12,
          dashArray: "4 4",
        });
        drawLayerRef.current?.addLayer(drawPreviewRef.current);
      }
    };

    map.on("click", onClick);
    map.on("dblclick", onDblClick);
    map.on("mousemove", onMouseMove);

    return () => {
      container.style.cursor = "";
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
      map.off("mousemove", onMouseMove);
    };
  }, [drawMode, editor, finishDraw]);

  /* ── CRUD ───────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!editor) return;
    if (!editor.name.trim()) {
      setError("Введите название зоны");
      return;
    }
    if (editor.coordinates.length === 0) {
      setError("Нарисуйте зону на карте или укажите координаты");
      return;
    }
    setSaving(true);
    setError("");

    const templateMatch = templates.find(
      (t) => String(t.id) === editor.notification_template_id
    );

    const body: Record<string, unknown> = {
      name: editor.name,
      type: editor.type,
      coordinates: editor.coordinates,
      radius_km: editor.type === "circle" ? Number(editor.radius_km) || 1 : null,
      color: editor.color,
      trigger: editor.trigger,
      nearby_distance_km:
        editor.trigger === "nearby"
          ? Number(editor.nearby_distance_km) || 5
          : null,
      notification_template_id: editor.notification_template_id
        ? Number(editor.notification_template_id)
        : null,
      notification_template_title: templateMatch?.title || null,
      is_active: editor.is_active,
      city: editor.city || null,
    };

    if (editor.id && editor.id > 0) {
      body.id = editor.id;
    }

    try {
      const method = editor.id && editor.id > 0 ? "PUT" : "POST";
      const res = await fetch(`${API_URL}?action=geo_zone`, {
        method,
        headers: hdrs(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (method === "POST" && data.zone) {
          setZones((prev) => [...prev, data.zone]);
        } else {
          await loadZones();
        }
      } else {
        // Fallback: save locally
        if (editor.id && editor.id < 0) {
          // Already a local zone -- update
          setZones((prev) =>
            prev.map((z) =>
              z.id === editor.id
                ? {
                    ...z,
                    name: editor.name,
                    type: editor.type,
                    coordinates: editor.coordinates,
                    radius_km:
                      editor.type === "circle"
                        ? Number(editor.radius_km) || 1
                        : undefined,
                    color: editor.color,
                    trigger: editor.trigger,
                    nearby_distance_km:
                      editor.trigger === "nearby"
                        ? Number(editor.nearby_distance_km) || 5
                        : undefined,
                    notification_template_id: editor.notification_template_id
                      ? Number(editor.notification_template_id)
                      : undefined,
                    notification_template_title: templateMatch?.title,
                    is_active: editor.is_active,
                    city: editor.city,
                  }
                : z
            )
          );
        } else if (!editor.id) {
          // New local zone
          const newZone: GeoZone = {
            id: getNextId(),
            name: editor.name,
            type: editor.type,
            coordinates: editor.coordinates,
            radius_km:
              editor.type === "circle"
                ? Number(editor.radius_km) || 1
                : undefined,
            color: editor.color,
            trigger: editor.trigger,
            nearby_distance_km:
              editor.trigger === "nearby"
                ? Number(editor.nearby_distance_km) || 5
                : undefined,
            notification_template_id: editor.notification_template_id
              ? Number(editor.notification_template_id)
              : undefined,
            notification_template_title: templateMatch?.title,
            is_active: editor.is_active,
            city: editor.city,
          };
          setZones((prev) => [...prev, newZone]);
        }
      }

      setEditor(null);
      setSelectedId(null);
    } catch {
      // Fallback: save locally
      const newZone: GeoZone = {
        id: editor.id || getNextId(),
        name: editor.name,
        type: editor.type,
        coordinates: editor.coordinates,
        radius_km:
          editor.type === "circle"
            ? Number(editor.radius_km) || 1
            : undefined,
        color: editor.color,
        trigger: editor.trigger,
        nearby_distance_km:
          editor.trigger === "nearby"
            ? Number(editor.nearby_distance_km) || 5
            : undefined,
        notification_template_id: editor.notification_template_id
          ? Number(editor.notification_template_id)
          : undefined,
        notification_template_title: templateMatch?.title,
        is_active: editor.is_active,
        city: editor.city,
      };
      setZones((prev) => {
        const existing = prev.find((z) => z.id === newZone.id);
        if (existing) return prev.map((z) => (z.id === newZone.id ? newZone : z));
        return [...prev, newZone];
      });
      setEditor(null);
      setSelectedId(null);
    }

    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (id > 0) {
      try {
        await fetch(`${API_URL}?action=geo_zone&id=${id}`, {
          method: "DELETE",
          headers: hdrs(),
        });
      } catch {
        // ignore -- remove locally anyway
      }
    }
    setZones((prev) => prev.filter((z) => z.id !== id));
    setConfirmDelete(null);
    if (selectedId === id) {
      setSelectedId(null);
      setEditor(null);
    }
  };

  /* ── Helpers ────────────────────────────────────────────────────── */
  const openCreate = () => {
    cancelDraw();
    setSelectedId(null);
    setEditor(emptyEditor());
  };

  const openEdit = (z: GeoZone) => {
    cancelDraw();
    setSelectedId(z.id);
    setEditor(zoneToEditor(z));
    // Fly to zone
    if (mapRef.current && z.coordinates.length > 0) {
      const [lat, lng] = z.coordinates[0];
      mapRef.current.setView([lat, lng], 14, { animate: true });
    }
  };

  const startDraw = (mode: DrawMode) => {
    cancelDraw();
    setDrawMode(mode);
    if (mode && editor) {
      setEditor((prev) => (prev ? { ...prev, type: mode } : prev));
    }
  };

  const coordsDisplay = useMemo(() => {
    if (!editor || editor.coordinates.length === 0) return "Не задано";
    if (editor.type === "circle" || editor.type === "marker") {
      const [lat, lng] = editor.coordinates[0];
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    return `${editor.coordinates.length} точек`;
  }, [editor]);

  const drawHint = useMemo(() => {
    if (!drawMode) return null;
    switch (drawMode) {
      case "marker":
        return "Кликните на карту для размещения маркера";
      case "circle":
        return drawCircleCenterRef.current
          ? "Кликните для задания радиуса"
          : "Кликните для размещения центра круга";
      case "polygon":
        return "Кликните точки полигона, двойной клик для завершения";
      case "line":
        return "Кликните точки маршрута, двойной клик для завершения";
    }
  }, [drawMode]);

  const filteredEvents = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (!eventsFilterZone) return sorted;
    return sorted.filter((e) => String(e.zone_id) === eventsFilterZone);
  }, [events, eventsFilterZone]);

  const formatEventDate = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Гео-таргетинг
          </h3>
          <p className="text-sm text-muted-foreground">
            Зоны, маршруты и автоматические уведомления по геолокации
          </p>
        </div>
        {viewTab === "zones" && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Icon name="Plus" className="w-4 h-4" />
            Добавить зону
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setViewTab("zones")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewTab === "zones"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="MapPin" className="w-4 h-4" />
          Зоны и карта
        </button>
        <button
          onClick={() => setViewTab("events")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewTab === "events"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="History" className="w-4 h-4" />
          История событий
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-500 flex items-center gap-1">
          <Icon name="AlertCircle" className="w-3 h-3" />
          {error}
        </div>
      )}

      {/* ── Zones + Map view ─────────────────────────────────────── */}
      {viewTab === "zones" && (
      <div className="flex gap-4 min-h-[600px]" style={{ height: "calc(100vh - 320px)" }}>
        {/* ── Left panel: zone list + editor ────────────────────────── */}
        <div className="w-[360px] shrink-0 flex flex-col gap-4 overflow-hidden">
          {/* Zone list */}
          <div className="bg-card border border-border rounded-2xl flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
              <Icon name="Layers" className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                Зоны
              </h4>
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {zones.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Загрузка...
                </div>
              ) : zones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Icon
                    name="MapPinOff"
                    className="w-10 h-10 mb-3 opacity-30"
                  />
                  <p className="text-sm">Нет гео-зон</p>
                  <p className="text-xs mt-1 opacity-70">
                    Нажмите "Добавить зону" для создания
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {zones.map((z) => {
                    const isSelected = z.id === selectedId;
                    return (
                      <div
                        key={z.id}
                        onClick={() => openEdit(z)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/5 border-l-2 border-l-primary"
                            : "hover:bg-muted/40 border-l-2 border-l-transparent"
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: z.color + "1a",
                          }}
                        >
                          <Icon
                            name={TYPE_ICON[z.type]}
                            className="w-4 h-4"
                            style={{ color: z.color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground truncate">
                              {z.name}
                            </p>
                            {!z.is_active && (
                              <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                                выкл
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-muted-foreground">
                              {TYPE_LABEL[z.type]}
                            </span>
                            {z.type === "circle" && z.radius_km && (
                              <span className="text-[11px] text-muted-foreground">
                                {z.radius_km} км
                              </span>
                            )}
                            {z.notification_template_title && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                                {z.notification_template_title}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(z.id);
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ opacity: isSelected ? 1 : undefined }}
                          title="Удалить"
                        >
                          <Icon
                            name="Trash2"
                            className="w-3.5 h-3.5 text-red-500"
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Zone editor */}
          {editor && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col shrink-0 max-h-[55%]">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Icon name="Settings2" className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">
                    {editor.id ? "Редактирование" : "Новая зона"}
                  </h4>
                </div>
                <button
                  onClick={() => {
                    setEditor(null);
                    setSelectedId(null);
                    cancelDraw();
                  }}
                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center"
                >
                  <Icon name="X" className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Название
                  </label>
                  <input
                    type="text"
                    value={editor.name}
                    onChange={(e) =>
                      setEditor({ ...editor, name: e.target.value })
                    }
                    placeholder="Например: Зона депо"
                    className="w-full h-9 px-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                {/* Drawing tools */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Рисовать на карте
                  </label>
                  <div className="flex gap-1">
                    {(
                      [
                        { mode: "circle" as DrawMode, icon: "Circle", label: "Круг" },
                        {
                          mode: "polygon" as DrawMode,
                          icon: "Pentagon",
                          label: "Полигон",
                        },
                        { mode: "line" as DrawMode, icon: "Route", label: "Маршрут" },
                        {
                          mode: "marker" as DrawMode,
                          icon: "MapPin",
                          label: "Маркер",
                        },
                      ] as const
                    ).map((tool) => (
                      <button
                        key={tool.mode}
                        onClick={() =>
                          drawMode === tool.mode
                            ? cancelDraw()
                            : startDraw(tool.mode)
                        }
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] transition-colors ${
                          drawMode === tool.mode
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        title={tool.label}
                      >
                        <Icon name={tool.icon} className="w-4 h-4" />
                        {tool.label}
                      </button>
                    ))}
                  </div>
                  {drawMode && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[11px] text-amber-600 bg-amber-500/10 px-2 py-1 rounded-lg flex-1">
                        {drawHint}
                      </span>
                      <button
                        onClick={cancelDraw}
                        className="text-[11px] text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-500/10 shrink-0"
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                </div>

                {/* Coordinates display */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Координаты
                  </label>
                  <div className="text-xs text-foreground bg-muted/50 border border-border rounded-lg px-3 py-2">
                    {coordsDisplay}
                  </div>
                </div>

                {/* Radius for circle */}
                {editor.type === "circle" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Радиус (км)
                    </label>
                    <input
                      type="number"
                      value={editor.radius_km}
                      onChange={(e) =>
                        setEditor({ ...editor, radius_km: e.target.value })
                      }
                      min="0.1"
                      step="0.1"
                      className="w-full h-9 px-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                )}

                {/* Manual coords for marker */}
                {editor.type === "marker" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Широта
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={
                          editor.coordinates.length > 0
                            ? editor.coordinates[0][0]
                            : ""
                        }
                        onChange={(e) => {
                          const lat = Number(e.target.value);
                          const lng =
                            editor.coordinates.length > 0
                              ? editor.coordinates[0][1]
                              : 0;
                          setEditor({
                            ...editor,
                            coordinates: [[lat, lng]],
                          });
                        }}
                        placeholder="55.7558"
                        className="w-full h-9 px-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Долгота
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={
                          editor.coordinates.length > 0
                            ? editor.coordinates[0][1]
                            : ""
                        }
                        onChange={(e) => {
                          const lng = Number(e.target.value);
                          const lat =
                            editor.coordinates.length > 0
                              ? editor.coordinates[0][0]
                              : 0;
                          setEditor({
                            ...editor,
                            coordinates: [[lat, lng]],
                          });
                        }}
                        placeholder="37.6173"
                        className="w-full h-9 px-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Color */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Цвет
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditor({ ...editor, color: c })}
                        className={`w-7 h-7 rounded-lg transition-all ${
                          editor.color === c
                            ? "ring-2 ring-offset-2 ring-offset-card scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{
                          backgroundColor: c,
                          ringColor: c,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Trigger */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Триггер
                  </label>
                  <div className="flex gap-1">
                    {TRIGGER_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() =>
                          setEditor({ ...editor, trigger: opt.key })
                        }
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                          editor.trigger === opt.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon name={opt.icon} className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nearby distance */}
                {editor.trigger === "nearby" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Дистанция (км)
                    </label>
                    <input
                      type="number"
                      value={editor.nearby_distance_km}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          nearby_distance_km: e.target.value,
                        })
                      }
                      min="0.1"
                      step="0.5"
                      className="w-full h-9 px-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                )}

                {/* Notification template */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Шаблон уведомления
                  </label>
                  <select
                    value={editor.notification_template_id}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        notification_template_id: e.target.value,
                      })
                    }
                    className="w-full h-9 px-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors appearance-none"
                  >
                    <option value="">Не привязан</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Город
                  </label>
                  <CitySearchDropdown
                    value={editor.city}
                    onChange={(city) =>
                      setEditor({ ...editor, city })
                    }
                    placeholder="Не указан"
                  />
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Активна
                  </span>
                  <button
                    onClick={() =>
                      setEditor({ ...editor, is_active: !editor.is_active })
                    }
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      editor.is_active ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        editor.is_active ? "left-5" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="px-4 py-3 border-t border-border flex gap-2 shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Icon
                    name={saving ? "Loader2" : "Check"}
                    className={`w-4 h-4 ${saving ? "animate-spin" : ""}`}
                  />
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
                <button
                  onClick={() => {
                    setEditor(null);
                    setSelectedId(null);
                    cancelDraw();
                  }}
                  className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/70 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel: map ──────────────────────────────────────── */}
        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          {/* Map header with city selector */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
            <Icon name="Map" className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Карта</h4>
            <CitySearchDropdown
              value={selectedCity}
              onChange={setSelectedCity}
              className="ml-auto w-56"
            />
          </div>

          {/* Draw mode indicator */}
          {drawMode && (
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 shrink-0">
              <Icon
                name="Pencil"
                className="w-3.5 h-3.5 text-amber-600 animate-pulse"
              />
              <span className="text-xs text-amber-700 font-medium">
                Режим рисования: {TYPE_LABEL[drawMode]}
              </span>
              <button
                onClick={cancelDraw}
                className="ml-auto text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Отменить
              </button>
            </div>
          )}

          {/* Map container */}
          <div ref={mapContainerRef} className="flex-1 min-h-0" />
        </div>
      </div>
      )}

      {/* ── Events view ──────────────────────────────────────────── */}
      {viewTab === "events" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Events toolbar */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
            <Icon name="History" className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              Журнал событий
            </h4>
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {filteredEvents.length}
            </span>

            <div className="ml-auto flex items-center gap-2">
              {/* Zone filter */}
              <select
                value={eventsFilterZone}
                onChange={(e) => setEventsFilterZone(e.target.value)}
                className="h-8 px-3 bg-muted/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors appearance-none"
              >
                <option value="">Все зоны</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>

              {/* Refresh */}
              <button
                onClick={loadEvents}
                disabled={eventsLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/70 transition-colors disabled:opacity-50"
              >
                <Icon
                  name="RefreshCw"
                  className={`w-3.5 h-3.5 ${eventsLoading ? "animate-spin" : ""}`}
                />
                Обновить
              </button>
            </div>
          </div>

          {/* Events table */}
          {eventsLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <Icon name="Loader2" className="w-5 h-5 mx-auto mb-2 animate-spin" />
              Загрузка событий...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Icon name="CalendarX2" className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Нет событий</p>
              <p className="text-xs mt-1 opacity-70">
                События появятся при срабатывании гео-зон
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      Дата
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      Водитель
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      Зона
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      Тип события
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      Расстояние (км)
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      Уведомление
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEvents.map((ev) => (
                    <tr
                      key={ev.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-xs text-foreground whitespace-nowrap">
                        {formatEventDate(ev.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground">
                        {ev.driver_name}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground">
                        {ev.zone_name}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            ev.event_type === "entry"
                              ? "bg-green-500/10 text-green-600"
                              : ev.event_type === "exit"
                                ? "bg-red-500/10 text-red-600"
                                : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          <Icon
                            name={
                              ev.event_type === "entry"
                                ? "LogIn"
                                : ev.event_type === "exit"
                                  ? "LogOut"
                                  : "Radar"
                            }
                            className="w-3 h-3"
                          />
                          {ev.event_type === "entry"
                            ? "Вход"
                            : ev.event_type === "exit"
                              ? "Выход"
                              : "Приближение"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground text-right tabular-nums">
                        {ev.distance_km != null
                          ? Number(ev.distance_km).toFixed(2)
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {ev.notification_sent ? (
                          <Icon
                            name="CheckCircle2"
                            className="w-4 h-4 text-green-500 mx-auto"
                          />
                        ) : (
                          <Icon
                            name="MinusCircle"
                            className="w-4 h-4 text-muted-foreground/40 mx-auto"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Delete confirmation modal ────────────────────────────── */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Icon name="Trash2" className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Удалить зону?
                </h4>
                <p className="text-xs text-muted-foreground">
                  {zones.find((z) => z.id === confirmDelete)?.name ||
                    "Выбранная зона"}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Это действие нельзя отменить. Связанные уведомления перестанут
              срабатывать.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                <Icon name="Trash2" className="w-4 h-4" />
                Удалить
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/70 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}