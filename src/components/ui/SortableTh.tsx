import Icon from "@/components/ui/icon";
import type { SortState } from "@/hooks/useTableSort";

interface SortableThProps {
  label: string;
  sortKey: string;
  sort: SortState;
  onToggle: (key: string) => void;
  className?: string;
}

export default function SortableTh({ label, sortKey, sort, onToggle, className = "" }: SortableThProps) {
  const active = sort.key === sortKey;
  const isAsc = active && sort.dir === "asc";
  const isDesc = active && sort.dir === "desc";

  return (
    <th className={`text-left py-2.5 font-medium ${className}`}>
      <button
        onClick={() => onToggle(sortKey)}
        className={`flex items-center gap-1 group transition-colors ${
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
        <span className="flex flex-col gap-[1px] ml-0.5">
          <Icon
            name="ChevronUp"
            className={`w-2.5 h-2.5 transition-opacity ${isAsc ? "opacity-100 text-primary" : "opacity-25 group-hover:opacity-50"}`}
          />
          <Icon
            name="ChevronDown"
            className={`w-2.5 h-2.5 -mt-[3px] transition-opacity ${isDesc ? "opacity-100 text-primary" : "opacity-25 group-hover:opacity-50"}`}
          />
        </span>
      </button>
    </th>
  );
}
