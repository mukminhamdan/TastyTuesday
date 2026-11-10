import { useEffect, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { SearchInput, EmptyState, Loading } from './ui.jsx';

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

/**
 * Generic table with search, sorting, filters and pagination.
 * columns: [{ key, label, render?, sort? (fn|false), align?, hide?: 'sm'|'md'|'lg', className? }]
 */
export default function DataTable({
  rows,
  columns,
  loading,
  searchText,
  searchPlaceholder,
  filters,
  toolbarRight,
  onRowClick,
  onView,
  onEdit,
  onDelete,
  defaultSort,
  pageSize: initialPageSize = 10,
  emptyTitle,
  emptyMessage,
  emptyAction,
  footer,
  storageKey,
}) {
  const { t } = useT();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(defaultSort || null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem(`bms-ps:${storageKey}`)) || initialPageSize;
    } catch {
      return initialPageSize;
    }
  });

  const filtered = useMemo(() => {
    let out = rows || [];
    const needle = q.trim().toLowerCase();
    if (needle && searchText) out = out.filter((r) => searchText(r).toLowerCase().includes(needle));
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      const getter = typeof col?.sort === 'function' ? col.sort : (r) => r[sort.key];
      out = [...out].sort((a, b) => {
        const va = getter(a);
        const vb = getter(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' });
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, q, sort, columns, searchText]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => setPage(1), [q, rows, pageSize]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasActions = onView || onEdit || onDelete;

  const toggleSort = (col) => {
    if (col.sort === false) return;
    setSort((s) => (s?.key === col.key ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: 'asc' }));
  };

  return (
    <div className="card">
      <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        {searchText && <SearchInput value={q} onChange={setQ} placeholder={searchPlaceholder || t('common.search')} className="sm:w-72" />}
        {filters && <div className="flex flex-1 flex-wrap items-center gap-2">{filters}</div>}
        {toolbarRight && <div className="flex items-center gap-2 sm:ml-auto">{toolbarRight}</div>}
      </div>
      {loading && !rows ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState title={q ? t('common.noResults') : emptyTitle || t('common.noRecords')} message={q ? null : emptyMessage} action={q ? null : emptyAction} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={`th ${c.align === 'right' ? 'text-right' : ''} ${HIDE[c.hide] || ''} ${c.sort === false ? '' : 'cursor-pointer select-none hover:text-slate-700'}`}
                      onClick={() => toggleSort(c)}
                      aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      <span className={`inline-flex items-center gap-1 ${c.align === 'right' ? 'flex-row-reverse' : ''}`}>
                        {c.label}
                        {c.sort !== false &&
                          (sort?.key === c.key ? (
                            sort.dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                          ))}
                      </span>
                    </th>
                  ))}
                  {hasActions && <th className="th text-right">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r, i) => (
                  <tr key={r.id ?? i} className={onRowClick ? 'cursor-pointer hover:bg-brand-50/40' : 'hover:bg-slate-50/60'} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                    {columns.map((c) => (
                      <td key={c.key} className={`td ${c.align === 'right' ? 'num text-right' : ''} ${HIDE[c.hide] || ''} ${c.className || ''}`}>
                        {c.render ? c.render(r) : (r[c.key] ?? '-')}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="td whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex gap-0.5">
                          {onView && (
                            <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700" title={t('common.view')} onClick={() => onView(r)}>
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {onEdit && (onEdit.when ? onEdit.when(r) : true) && (
                            <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700" title={t('common.edit')} onClick={() => (onEdit.fn || onEdit)(r)}>
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" title={t('common.delete')} onClick={() => onDelete(r)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {footer && <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">{footer(filtered)}</tfoot>}
            </table>
          </div>
          <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 px-3 py-2.5 text-sm text-slate-500 sm:flex-row">
            <div className="flex items-center gap-2">
              <span>
                {t('table.showing', {
                  from: (page - 1) * pageSize + 1,
                  to: Math.min(page * pageSize, filtered.length),
                  total: filtered.length,
                })}
              </span>
              <select
                className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  try {
                    localStorage.setItem(`bms-ps:${storageKey}`, e.target.value);
                  } catch {
                    /* ignore */
                  }
                }}
                aria-label={t('table.perPage')}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / {t('table.page')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="previous">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2">
                {page} / {pages}
              </span>
              <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="next">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Small <select> used in table toolbars. */
export function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <select className="input w-auto py-1.5 pr-8" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
