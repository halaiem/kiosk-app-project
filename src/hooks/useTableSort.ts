import { useState, useMemo } from "react";

export type SortDir = "asc" | "desc" | null;

export interface SortState {
  key: string | null;
  dir: SortDir;
}

export function useTableSort<T extends Record<string, unknown>>(data: T[]) {
  const [sort, setSort] = useState<SortState>({ key: null, dir: null });

  const toggle = (key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  };

  const sorted = useMemo(() => {
    if (!sort.key || !sort.dir) return data;
    const k = sort.key;
    return [...data].sort((a, b) => {
      const av = a[k];
      const bv = b[k];
      if (av == null && bv == null) return 0;
      if (av == null) return sort.dir === "asc" ? 1 : -1;
      if (bv == null) return sort.dir === "asc" ? -1 : 1;
      if (typeof av === "number" && typeof bv === "number") {
        return sort.dir === "asc" ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      const cmp = as.localeCompare(bs, "ru");
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [data, sort]);

  return { sort, toggle, sorted };
}
