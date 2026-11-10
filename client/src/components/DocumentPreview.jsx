import { useEffect, useRef, useState } from 'react';
import { Download, Printer, Share2, Link2, MessageCircle, Mail, FileDown } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useToast } from '../lib/context.jsx';
import { post } from '../lib/api.js';
import { downloadDocPdf, printDocPdf, docPdfFile } from '../lib/pdf.js';
import { whatsappLink } from '../lib/format.js';

/** On-screen rendering of a document model (mirrors the PDF layout). */
export default function DocumentPreview({ model: m }) {
  const accent = m.accent;
  const minimal = m.template === 'minimal';
  const classic = m.template === 'classic';
  const labelColor = minimal ? '#64748b' : accent;
  return (
    <div className="relative mx-auto w-full max-w-[820px] overflow-hidden rounded-lg border border-slate-200 bg-white text-[13px] text-slate-800 shadow-sm">
      {m.template === 'modern' && <div className="h-1.5" style={{ background: accent }} />}
      <div className="p-5 sm:p-8">
        {/* Letterhead */}
        {classic ? (
          <div className="text-center">
            {m.business.logo && <img src={m.business.logo} alt="" className="mx-auto mb-2 max-h-16 max-w-[160px] object-contain" />}
            <div className="text-lg font-bold">
              {m.business.name} <span className="text-xs font-normal text-slate-500">{m.business.regNo}</span>
            </div>
            {m.business.lines.map((l, i) => (
              <div key={i} className="text-xs text-slate-500">
                {l}
              </div>
            ))}
            <div className="mt-3 border-t-2 border-b" style={{ borderColor: accent, height: 4 }} />
            <div className="mt-4 text-xl font-bold tracking-widest" style={{ color: accent }}>
              {m.title}
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: minimal ? '#e2e8f0' : accent + '55' }}>
            <div className="flex items-start gap-3">
              {m.business.logo && <img src={m.business.logo} alt="" className="max-h-16 max-w-[120px] object-contain" />}
              <div>
                <div className="text-base font-bold">{m.business.name}</div>
                {m.business.regNo && <div className="text-xs text-slate-500">{m.business.regNo}</div>}
                {m.business.lines.map((l, i) => (
                  <div key={i} className="text-xs text-slate-500">
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-2xl font-bold" style={{ color: minimal ? '#1e293b' : accent }}>
                {m.title}
              </div>
              <div className="text-sm text-slate-500">{m.number}</div>
            </div>
          </div>
        )}

        {/* Party + meta */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: labelColor }}>
              {m.billTo.title}
            </div>
            <div className="mt-1 font-semibold">{m.billTo.name}</div>
            {m.billTo.lines.map((l, i) => (
              <div key={i} className="text-slate-600">
                {l}
              </div>
            ))}
          </div>
          <dl className="space-y-1 sm:justify-self-end">
            {m.meta.map(([l, v]) => (
              <div key={l} className="flex gap-4 sm:justify-end">
                <dt className="w-32 text-slate-500 sm:text-right">{l}</dt>
                <dd className="font-semibold sm:min-w-[110px] sm:text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {m.kind === 'receipt' ? (
          <ReceiptBody m={m} />
        ) : (
          <>
            {m.event && (
              <div className={`mt-5 rounded-md p-3 ${minimal ? 'border border-slate-200' : ''}`} style={minimal ? {} : { background: accent + '12' }}>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: labelColor }}>
                  {m.lang === 'en' ? 'Event details' : 'Butiran acara'}
                </div>
                {m.event.map(([l, v]) => (
                  <div key={l} className="grid grid-cols-[110px_1fr] gap-2 sm:grid-cols-[140px_1fr]">
                    <span className="text-slate-500">{l}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr style={minimal ? {} : { background: accent, color: '#fff' }} className={minimal ? 'border-b-2 border-slate-800' : ''}>
                    <th className="w-8 px-2 py-2 text-center text-xs font-semibold">#</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold">{m.lang === 'en' ? 'Description' : 'Keterangan'}</th>
                    <th className="w-20 px-2 py-2 text-center text-xs font-semibold">{m.lang === 'en' ? 'Qty' : 'Kuantiti'}</th>
                    <th className="w-28 px-2 py-2 text-right text-xs font-semibold">{m.lang === 'en' ? 'Unit price' : 'Harga seunit'}</th>
                    <th className="w-28 px-2 py-2 text-right text-xs font-semibold">{m.lang === 'en' ? 'Amount (RM)' : 'Jumlah (RM)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {m.items.map((it, i) => (
                    <tr key={i} className="border-b border-slate-100 align-top" style={!minimal && i % 2 ? { background: accent + '0d' } : {}}>
                      <td className="px-2 py-2 text-center">{it.no}</td>
                      <td className="px-2 py-2">
                        <div className="font-medium">{it.description}</div>
                        {it.details && <div className="whitespace-pre-line text-xs text-slate-500">{it.details}</div>}
                      </td>
                      <td className="px-2 py-2 text-center">{it.qty}</td>
                      <td className="num px-2 py-2 text-right">{it.unitPrice}</td>
                      <td className="num px-2 py-2 text-right">{it.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-xs space-y-1">
                {m.totals.map(([l, v]) => (
                  <div key={l} className="flex justify-between px-2 text-slate-500">
                    <span>{l}</span>
                    <span className="num">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between rounded px-2 py-1.5 text-[15px] font-bold" style={minimal ? { background: '#f1f5f9' } : { background: accent, color: '#fff' }}>
                  <span>{m.grandTotal[0]}</span>
                  <span className="num">{m.grandTotal[1]}</span>
                </div>
                {(m.afterTotals || []).map(([l, v]) => (
                  <div key={l} className="flex justify-between px-2 text-slate-500">
                    <span>{l}</span>
                    <span className="num">{v}</span>
                  </div>
                ))}
                {m.balance && (
                  <div className="flex justify-between rounded px-2 py-1.5 text-[15px] font-bold" style={{ background: minimal ? '#f1f5f9' : accent + '26' }}>
                    <span>{m.balance[0]}</span>
                    <span className="num">{m.balance[1]}</span>
                  </div>
                )}
              </div>
            </div>
            {m.payments?.length > 0 && (
              <div className="mt-5">
                <div className="mb-1 text-xs font-semibold">{m.lang === 'en' ? 'Payments received' : 'Bayaran diterima'}</div>
                {m.payments.map((p) => (
                  <div key={p[1]} className="flex justify-between border-b border-slate-100 py-1 text-xs text-slate-600">
                    <span>
                      {p[0]} &middot; {p[1]} &middot; {p[2]}
                    </span>
                    <span className="num">{p[3]}</span>
                  </div>
                ))}
              </div>
            )}
            {m.bank && (
              <div className="mt-5 max-w-sm rounded-md border p-3" style={{ borderColor: minimal ? '#e2e8f0' : accent + '80' }}>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: labelColor }}>
                  {m.lang === 'en' ? 'Bank details' : 'Maklumat bank'}
                </div>
                {m.bank.map(([l, v]) => (
                  <div key={l} className="grid grid-cols-[110px_1fr] gap-2">
                    <span className="text-slate-500">{l}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {m.sections.map((s) => (
              <div key={s.title} className="mt-4">
                <div className="text-xs font-semibold">{s.title}</div>
                <p className="whitespace-pre-line text-xs text-slate-500">{s.text}</p>
              </div>
            ))}
            {m.acceptance && (
              <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-slate-500">
                <div className="border-t border-slate-400 pt-1">
                  {m.lang === 'en' ? 'Prepared by' : 'Disediakan oleh'}
                  <br />
                  {m.business.name}
                </div>
                <div className="border-t border-slate-400 pt-1">
                  {m.lang === 'en' ? 'Customer acceptance' : 'Penerimaan pelanggan'}
                  <br />
                  {m.lang === 'en' ? 'Signature / Name / Date' : 'Tandatangan / Nama / Tarikh'}
                </div>
              </div>
            )}
          </>
        )}
        {m.footer && <div className="mt-8 border-t border-slate-200 pt-2 text-center text-[11px] text-slate-400">{m.footer}</div>}
      </div>
      {m.stamp && (
        <div
          className="pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -rotate-[20deg] rounded-lg border-4 px-6 py-2 text-5xl font-black uppercase tracking-widest opacity-20 sm:text-6xl"
          style={{ color: m.stampTone === 'green' ? '#16a34a' : m.stampTone === 'red' ? '#dc2626' : accent, borderColor: 'currentColor' }}
        >
          {m.stamp}
        </div>
      )}
    </div>
  );
}

function ReceiptBody({ m }) {
  const minimal = m.template === 'minimal';
  return (
    <>
      <div className="mt-5 rounded-lg border p-4" style={minimal ? { borderColor: '#e2e8f0', background: '#f8fafc' } : { borderColor: m.accent + '80', background: m.accent + '12' }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: minimal ? '#64748b' : m.accent }}>
            {m.lang === 'en' ? 'Amount received' : 'Amaun diterima'}
          </span>
          <span className="num text-2xl font-bold sm:text-3xl">{m.amount}</span>
        </div>
        <div className="mt-1 text-xs italic text-slate-500">{m.amountWords}</div>
      </div>
      <dl className="mt-4 divide-y divide-slate-100">
        {m.details.map(([l, v]) => (
          <div key={l} className="grid grid-cols-[130px_1fr] gap-2 py-1.5 sm:grid-cols-[170px_1fr]">
            <dt className="text-slate-500">{l}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs space-y-1">
          {m.summary.map(([l, v], i) => (
            <div
              key={l}
              className={`flex justify-between px-2 ${i === m.summary.length - 1 ? 'rounded py-1.5 font-bold' : 'text-slate-500'}`}
              style={i === m.summary.length - 1 ? { background: minimal ? '#f1f5f9' : m.accent + '26' } : {}}
            >
              <span>{l}</span>
              <span className="num">{v}</span>
            </div>
          ))}
        </div>
      </div>
      {m.voidReason && (
        <p className="mt-3 text-sm font-semibold text-red-600">
          {m.lang === 'en' ? 'Void reason' : 'Sebab dibatalkan'}: {m.voidReason}
        </p>
      )}
      <div className="mt-10 flex flex-wrap items-end justify-between gap-4 text-xs text-slate-500">
        <div className="w-60 border-t border-slate-400 pt-1">
          {m.lang === 'en' ? 'Received by' : 'Diterima oleh'}: {m.receivedBy}
          <br />
          {m.business.name}
        </div>
        <div className="italic">{m.lang === 'en' ? 'This is a computer-generated receipt. No signature is required.' : 'Resit ini dijana oleh komputer dan tidak memerlukan tandatangan.'}</div>
      </div>
    </>
  );
}

/**
 * Download / print / share actions for a document.
 * kind: 'quotation' | 'invoice' | 'receipt'; shareId is the record id; apiBase e.g. '/quotations'.
 */
export function DocActions({ model, shareApi, phone, email, onShared, compact }) {
  const { t } = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error(e);
    } finally {
      setBusy(null);
    }
  };
  const link = async () => {
    const { token } = await post(shareApi);
    return `${window.location.origin}/p/${model.kind}/${token}`;
  };
  const message = (url) => t('share.message', { doc: model.title, no: model.number, business: model.business.name, url });

  const actions = [
    {
      key: 'copy',
      icon: Link2,
      label: t('share.copyLink'),
      fn: async () => {
        const url = await link();
        try {
          await navigator.clipboard.writeText(url);
          toast.success(t('share.copied'));
        } catch {
          window.prompt(t('share.copyLink'), url);
        }
        onShared?.();
      },
    },
    {
      key: 'wa',
      icon: MessageCircle,
      label: 'WhatsApp',
      fn: async () => {
        const w = window.open('about:blank', '_blank');
        const url = await link();
        const target = phone ? whatsappLink(phone, message(url)) : `https://wa.me/?text=${encodeURIComponent(message(url))}`;
        if (w) w.location.href = target;
        else window.location.href = target;
        onShared?.();
      },
    },
    {
      key: 'mail',
      icon: Mail,
      label: t('share.email'),
      fn: async () => {
        const url = await link();
        window.location.href = `mailto:${email || ''}?subject=${encodeURIComponent(`${model.title} ${model.number} - ${model.business.name}`)}&body=${encodeURIComponent(message(url))}`;
        onShared?.();
      },
    },
  ];
  if (typeof navigator !== 'undefined' && navigator.canShare) {
    actions.push({
      key: 'native',
      icon: FileDown,
      label: t('share.sharePdf'),
      fn: async () => {
        const file = await docPdfFile(model);
        if (!navigator.canShare({ files: [file] })) throw new Error(t('share.notSupported'));
        await navigator.share({ files: [file], title: `${model.title} ${model.number}`, text: `${model.title} ${model.number}` });
        onShared?.();
      },
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn-secondary" disabled={!!busy} onClick={() => run('pdf', () => downloadDocPdf(model))}>
        <Download className="h-4 w-4" /> {compact ? 'PDF' : t('doc.downloadPdf')}
      </button>
      <button className="btn-secondary" disabled={!!busy} onClick={() => run('print', () => printDocPdf(model))}>
        <Printer className="h-4 w-4" /> {t('common.print')}
      </button>
      {shareApi && (
        <div className="relative" ref={ref}>
          <button className="btn-secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <Share2 className="h-4 w-4" /> {t('share.share')}
          </button>
          {open && (
            <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              {actions.map((a) => (
                <button
                  key={a.key}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                  disabled={!!busy}
                  onClick={() => {
                    setOpen(false);
                    run(a.key, a.fn);
                  }}
                >
                  <a.icon className="h-4 w-4 text-slate-500" /> {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
