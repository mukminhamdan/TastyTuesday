import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { UserPlus, Pencil, Trash2, Phone, Mail, ArrowLeft, ClipboardList, FileText, FileSpreadsheet, MessageCircle } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useAuth, useConfirm, useFetch, useSettings, useToast } from '../lib/context.jsx';
import { del } from '../lib/api.js';
import DataTable, { FilterSelect } from '../components/DataTable.jsx';
import { PageHeader, Card, StatCard, StatusBadge, Loading, ErrorState, InfoRow, Tabs, Badge } from '../components/ui.jsx';
import { CustomerFormModal } from '../components/forms.jsx';
import { fmtRM, fmtDate, fmtDateTime, telLink, whatsappLink } from '../lib/format.js';

export default function Customers() {
  const { t } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useFetch('/customers');
  const [modal, setModal] = useState(null);
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (params.get('new')) {
      setModal({});
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const remove = async (c) => {
    if (!(await confirm({ title: t('cust.deleteTitle'), message: t('cust.deleteMsg', { name: c.name }), danger: true, confirmText: t('common.delete') }))) return;
    try {
      await del(`/customers/${c.id}`);
      toast.success(t('common.deleted'));
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const rows = (data || []).filter((c) => !category || c.category === category);

  return (
    <div>
      <PageHeader
        title={t('nav.customers')}
        subtitle={t('cust.subtitle', { n: data?.length ?? 0 })}
        actions={
          <button className="btn-primary" onClick={() => setModal({})}>
            <UserPlus className="h-4 w-4" /> {t('cust.new')}
          </button>
        }
      />
      <DataTable
        storageKey="customers"
        rows={rows}
        loading={loading}
        searchText={(c) => [c.customer_no, c.name, c.company, c.contact_person, c.phone, c.email].join(' ')}
        searchPlaceholder={t('cust.searchPlaceholder')}
        filters={
          <FilterSelect value={category} onChange={setCategory} placeholder={t('cust.allCategories')} options={(settings?.customer_categories || []).map((c) => ({ value: c, label: c }))} />
        }
        defaultSort={{ key: 'customer_no', dir: 'desc' }}
        onRowClick={(c) => nav(`/customers/${c.id}`)}
        onView={(c) => nav(`/customers/${c.id}`)}
        onEdit={(c) => setModal(c)}
        onDelete={isAdmin ? remove : undefined}
        emptyTitle={t('cust.empty')}
        emptyAction={
          <button className="btn-primary" onClick={() => setModal({})}>
            <UserPlus className="h-4 w-4" /> {t('cust.new')}
          </button>
        }
        columns={[
          { key: 'customer_no', label: t('cust.id'), render: (c) => <span className="font-medium text-brand-700">{c.customer_no}</span> },
          {
            key: 'name',
            label: t('cust.name'),
            render: (c) => (
              <div>
                <div className="font-medium text-slate-800">{c.name}</div>
                {c.company && c.company !== c.name && <div className="text-xs text-slate-500">{c.company}</div>}
              </div>
            ),
          },
          { key: 'phone', label: t('cust.phone'), hide: 'md', render: (c) => c.phone || '-' },
          { key: 'email', label: t('cust.email'), hide: 'lg', render: (c) => c.email || '-' },
          { key: 'category', label: t('cust.category'), hide: 'lg', render: (c) => (c.category ? <Badge>{c.category}</Badge> : '-') },
          { key: 'booking_count', label: t('nav.bookings'), align: 'right', hide: 'md' },
          { key: 'total_invoiced', label: t('cust.invoiced'), align: 'right', hide: 'sm', render: (c) => fmtRM(c.total_invoiced) },
          { key: 'outstanding', label: t('cust.outstanding'), align: 'right', render: (c) => <span className={c.outstanding > 0 ? 'font-semibold text-red-600' : ''}>{fmtRM(c.outstanding)}</span> },
        ]}
      />
      <CustomerFormModal open={!!modal} customer={modal?.id ? modal : null} onClose={() => setModal(null)} onSaved={reload} />
    </div>
  );
}

export function CustomerDetail() {
  const { id } = useParams();
  const { t } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { data: c, loading, error, reload } = useFetch(`/customers/${id}`);
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState('bookings');

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !c) return <Loading />;

  const remove = async () => {
    if (!(await confirm({ title: t('cust.deleteTitle'), message: t('cust.deleteMsg', { name: c.name }), danger: true, confirmText: t('common.delete') }))) return;
    try {
      await del(`/customers/${c.id}`);
      toast.success(t('common.deleted'));
      nav('/customers');
    } catch (e) {
      toast.error(e);
    }
  };

  const tabs = [
    { value: 'bookings', label: t('cust.bookingHistory'), count: c.bookings.length },
    { value: 'quotations', label: t('cust.quotationHistory'), count: c.quotations.length },
    { value: 'invoices', label: t('cust.invoiceHistory'), count: c.invoices.length },
    { value: 'payments', label: t('cust.paymentHistory'), count: c.payments.length },
    { value: 'activity', label: t('cust.activity') },
  ];

  return (
    <div>
      <PageHeader
        back={
          <Link to="/customers" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> {t('nav.customers')}
          </Link>
        }
        title={c.name}
        subtitle={`${c.customer_no}${c.company && c.company !== c.name ? ' · ' + c.company : ''}`}
        actions={
          <>
            <Link to={`/bookings/new?customer=${c.id}`} className="btn-primary">
              <ClipboardList className="h-4 w-4" /> {t('quick.booking')}
            </Link>
            <Link to={`/quotations/new?customer=${c.id}`} className="btn-secondary">
              <FileText className="h-4 w-4" /> {t('quick.quotation')}
            </Link>
            <Link to={`/invoices/new?customer=${c.id}`} className="btn-secondary">
              <FileSpreadsheet className="h-4 w-4" /> {t('quick.invoice')}
            </Link>
            <button className="btn-secondary" onClick={() => setEdit(true)}>
              <Pencil className="h-4 w-4" /> {t('common.edit')}
            </button>
            {isAdmin && (
              <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={remove}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <Card title={t('cust.profile')}>
            <dl className="divide-y divide-slate-100">
              <InfoRow label={t('cust.contactPerson')}>{c.contact_person}</InfoRow>
              <InfoRow label={t('cust.phone')}>
                {c.phone && (
                  <span className="flex flex-wrap items-center gap-3">
                    <a href={telLink(c.phone)} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {c.phone}
                    </a>
                    <a href={whatsappLink(c.phone, '')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </span>
                )}
              </InfoRow>
              <InfoRow label={t('cust.email')}>
                {c.email && (
                  <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                    <Mail className="h-3.5 w-3.5" /> {c.email}
                  </a>
                )}
              </InfoRow>
              <InfoRow label={t('cust.category')}>{c.category}</InfoRow>
              <InfoRow label={t('cust.billingAddress')}>
                <span className="whitespace-pre-line">{c.billing_address}</span>
              </InfoRow>
              <InfoRow label={t('cust.eventLocation')}>
                <span className="whitespace-pre-line">{c.event_location}</span>
              </InfoRow>
              <InfoRow label={t('common.notes')}>
                <span className="whitespace-pre-line">{c.notes}</span>
              </InfoRow>
              <InfoRow label={t('common.createdAt')}>{fmtDateTime(c.created_at)}</InfoRow>
            </dl>
          </Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard label={t('cust.invoiced')} value={fmtRM(c.summary.total_invoiced)} />
            <StatCard label={t('cust.paid')} tone="green" value={fmtRM(c.summary.total_paid)} />
            <StatCard label={t('cust.outstanding')} tone="red" value={fmtRM(c.summary.outstanding)} />
          </div>
        </div>
        <div className="lg:col-span-2">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
          <Card pad={false}>
            {tab === 'bookings' && (
              <HistoryTable
                rows={c.bookings}
                link={(r) => `/bookings/${r.id}`}
                cols={[
                  [t('book.no'), (r) => <span className="font-medium text-brand-700">{r.booking_no}</span>],
                  [t('book.event'), (r) => r.event_name],
                  [t('book.date'), (r) => fmtDate(r.event_date)],
                  [t('common.status'), (r) => <StatusBadge status={r.status} />],
                ]}
              />
            )}
            {tab === 'quotations' && (
              <HistoryTable
                rows={c.quotations}
                link={(r) => `/quotations/${r.id}`}
                cols={[
                  [t('quo.no'), (r) => <span className="font-medium text-brand-700">{r.quotation_no}</span>],
                  [t('common.date'), (r) => fmtDate(r.quotation_date)],
                  [t('common.total'), (r) => fmtRM(r.total), true],
                  [t('common.status'), (r) => <StatusBadge status={r.status} />],
                ]}
              />
            )}
            {tab === 'invoices' && (
              <HistoryTable
                rows={c.invoices}
                link={(r) => `/invoices/${r.id}`}
                cols={[
                  [t('inv.no'), (r) => <span className="font-medium text-brand-700">{r.invoice_no}</span>],
                  [t('common.date'), (r) => fmtDate(r.invoice_date)],
                  [t('common.total'), (r) => fmtRM(r.total), true],
                  [t('inv.balance'), (r) => fmtRM(r.balance), true],
                  [t('common.status'), (r) => <StatusBadge status={r.status} />],
                ]}
              />
            )}
            {tab === 'payments' && (
              <HistoryTable
                rows={c.payments}
                link={(r) => `/receipts/${r.id}`}
                cols={[
                  [t('rec.no'), (r) => <span className="font-medium text-brand-700">{r.receipt_no}</span>],
                  [t('common.date'), (r) => fmtDate(r.payment_date)],
                  [t('inv.invoice'), (r) => r.invoice_no],
                  [t('pay.method'), (r) => t(`pm.${r.method}`)],
                  [t('pay.amount'), (r) => <span className={r.status === 'Void' ? 'line-through text-slate-400' : ''}>{fmtRM(r.amount)}</span>, true],
                ]}
              />
            )}
            {tab === 'activity' && (
              <ul className="divide-y divide-slate-100">
                {c.activity.map((a) => (
                  <li key={a.id} className="px-4 py-2.5 text-sm">
                    <span className="font-medium">{a.ref_no}</span> {a.description}
                    <div className="text-xs text-slate-400">
                      {fmtDateTime(a.created_at)} {a.user_name && `· ${a.user_name}`}
                    </div>
                  </li>
                ))}
                {c.activity.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">{t('common.noRecords')}</li>}
              </ul>
            )}
          </Card>
        </div>
      </div>
      <CustomerFormModal open={edit} customer={c} onClose={() => setEdit(false)} onSaved={reload} />
    </div>
  );
}

function HistoryTable({ rows, cols, link }) {
  const { t } = useT();
  const nav = useNavigate();
  if (!rows.length) return <p className="px-4 py-8 text-center text-sm text-slate-500">{t('common.noRecords')}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50">
          <tr>
            {cols.map(([label, , right]) => (
              <th key={label} className={`th ${right ? 'text-right' : ''}`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="cursor-pointer hover:bg-brand-50/40" onClick={() => nav(link(r))}>
              {cols.map(([label, render, right]) => (
                <td key={label} className={`td ${right ? 'num text-right' : ''}`}>
                  {render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { HistoryTable };
