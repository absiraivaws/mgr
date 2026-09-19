import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import {
  PRHCustomer,
  PRHNotificationLog,
  PRHReminderTemplate,
  PRHRental,
} from '../../types/prhTypes';
import { prhTheme, SortDirection, sortPRHData } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';
import { PRHTableHeader } from './PRHTableHeader';

interface PRHRemindersViewProps {
  templates: PRHReminderTemplate[];
  notificationLogs: PRHNotificationLog[];
  rentals: PRHRental[];
  customers: PRHCustomer[];
  currentUserEmail: string;
  onSaveTemplates: (templates: PRHReminderTemplate[]) => void;
  onLogNotification: (log: PRHNotificationLog) => void;
}

export const PRHRemindersView: React.FC<PRHRemindersViewProps> = ({
  templates,
  notificationLogs,
  rentals,
  customers,
  currentUserEmail,
  onSaveTemplates,
  onLogNotification,
}) => {
  const [selectedRentalId, setSelectedRentalId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('TPL-BEFORE-RETURN');
  const [dispatchStatus, setDispatchStatus] = useState('');

  // Table sorting state
  const [sortKey, setSortKey] = useState<string>('sentAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const activeRentals = rentals.filter((r) => r.status === 'active' || r.status === 'partially_returned');

  // Options for active rental contracts (sorted A-Z)
  const rentalOptions = useMemo<PRHOption[]>(() => {
    return activeRentals.map((r) => ({
      value: r.id,
      label: `${r.rentalNumber} - ${r.customerName}`,
      sublabel: `Due: ${r.expectedReturnDate} • ${r.siteAddress}`,
    }));
  }, [activeRentals]);

  // Options for templates (sorted A-Z)
  const templateOptions = useMemo<PRHOption[]>(() => {
    return templates.map((t) => ({
      value: t.id,
      label: t.name,
      sublabel: `Trigger: ${t.eventType.replace(/_/g, ' ')}`,
    }));
  }, [templates]);

  // Preview generated message
  const previewMessage = () => {
    const tpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    const rental = rentals.find((r) => r.id === selectedRentalId);
    if (!rental || !tpl) return tpl?.whatsappTemplate || '';

    const eqList = rental.items.map((it) => `${it.quantity}x ${it.equipmentName}`).join(', ');

    return tpl.whatsappTemplate
      .replace(/{customer_name}/g, rental.customerName)
      .replace(/{rental_number}/g, rental.rentalNumber)
      .replace(/{start_date}/g, rental.startDate)
      .replace(/{return_date}/g, rental.expectedReturnDate)
      .replace(/{equipment}/g, eqList)
      .replace(/{paid_amount}/g, rental.paidAmount.toString())
      .replace(/{outstanding_amount}/g, rental.outstandingAmount.toString())
      .replace(/{overdue_days}/g, '2');
  };

  const handleSendWhatsAppDirect = () => {
    const rental = rentals.find((r) => r.id === selectedRentalId);
    if (!rental) {
      alert('Please select an active rental contract.');
      return;
    }

    const tpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    const message = previewMessage();
    const rawNumber = rental.customerWhatsapp || rental.customerPhone;

    // Normalize phone number for Sri Lanka (+94)
    let cleanNumber = rawNumber.replace(/\D/g, '');
    if (cleanNumber.startsWith('0')) {
      cleanNumber = '94' + cleanNumber.substring(1);
    } else if (!cleanNumber.startsWith('94')) {
      cleanNumber = '94' + cleanNumber;
    }

    // Direct WhatsApp Web / Mobile Link
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    // Create Notification Log
    const newLog: PRHNotificationLog = {
      id: `PRH-NOTIF-${Date.now().toString().slice(-6)}`,
      businessUnit: 'PRH',
      customerId: rental.customerId,
      customerName: rental.customerName,
      phone: rental.customerPhone,
      whatsapp: rental.customerWhatsapp || rental.customerPhone,
      rentalNumber: rental.rentalNumber,
      channel: 'whatsapp',
      templateName: tpl.name,
      message,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };

    onLogNotification(newLog);
    setDispatchStatus(`WhatsApp prompt opened for ${rental.customerName} (${cleanNumber})`);
    setTimeout(() => setDispatchStatus(''), 4000);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') setSortDir(null);
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedLogs = useMemo(() => {
    return sortPRHData(notificationLogs, sortKey, sortDir);
  }, [notificationLogs, sortKey, sortDir]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Customer Reminders & WhatsApp Notification Hub
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Automated message templates and direct WhatsApp link dispatch for return due dates, overdue notices & payment settlements.
        </p>
      </div>

      {/* Dispatch Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Manual Dispatch Tool */}
        <div className={`lg:col-span-2 ${prhTheme.card} p-5 space-y-4`}>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Dispatch Customer WhatsApp Notification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className={prhTheme.label}>
                Select Active Rental Contract *
              </label>
              <PRHSearchableSelect
                value={selectedRentalId}
                onChange={setSelectedRentalId}
                options={rentalOptions}
                placeholder="Choose active rental contract..."
                searchPlaceholder="Search rental # or customer..."
                autoSortAZ={true}
              />
            </div>

            <div>
              <label className={prhTheme.label}>
                Reminder Template *
              </label>
              <PRHSearchableSelect
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
                options={templateOptions}
                placeholder="Choose reminder template..."
                searchPlaceholder="Search templates..."
                autoSortAZ={true}
              />
            </div>
          </div>

          {/* Message Preview Box */}
          <div>
            <label className={prhTheme.label}>
              Live WhatsApp Message Preview
            </label>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
              {previewMessage()}
            </div>
          </div>

          {dispatchStatus && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{dispatchStatus}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!selectedRentalId}
              onClick={handleSendWhatsAppDirect}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                !selectedRentalId
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : prhTheme.btnSuccess
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              Open in WhatsApp Web / App
            </button>
          </div>
        </div>

        {/* Right 1 Col: Templates Overview */}
        <div className={`${prhTheme.card} p-5 space-y-4`}>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Message Templates</h2>

          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                  selectedTemplateId === t.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 font-semibold'
                    : `${prhTheme.cardSubtle} hover:border-slate-300 dark:hover:border-slate-600`
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white">{t.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 capitalize">
                  Event: {t.eventType.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Logs Table */}
      <div className={`${prhTheme.card} p-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Notification Dispatch History & Audit Trail
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {notificationLogs.length} notifications logged
          </span>
        </div>

        <div className={prhTheme.tableContainer}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={prhTheme.tableHeader}>
                  <PRHTableHeader
                    label="Date / Time"
                    sortKey="sentAt"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                  />
                  <PRHTableHeader
                    label="Contractor / Customer"
                    sortKey="customerName"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                  />
                  <PRHTableHeader
                    label="Rental #"
                    sortKey="rentalNumber"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                  />
                  <PRHTableHeader
                    label="Template Used"
                    sortKey="templateName"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="py-3 px-3.5 font-semibold text-slate-600 dark:text-slate-400">Message Snippet</th>
                  <PRHTableHeader
                    label="Status"
                    sortKey="status"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="center"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {sortedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      No customer notifications dispatched yet.
                    </td>
                  </tr>
                ) : (
                  sortedLogs.map((log) => (
                    <tr key={log.id} className={prhTheme.tableRow}>
                      <td className="py-2.5 px-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {log.sentAt.replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white break-words whitespace-normal max-w-xs">
                        {log.customerName}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {log.rentalNumber}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-700 dark:text-slate-300 break-words whitespace-normal">
                        {log.templateName}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400 break-words whitespace-normal max-w-sm">
                        {log.message.slice(0, 80)}...
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span className={prhTheme.badgeSuccess}>
                          DISPATCHED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
