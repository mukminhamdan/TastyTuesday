import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, SettingsProvider, useSettings } from './lib/context.jsx';
import { Loading } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import Login, { Setup } from './pages/Login.jsx';
import PublicDocument from './pages/PublicDocument.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers, { CustomerDetail } from './pages/Customers.jsx';
import Bookings from './pages/Bookings.jsx';
import BookingForm from './pages/BookingForm.jsx';
import BookingDetail from './pages/BookingDetail.jsx';
import CalendarPage from './pages/Calendar.jsx';
import Quotations, { QuotationDetail } from './pages/Quotations.jsx';
import Invoices, { InvoiceDetail } from './pages/Invoices.jsx';
import DocumentForm from './pages/DocumentForm.jsx';
import Receipts, { ReceiptDetail } from './pages/Receipts.jsx';
import Payments from './pages/Payments.jsx';
import Reports from './pages/Reports.jsx';
import SettingsPage from './pages/Settings.jsx';

function Protected() {
  const { settings } = useSettings();
  if (!settings) return <Loading />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="bookings/new" element={<BookingForm />} />
        <Route path="bookings/:id" element={<BookingDetail />} />
        <Route path="bookings/:id/edit" element={<BookingForm />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="quotations" element={<Quotations />} />
        <Route path="quotations/new" element={<DocumentForm kind="quotation" />} />
        <Route path="quotations/:id" element={<QuotationDetail />} />
        <Route path="quotations/:id/edit" element={<DocumentForm kind="quotation" />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<DocumentForm kind="invoice" />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="invoices/:id/edit" element={<DocumentForm kind="invoice" />} />
        <Route path="receipts" element={<Receipts />} />
        <Route path="receipts/:id" element={<ReceiptDetail />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const { loading, user, needsSetup } = useAuth();
  return (
    <Routes>
      <Route path="/p/:kind/:token" element={<PublicDocument />} />
      <Route
        path="*"
        element={
          loading ? (
            <Loading />
          ) : needsSetup ? (
            <Setup />
          ) : !user ? (
            <Login />
          ) : (
            <SettingsProvider>
              <Protected />
            </SettingsProvider>
          )
        }
      />
    </Routes>
  );
}
