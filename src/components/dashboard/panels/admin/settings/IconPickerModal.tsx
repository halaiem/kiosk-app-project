import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import * as LucideIcons from "lucide-react";
import Icon from "@/components/ui/icon";

// Get all icon names - filter for PascalCase component names that are actual React components
const ALL_ICON_NAMES = Object.entries(LucideIcons)
  .filter(([key, val]) => {
    if (!/^[A-Z][a-zA-Z0-9]+$/.test(key)) return false;
    if (key === "Icon" || key === "createLucideIcon") return false;
    // Check it's a React forwardRef component (lucide icons are forwardRef)
    if (typeof val !== "object" || val === null) return false;
    if ((val as Record<string, unknown>).$$typeof) return true;
    if (typeof val === "function") return true;
    return false;
  })
  .map(([key]) => key)
  .sort();

const BATCH_SIZE = 300;

interface IconPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  selected?: string;
}

export default function IconPickerModal({
  open,
  onClose,
  onSelect,
  selected,
}: IconPickerModalProps) {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setVisibleCount(BATCH_SIZE);
      // Focus search input on open
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_ICON_NAMES;
    const q = search.trim().toLowerCase();
    return ALL_ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  const visibleIcons = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const hasMore = filtered.length > visibleCount;

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => prev + BATCH_SIZE);
  }, []);

  const handleSelect = useCallback(
    (iconName: string) => {
      onSelect(iconName);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center pt-[10vh] px-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="relative flex-1">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              size={18}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(BATCH_SIZE);
              }}
              placeholder="Поиск иконки..."
              className="w-full h-10 pl-10 pr-4 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Закрыть"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Count info */}
        <div className="px-4 py-2 text-xs text-muted-foreground shrink-0">
          {filtered.length === ALL_ICON_NAMES.length
            ? `${ALL_ICON_NAMES.length} иконок`
            : `${filtered.length} из ${ALL_ICON_NAMES.length}`}
        </div>

        {/* Icons grid */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 pb-4"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Icon name="SearchX" size={40} className="mb-3 opacity-40" />
              <p className="text-sm">Ничего не найдено</p>
              <p className="text-xs mt-1 opacity-70">
                Попробуйте другой запрос
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                {visibleIcons.map((iconName) => {
                  const isSelected = selected === iconName;
                  return (
                    <button
                      key={iconName}
                      onClick={() => handleSelect(iconName)}
                      title={iconName}
                      className={`w-full aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary ring-1 ring-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon name={iconName} size={20} />
                      <span className="text-[9px] leading-tight mt-1 max-w-full truncate px-0.5">
                        {iconName}
                      </span>
                    </button>
                  );
                })}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-4 pb-2">
                  <button
                    onClick={handleShowMore}
                    className="px-4 py-2 text-sm text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors"
                  >
                    Показать ещё ({filtered.length - visibleCount} оставшихся)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}