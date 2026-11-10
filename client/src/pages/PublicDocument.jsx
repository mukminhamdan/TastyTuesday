import { useParams } from 'react-router-dom';
import { useT } from '../lib/i18n.jsx';
import { useFetch } from '../lib/context.jsx';
import { Loading, ErrorState } from '../components/ui.jsx';
import DocumentPreview, { DocActions } from '../components/DocumentPreview.jsx';
import { buildDocModel } from '../lib/docModel.js';
import { LangToggle } from '../components/Layout.jsx';

/** Customer-facing read-only view of a shared quotation / invoice / receipt. */
export default function PublicDocument() {
  const { kind, token } = useParams();
  const { lang } = useT();
  const { data, error, loading } = useFetch(`/public/${kind}/${token}`);
  if (loading) return <Loading />;
  if (error) return <div className="mx-auto max-w-lg p-6"><ErrorState error={error} /></div>;
  const model = buildDocModel(data.kind, data.doc, data.settings, lang);
  return (
    <div className="min-h-full bg-slate-100 py-4 sm:py-8">
      <div className="mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-2 px-4">
        <div className="text-sm font-semibold text-slate-700">{data.settings.business_name}</div>
        <div className="flex flex-wrap items-center gap-2">
          <DocActions model={model} />
          <LangToggle />
        </div>
      </div>
      <div className="px-2 sm:px-4">
        <DocumentPreview model={model} />
      </div>
    </div>
  );
}
