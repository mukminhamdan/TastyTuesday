import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, CalendarDays } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useAuth, useConfirm, useFetch, useToast } from '../lib/context.jsx';
import { del } from '../lib/api.js';
import DataTable, { FilterSelect } from '../components/DataTable.jsx';
import { PageHeader, StatusBadge, ErrorState } from '../components/ui.jsx';
import { BOOKING_STATUSES } from '@shared/constants.js';
import { fmtDate, fmtRM, fmtTimeRange, todayISO } from '../lib/format.js';

export default function Bookings() {
  const { t } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { data, loading, error, reload } = useFetch('/bookings');
  const [status, setStatus] = useState('');
  const [when, setWhen] = useState('');
  const today = todayISO();

  const remove = async (b) => {
    if (!(await confirm({ title: t('book.deleteTitle'), message: t('book.deleteMsg', { no: b.booking_no }), danger: true, confirmText: t('common.delete') }))) return;
    try {
      await del(`/bookings/${b.id}`);
      toast.success(t('common.deleted'));
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const rows = (data || []).filter(
    (b) => (!status || b.status === status) && (!when || (when === 'upcoming' ? b.event_date >= today && !['Cancelled', 'Completed'].includes(b.status) : b.event_date < today)),
  );

  return (
    <div>
      <PageHeader
        title={t('nav.bookings')}
        subtitle={t('book.subtitle')}
        actions={
          <>
            <Link to="/calendar" className="btn-secondary">
              <CalendarDays className="h-4 w-4" /> {t('nav.calendar')}
            </Link>
            <Link to="/bookings/new" className="btn-primary">
              <Plus className="h-4 w-4" /> {t('book.new')}
            </Link>
          </>
        }
      />
      <DataTable
        storageKey="bookings"
        rows={rows}
        loading={loading}
        searchText={(b) => [b.booking_no, b.event_name, b.customer_name, b.customer_company, b.venue, b.event_type].join(' ')}
        searchPlaceholder={t('book.searchPlaceholder')}
        filters={
          <>
            <FilterSelect value={status} onChange={setStatus} placeholder={t('common.allStatuses')} options={BOOKING_STATUSES.map((s) => ({ value: s, label: t(`st.${s}`) }))} />
            <FilterSelect
              value={when}
              onChange={setWhen}
              placeholder={t('book.allDates')}
              options={[
                { value: 'upcoming', label: t('book.upcoming') },
                { value: 'past', label: t('book.past') },
              ]}
            />
          </>
        }
        defaultSort={{ key: 'event_date', dir: 'desc' }}
        onRowClick={(b) => nav(`/bookings/${b.id}`)}
        onView={(b) => nav(`/bookings/${b.id}`)}
        onEdit={(b) => nav(`/bookings/${b.id}/edit`)}
        onDelete={isAdmin ? remove : undefined}
        emptyTitle={t('book.empty')}
        emptyAction={
          <Link to="/bookings/new" className="btn-primary">
            <Plus className="h-4 w-4" /> {t('book.new')}
          </Link>
        }
        columns={[
          { key: 'booking_no', label: t('book.no'), render: (b) => <span className="font-medium text-brand-700">{b.booking_no}</span> },
          {
            key: 'event_name',
            label: t('book.event'),
            render: (b) => (
              <div>
                <div className="font-medium text-slate-800">{b.event_name}</div>
                <div className="text-xs text-slate-500">{b.customer_name}</div>
              </div>
            ),
          },
          {
            key: 'event_date',
            label: t('book.date'),
            sort: (b) => `${b.event_date} ${b.start_time || ''}`,
            render: (b) => (
              <div>
                <div>{fmtDate(b.event_date)}</div>
                <div className="text-xs text-slate-500">{fmtTimeRange(b.start_time, b.end_time)}</div>
              </div>
            ),
          },
          { key: 'venue', label: t('book.venue'), hide: 'lg', render: (b) => <span className="line-clamp-2">{b.venue || '-'}</span> },
          { key: 'status', label: t('common.status'), render: (b) => <StatusBadge status={b.status} /> },
          {
            key: 'invoiced',
            label: t('book.value'),
            align: 'right',
            hide: 'md',
            sort: (b) => b.invoiced || b.quoted,
            render: (b) =>
              b.invoiced ? (
                <div>
                  <div>{fmtRM(b.invoiced)}</div>
                  <div className="text-xs text-emerald-700">
                    {t('inv.paid')} {fmtRM(b.paid)}
                  </div>
                </div>
              ) : b.quoted ? (
                <span className="text-slate-500">{fmtRM(b.quoted)}</span>
              ) : (
                '-'
              ),
          },
        ]}
      />
    </div>
  );
}
