import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface VehicleOption {
  id: string;
  number: string;
  vinNumber?: string;
  boardNumber?: string;
}

interface AddApiFormProps {
  vehicles: VehicleOption[];
  saving: boolean;
  onCancel: () => void;
  onCreate: (data: {
    vehicleId: string;
    apiName: string;
    apiType: string;
    apiUrl: string;
    apiKey: string;
    pollInterval: string;
  }) => void;
}

export default function AddApiForm({
  vehicles,
  saving,
  onCancel,
  onCreate,
}: AddApiFormProps) {
  const [fVehicleId, setFVehicleId] = useState("");
  const [vehiclePopoverOpen, setVehiclePopoverOpen] = useState(false);
  const [fApiName, setFApiName] = useState("");
  const [fApiType, setFApiType] = useState("fema");
  const [fApiUrl, setFApiUrl] = useState("");
  const [fApiKey, setFApiKey] = useState("");
  const [fPollInterval, setFPollInterval] = useState("60");

  const handleCreate = () => {
    onCreate({
      vehicleId: fVehicleId,
      apiName: fApiName,
      apiType: fApiType,
      apiUrl: fApiUrl,
      apiKey: fApiKey,
      pollInterval: fPollInterval,
    });
  };

  return (
    <div className="px-5 py-4 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="Plug" className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          Новая API конфигурация
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Транспортное средство *
          </label>
          <Popover open={vehiclePopoverOpen} onOpenChange={setVehiclePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <span className={fVehicleId ? "text-foreground truncate" : "text-muted-foreground"}>
                  {fVehicleId
                    ? (() => {
                        const v = vehicles.find((v) => v.id === fVehicleId);
                        if (!v) return "Выберите ТС по VIN";
                        return v.vinNumber
                          ? `${v.vinNumber} — #${v.boardNumber ?? v.number}`
                          : `#${v.boardNumber ?? v.number}`;
                      })()
                    : "Выберите ТС по VIN"}
                </span>
                <Icon name="ChevronsUpDown" className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Поиск по VIN..." />
                <CommandList>
                  <CommandEmpty>Ничего не найдено</CommandEmpty>
                  <CommandGroup>
                    {vehicles.map((v) => {
                      const label = v.vinNumber
                        ? `${v.vinNumber} — #${v.boardNumber ?? v.number}`
                        : `#${v.boardNumber ?? v.number}`;
                      return (
                        <CommandItem
                          key={v.id}
                          value={`${v.vinNumber ?? ""} ${v.boardNumber ?? ""} ${v.number}`}
                          onSelect={() => {
                            setFVehicleId(v.id);
                            setVehiclePopoverOpen(false);
                          }}
                          className="flex items-center justify-between"
                        >
                          <span className="truncate">{label}</span>
                          {fVehicleId === v.id && (
                            <Icon name="Check" className="w-4 h-4 text-primary shrink-0 ml-2" />
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Название API *
          </label>
          <input
            type="text"
            value={fApiName}
            onChange={(e) => setFApiName(e.target.value)}
            placeholder="ФЕМА Борт-5001"
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Тип API
          </label>
          <select
            value={fApiType}
            onChange={(e) => setFApiType(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="fema">ФЕМА</option>
            <option value="obd">OBD-II</option>
            <option value="custom">Пользовательский</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            URL эндпоинта *
          </label>
          <input
            type="text"
            value={fApiUrl}
            onChange={(e) => setFApiUrl(e.target.value)}
            placeholder="https://api.fema.ru/v1/diag"
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            API ключ
          </label>
          <input
            type="password"
            value={fApiKey}
            onChange={(e) => setFApiKey(e.target.value)}
            placeholder="sk_..."
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Интервал опроса (сек)
          </label>
          <input
            type="number"
            value={fPollInterval}
            onChange={(e) => setFPollInterval(e.target.value)}
            min={10}
            max={3600}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          Отмена
        </button>
        <button
          onClick={handleCreate}
          disabled={
            !fVehicleId || !fApiName.trim() || !fApiUrl.trim() || saving
          }
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Создаю..." : "Создать"}
        </button>
      </div>
    </div>
  );
}
