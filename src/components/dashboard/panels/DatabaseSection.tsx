import React, { useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import Icon from '@/components/ui/icon';

const DB_API = 'https://functions.poehali.dev/22cfaab8-03c4-4688-aefc-5435cc7b4675';

interface TableInfo {
  name: string;
  columns: number;
  rows: number;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  max_length: number | null;
}

type ViewMode = 'tables' | 'data';

export default function DatabaseSection() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tables');
  const [activeTable, setActiveTable] = useState('');
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [pkColumns, setPkColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [colNames, setColNames] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');
  const [loadingData, setLoadingData] = useState(false);
  const [editCell, setEditCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const LIMIT = 50;

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${DB_API}?action=tables`);
      const data = await res.json();
      setTables(data.tables || []);
      setSchema(data.schema || '');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const openTable = useCallback(async (tableName: string) => {
    setActiveTable(tableName);
    setViewMode('data');
    setPage(0);
    setSortCol('');
    setSortDir('ASC');
    setEditCell(null);
    setAddingRow(false);

    const [colRes, dataRes] = await Promise.all([
      fetch(`${DB_API}?action=columns&table=${tableName}`),
      fetch(`${DB_API}?action=data&table=${tableName}&limit=${LIMIT}&offset=0`),
    ]);
    const colData = await colRes.json();
    const rowData = await dataRes.json();

    setColumns(colData.columns || []);
    setPkColumns(colData.primary_keys || []);
    setRows(rowData.rows || []);
    setColNames(rowData.columns || []);
    setTotal(rowData.total || 0);
  }, []);

  const fetchData = useCallback(async (p: number, sc: string, sd: 'ASC' | 'DESC') => {
    setLoadingData(true);
    try {
      const params = new URLSearchParams({
        action: 'data',
        table: activeTable,
        limit: String(LIMIT),
        offset: String(p * LIMIT),
      });
      if (sc) { params.set('sort', sc); params.set('dir', sd); }
      const res = await fetch(`${DB_API}?${params}`);
      const data = await res.json();
      setRows(data.rows || []);
      setColNames(data.columns || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    }
    setLoadingData(false);
  }, [activeTable]);

  const handleSort = useCallback((col: string) => {
    const newDir = sortCol === col && sortDir === 'ASC' ? 'DESC' : 'ASC';
    setSortCol(col);
    setSortDir(newDir);
    setPage(0);
    fetchData(0, col, newDir);
  }, [sortCol, sortDir, fetchData]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    fetchData(newPage, sortCol, sortDir);
  }, [sortCol, sortDir, fetchData]);

  const startEdit = useCallback((rowIdx: number, col: string) => {
    const val = rows[rowIdx]?.[col];
    setEditCell({ row: rowIdx, col });
    setEditValue(val === null || val === undefined ? '' : String(val));
    setTimeout(() => editRef.current?.focus(), 50);
  }, [rows]);

  const saveEdit = useCallback(async () => {
    if (!editCell || !activeTable || pkColumns.length === 0) return;
    const row = rows[editCell.row];
    const pkValues = pkColumns.map((pk) => row[pk]);
    setSaving(true);
    try {
      await fetch(`${DB_API}?action=update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: activeTable,
          pk_columns: pkColumns,
          pk_values: pkValues,
          updates: { [editCell.col]: editValue === '' ? null : editValue },
        }),
      });
      setRows((prev) => prev.map((r, i) =>
        i === editCell.row ? { ...r, [editCell.col]: editValue === '' ? null : editValue } : r
      ));
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
    setEditCell(null);
  }, [editCell, editValue, activeTable, pkColumns, rows]);

  const handleInsertRow = useCallback(async () => {
    if (!activeTable) return;
    const filtered: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(newRow)) {
      if (v !== '') filtered[k] = v;
    }
    if (Object.keys(filtered).length === 0) return;
    setSaving(true);
    try {
      await fetch(`${DB_API}?action=insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: activeTable, row: filtered }),
      });
      setAddingRow(false);
      setNewRow({});
      fetchData(page, sortCol, sortDir);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }, [activeTable, newRow, page, sortCol, sortDir, fetchData]);

  const handleDeleteRow = useCallback(async (rowIdx: number) => {
    if (!activeTable || pkColumns.length === 0) return;
    const row = rows[rowIdx];
    const pkValues = pkColumns.map((pk) => row[pk]);
    setSaving(true);
    try {
      await fetch(`${DB_API}?action=delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: activeTable, pk_columns: pkColumns, pk_values: pkValues }),
      });
      setRows((prev) => prev.filter((_, i) => i !== rowIdx));
      setTotal((t) => t - 1);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
    setDeleteConfirm(null);
  }, [activeTable, pkColumns, rows]);

  const toggleSelect = useCallback((name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected((prev) => prev.size === tables.length ? new Set() : new Set(tables.map((t) => t.name)));
  }, [tables]);

  const exportSelected = useCallback(async () => {
    const toExport = selectMode && selected.size > 0 ? [...selected] : tables.map((t) => t.name);
    if (toExport.length === 0) return;
    setExporting(true);
    const zip = new JSZip();

    for (const tbl of toExport) {
      try {
        const res = await fetch(`${DB_API}?action=export&table=${tbl}`);
        const data = await res.json();
        if (data.columns && data.rows) {
          const header = data.columns.join(',');
          const csvRows = data.rows.map((r: Record<string, unknown>) =>
            data.columns.map((c: string) => {
              const v = r[c];
              if (v === null || v === undefined) return '';
              const s = String(v);
              return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
            }).join(',')
          );
          zip.file(`${tbl}.csv`, header + '\n' + csvRows.join('\n'));
        }
      } catch {
        // skip
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'database-export.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExporting(false);
  }, [selectMode, selected, tables]);

  const filteredTables = search.trim()
    ? tables.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tables;

  const totalPages = Math.ceil(total / LIMIT);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="Loader" className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 88px)' }}>
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-foreground">База данных</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {viewMode === 'tables'
              ? `${tables.length} таблиц · схема: ${schema}`
              : `${activeTable} · ${total} строк`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'data' && (
            <button
              onClick={() => { setViewMode('tables'); setActiveTable(''); }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-white/10 text-white/70 hover:bg-white/20 transition-colors font-medium"
            >
              <Icon name="ArrowLeft" className="w-3.5 h-3.5" />
              Все таблицы
            </button>
          )}
          {viewMode === 'tables' && (
            <>
              <button
                onClick={() => { setSelectMode((v) => !v); if (selectMode) setSelected(new Set()); }}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs transition-colors font-medium ${selectMode ? 'bg-cyan-600 text-white ring-2 ring-cyan-400/50' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              >
                <Icon name={selectMode ? 'CheckSquare' : 'Square'} className="w-3.5 h-3.5" />
                Выбрать
              </button>
              <button
                onClick={exportSelected}
                disabled={exporting}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors font-medium"
              >
                <Icon name={exporting ? 'Loader' : 'Download'} className={`w-3.5 h-3.5 ${exporting ? 'animate-spin' : ''}`} />
                {exporting ? 'Экспорт...' : selectMode && selected.size > 0 ? `Скачать (${selected.size})` : 'Скачать CSV'}
              </button>
            </>
          )}
          {viewMode === 'data' && pkColumns.length > 0 && (
            <>
              <button
                onClick={() => { setAddingRow(true); setNewRow({}); }}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-500 transition-colors font-medium"
              >
                <Icon name="Plus" className="w-3.5 h-3.5" />
                Добавить строку
              </button>
              <button
                onClick={() => exportSelected()}
                disabled={exporting}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors font-medium"
              >
                <Icon name={exporting ? 'Loader' : 'Download'} className={`w-3.5 h-3.5 ${exporting ? 'animate-spin' : ''}`} />
                CSV
              </button>
            </>
          )}
          <button
            onClick={fetchTables}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-white/10 text-white/70 hover:bg-white/20 transition-colors font-medium"
          >
            <Icon name="RefreshCw" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {viewMode === 'tables' ? (
        <div className="flex-1 bg-[#0d1117] rounded-xl border border-border overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
          <div className="p-3 border-b border-white/10 shrink-0 flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-black/30 rounded px-2 py-1 flex-1 max-w-xs">
              <Icon name="Search" className="w-3 h-3 text-white/30 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск таблиц..."
                className="bg-transparent text-xs text-white/70 placeholder:text-white/25 focus:outline-none flex-1 min-w-0"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60">
                  <Icon name="X" className="w-3 h-3" />
                </button>
              )}
            </div>
            {selectMode && (
              <button onClick={selectAll} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium">
                {selected.size === tables.length ? 'Снять всё' : 'Выбрать всё'}
              </button>
            )}
            {selectMode && selected.size > 0 && (
              <span className="text-[10px] text-cyan-400/60">{selected.size} из {tables.length}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#161b22] text-left">
                  {selectMode && <th className="w-8 px-2 py-2" />}
                  <th className="px-4 py-2 text-[10px] text-white/30 uppercase tracking-wider font-semibold">Таблица</th>
                  <th className="px-4 py-2 text-[10px] text-white/30 uppercase tracking-wider font-semibold text-right">Колонки</th>
                  <th className="px-4 py-2 text-[10px] text-white/30 uppercase tracking-wider font-semibold text-right">Строки</th>
                  <th className="px-4 py-2 text-[10px] text-white/30 uppercase tracking-wider font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filteredTables.map((t) => (
                  <tr
                    key={t.name}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${selected.has(t.name) ? 'bg-cyan-500/10' : ''}`}
                    onClick={() => selectMode ? toggleSelect(t.name) : openTable(t.name)}
                  >
                    {selectMode && (
                      <td className="px-2 py-2">
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(t.name); }}>
                          <Icon name={selected.has(t.name) ? 'CheckSquare' : 'Square'} className={`w-3.5 h-3.5 ${selected.has(t.name) ? 'text-cyan-400' : 'text-white/30'}`} />
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Icon name="Table" className="w-3.5 h-3.5 text-blue-400/70 shrink-0" />
                        <span className="text-xs text-white/80 font-mono">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs text-white/40">{t.columns}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs font-medium ${t.rows > 0 ? 'text-emerald-400' : t.rows < 0 ? 'text-white/20' : 'text-white/30'}`}>
                        {t.rows < 0 ? '—' : t.rows.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Icon name="ChevronRight" className="w-3 h-3 text-white/20 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-[#0d1117] rounded-xl border border-border overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
          {columns.length > 0 && (
            <div className="px-3 py-2 border-b border-white/10 shrink-0 flex items-center gap-2 flex-wrap">
              {columns.map((c) => (
                <span
                  key={c.name}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${pkColumns.includes(c.name) ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/40'}`}
                  title={`${c.type}${c.nullable ? ', nullable' : ''}${c.default ? `, default: ${c.default}` : ''}`}
                >
                  {pkColumns.includes(c.name) && <Icon name="Key" className="w-2 h-2 inline mr-0.5" />}
                  {c.name}
                  <span className="text-white/20 ml-1">{c.type}</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-auto relative">
            {loadingData && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                <Icon name="Loader" className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#161b22]">
                  <th className="w-8 px-2 py-2 text-[10px] text-white/30">#</th>
                  {colNames.map((col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="px-3 py-2 text-[10px] text-white/30 uppercase tracking-wider font-semibold text-left cursor-pointer hover:text-white/60 whitespace-nowrap select-none"
                    >
                      {col}
                      {sortCol === col && (
                        <Icon name={sortDir === 'ASC' ? 'ChevronUp' : 'ChevronDown'} className="w-2.5 h-2.5 inline ml-0.5" />
                      )}
                    </th>
                  ))}
                  {pkColumns.length > 0 && <th className="w-8 px-2 py-2" />}
                </tr>
              </thead>
              <tbody>
                {addingRow && (
                  <tr className="bg-emerald-500/10 border-b border-emerald-500/20">
                    <td className="px-2 py-1 text-center">
                      <Icon name="Plus" className="w-3 h-3 text-emerald-400 inline" />
                    </td>
                    {colNames.map((col) => {
                      const colInfo = columns.find((c) => c.name === col);
                      const hasDefault = colInfo?.default != null;
                      return (
                        <td key={col} className="px-1 py-1">
                          <input
                            value={newRow[col] || ''}
                            onChange={(e) => setNewRow((prev) => ({ ...prev, [col]: e.target.value }))}
                            placeholder={hasDefault ? 'auto' : ''}
                            className="w-full bg-black/40 text-[11px] text-white/80 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono focus:outline-none focus:border-emerald-400 min-w-[60px]"
                          />
                        </td>
                      );
                    })}
                    <td className="px-1 py-1">
                      <div className="flex gap-0.5">
                        <button onClick={handleInsertRow} disabled={saving} className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center hover:bg-emerald-500">
                          <Icon name="Check" className="w-3 h-3 text-white" />
                        </button>
                        <button onClick={() => setAddingRow(false)} className="w-5 h-5 rounded bg-white/10 flex items-center justify-center hover:bg-white/20">
                          <Icon name="X" className="w-3 h-3 text-white/60" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-2 py-1.5 text-center text-[10px] text-white/20 font-mono">{page * LIMIT + rowIdx + 1}</td>
                    {colNames.map((col) => {
                      const val = row[col];
                      const isEditing = editCell?.row === rowIdx && editCell?.col === col;
                      const isPk = pkColumns.includes(col);
                      return (
                        <td
                          key={col}
                          className={`px-3 py-1.5 text-[11px] font-mono max-w-[200px] ${isPk ? 'text-amber-300/80' : ''}`}
                          onDoubleClick={() => !isPk && pkColumns.length > 0 && startEdit(rowIdx, col)}
                        >
                          {isEditing ? (
                            <input
                              ref={editRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') setEditCell(null);
                              }}
                              onBlur={() => saveEdit()}
                              className="w-full bg-black/50 text-[11px] text-white px-1.5 py-0.5 rounded border border-blue-500/50 font-mono focus:outline-none min-w-[60px]"
                            />
                          ) : (
                            <span className={`truncate block ${val === null ? 'text-white/15 italic' : 'text-white/60'}`} title={String(val ?? '')}>
                              {val === null ? 'NULL' : String(val).length > 50 ? String(val).slice(0, 50) + '…' : String(val)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {pkColumns.length > 0 && (
                      <td className="px-1 py-1.5">
                        {deleteConfirm === rowIdx ? (
                          <div className="flex gap-0.5">
                            <button onClick={() => handleDeleteRow(rowIdx)} className="w-5 h-5 rounded bg-red-600 flex items-center justify-center hover:bg-red-500">
                              <Icon name="Check" className="w-3 h-3 text-white" />
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="w-5 h-5 rounded bg-white/10 flex items-center justify-center hover:bg-white/20">
                              <Icon name="X" className="w-3 h-3 text-white/60" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(rowIdx)}
                            className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20"
                            style={{ opacity: 0 }}
                            onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                            onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0'; }}
                          >
                            <Icon name="Trash2" className="w-2.5 h-2.5 text-red-400" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={colNames.length + 2} className="text-center py-12 text-white/20 text-sm">
                      Таблица пуста
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 shrink-0 bg-[#161b22]">
              <span className="text-[10px] text-white/30">
                {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} из {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0}
                  className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-20"
                >
                  <Icon name="ChevronLeft" className="w-3 h-3 text-white/60" />
                </button>
                <span className="text-[10px] text-white/40 px-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-20"
                >
                  <Icon name="ChevronRight" className="w-3 h-3 text-white/60" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
