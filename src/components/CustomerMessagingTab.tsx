import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Phone,
  Filter,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  History,
  Info,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ChevronDown,
  Edit3,
  Check,
} from 'lucide-react';
import { 
  Customer, 
  CustomerGroup, 
  MessageTemplate, 
  MessageTemplateCategory, 
  MessageHistoryEntry, 
  BulkSendingConfig, 
  BulkCampaignState 
} from '../types';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { UserAccount } from '../utils/auth';
import { 
  cleanWhatsAppPhoneNumber, 
  isCustomerSuspendedOrBlocked, 
  getCustomerStatusBadge,
  DEFAULT_MESSAGE_TEMPLATES
} from '../utils/customer';

interface CustomerMessagingTabProps {
  customers: Customer[];
  templates?: MessageTemplate[];
  customerGroups: CustomerGroup[];
  messageHistory: MessageHistoryEntry[];
  currentUser?: UserAccount;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  shopName?: string;
  onAddMessageHistory: (entry: MessageHistoryEntry) => void;
}

export const CustomerMessagingTab: React.FC<CustomerMessagingTabProps> = ({
  customers = [],
  templates = [],
  customerGroups = [],
  messageHistory = [],
  currentUser,
  themeMode = 'dark',
  accent = 'emerald',
  shopName = 'Cycly Rent',
  onAddMessageHistory,
}) => {
  const t = getThemeClasses(themeMode, accent);

  // Active view inside Messaging: 'composer' | 'history'
  const [activeMessagingView, setActiveMessagingView] = useState<'composer' | 'history'>('composer');

  // Merged available templates (system defaults + custom)
  const allTemplates = useMemo(() => {
    const map = new Map<string, MessageTemplate>();
    for (const def of DEFAULT_MESSAGE_TEMPLATES) {
      map.set(def.id, def);
    }
    for (const custom of templates) {
      map.set(custom.id, custom);
    }
    return Array.from(map.values());
  }, [templates]);

  // Template selection state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return allTemplates[0]?.id || 'tpl-welcome';
  });

  const selectedTemplate = useMemo(() => {
    return allTemplates.find((t) => t.id === selectedTemplateId) || allTemplates[0];
  }, [allTemplates, selectedTemplateId]);

  // Editable live message text
  const [messageBody, setMessageBody] = useState<string>(() => {
    return selectedTemplate?.content || (selectedTemplate as any)?.body || '';
  });

  // Campaign Name
  const [campaignName, setCampaignName] = useState<string>('Special Customer Broadcast');

  // Sync template content when selected template changes
  useEffect(() => {
    if (selectedTemplate) {
      setMessageBody(selectedTemplate.content || (selectedTemplate as any)?.body || '');
    }
  }, [selectedTemplate]);

  // Recipient Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [excludeSuspended, setExcludeSuspended] = useState<boolean>(true);

  // Selected customer IDs for bulk dispatch
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  // Controlled batch sending configuration
  const [batchConfig, setBatchConfig] = useState<BulkSendingConfig>(() => {
    try {
      const saved = localStorage.getItem('v_bulk_sending_config');
      return saved ? JSON.parse(saved) : { batchSize: 10, delaySeconds: 5, restMinutes: 1 };
    } catch {
      return { batchSize: 10, delaySeconds: 5, restMinutes: 1 };
    }
  });

  // Custom Throttling options & validation state
  const [isCustomThrottlingOpen, setIsCustomThrottlingOpen] = useState<boolean>(false);
  const [customBatchSizeInput, setCustomBatchSizeInput] = useState<string>(() => String(batchConfig.batchSize));
  const [customDelaySecondsInput, setCustomDelaySecondsInput] = useState<string>(() => String(batchConfig.delaySeconds));
  const [customRestMinutesInput, setCustomRestMinutesInput] = useState<string>(() => String(batchConfig.restMinutes));
  const [throttlingError, setThrottlingError] = useState<string | null>(null);
  const [throttlingSuccess, setThrottlingSuccess] = useState<string | null>(null);

  const handleSaveCustomThrottling = () => {
    setThrottlingError(null);
    setThrottlingSuccess(null);

    const delay = parseFloat(customDelaySecondsInput);
    const rest = parseFloat(customRestMinutesInput);
    const batch = parseInt(customBatchSizeInput, 10);

    if (isNaN(delay) || isNaN(rest) || isNaN(batch)) {
      setThrottlingError('Please enter valid numeric values for all throttling fields.');
      return;
    }

    if (delay < 1 || delay > 300) {
      setThrottlingError('Invalid delay time: Delay between messages must be between 1 and 300 seconds (5 minutes).');
      return;
    }

    if (rest < 0.1 || rest > 120) {
      setThrottlingError('Invalid rest time: Rest time between batches must be between 0.1 minutes (6 seconds) and 120 minutes (2 hours).');
      return;
    }

    if (batch < 1 || batch > 200) {
      setThrottlingError('Invalid batch size: Messages per batch must be between 1 and 200 messages.');
      return;
    }

    const updated: BulkSendingConfig = {
      batchSize: batch,
      delaySeconds: delay,
      restMinutes: rest,
    };

    setBatchConfig(updated);
    try {
      localStorage.setItem('v_bulk_sending_config', JSON.stringify(updated));
    } catch {}

    setThrottlingSuccess(`✓ Throttling settings saved: ${delay}s delay, ${rest} min rest, ${batch} msgs/batch.`);
    setTimeout(() => setThrottlingSuccess(null), 4000);
  };

  const handleResetThrottlingDefaults = () => {
    const defaultCfg: BulkSendingConfig = {
      batchSize: 10,
      delaySeconds: 5,
      restMinutes: 1,
    };
    setBatchConfig(defaultCfg);
    setCustomBatchSizeInput('10');
    setCustomDelaySecondsInput('5');
    setCustomRestMinutesInput('1');
    setThrottlingError(null);
    try {
      localStorage.setItem('v_bulk_sending_config', JSON.stringify(defaultCfg));
    } catch {}
    setThrottlingSuccess('✓ Reset to standard safe defaults (10 msgs, 5s delay, 1 min rest).');
    setTimeout(() => setThrottlingSuccess(null), 4000);
  };

  // Bulk Campaign Execution State
  const [campaignState, setCampaignState] = useState<BulkCampaignState>({
    status: 'idle',
    totalRecipients: 0,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    pendingCount: 0,
    currentBatchIndex: 0,
    totalBatches: 0,
    restTimeRemainingSeconds: 0,
  });

  // Ref to hold running campaign interval/loop cancellation
  const isCancelledRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // Filtered customers eligible for selection
  const eligibleCustomers = useMemo(() => {
    return customers.filter((c) => {
      // 1. Group filter
      if (selectedGroupFilter !== 'all') {
        const hasGroup = Array.isArray(c.groups) && c.groups.includes(selectedGroupFilter);
        if (!hasGroup) return false;
      }

      // 2. Suspended/Blocked filter
      if (excludeSuspended && isCustomerSuspendedOrBlocked(c)) {
        return false;
      }

      // 3. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (c.fullName || c.name || '').toLowerCase().includes(q);
        const matchesNic = (c.nicPassport || '').toLowerCase().includes(q);
        const matchesPhone = (c.phone || '').toLowerCase().includes(q) || (c.whatsappNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNic && !matchesPhone) return false;
      }

      return true;
    });
  }, [customers, selectedGroupFilter, excludeSuspended, searchTerm]);

  // Recipient selection pagination (fixed to 20 rows per page)
  const [recipientPage, setRecipientPage] = useState<number>(1);
  const RECIPIENT_PAGE_SIZE = 20;

  useEffect(() => {
    setRecipientPage(1);
  }, [searchTerm, selectedGroupFilter, excludeSuspended]);

  const totalRecipientPages = Math.max(1, Math.ceil(eligibleCustomers.length / RECIPIENT_PAGE_SIZE));
  const safeRecipientPage = Math.min(recipientPage, totalRecipientPages);
  const startRecipientIdx = (safeRecipientPage - 1) * RECIPIENT_PAGE_SIZE;
  const paginatedEligibleCustomers = eligibleCustomers.slice(
    startRecipientIdx,
    startRecipientIdx + RECIPIENT_PAGE_SIZE
  );
  const handleSelectAllEligible = () => {
    const next = new Set<string>();
    for (const c of eligibleCustomers) {
      if (c.phone || c.whatsappNumber) {
        next.add(c.id);
      }
    }
    setSelectedCustomerIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedCustomerIds(new Set());
  };

  const handleToggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Selected customer list
  const selectedCustomers = useMemo(() => {
    return customers.filter((c) => selectedCustomerIds.has(c.id));
  }, [customers, selectedCustomerIds]);

  // First selected customer for live preview placeholder substitution
  const sampleCustomer = useMemo(() => {
    if (selectedCustomers.length > 0) return selectedCustomers[0];
    return eligibleCustomers[0] || customers[0] || null;
  }, [selectedCustomers, eligibleCustomers, customers]);

  // Render message text preview with replaced placeholders
  const renderPreviewText = (text: string = '', cust: Customer | null) => {
    const raw = String(text || '');
    if (!cust) return raw;
    const name = cust.fullName || cust.name || 'Valued Customer';
    const nic = cust.nicPassport || 'N/A';
    const phone = cust.whatsappNumber || cust.phone || '';
    const nowStr = new Date().toLocaleDateString();

    return raw
      .replace(/{customer_name}/g, name)
      .replace(/{name}/g, name)
      .replace(/{phone}/g, phone)
      .replace(/{nic}/g, nic)
      .replace(/{date}/g, nowStr)
      .replace(/{shop_name}/g, shopName)
      .replace(/{vehicle_serial}/g, 'CY-101')
      .replace(/{duration}/g, '2 hrs')
      .replace(/{total_amount}/g, 'Rs. 1,200');
  };

  // ----------------------------------------------------
  // CONTROLLED BULK DISPATCH ENGINE
  // ----------------------------------------------------
  const handleStartBulkCampaign = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer with a valid phone number.');
      return;
    }

    const recipients = selectedCustomers.filter((c) => Boolean(c.whatsappNumber || c.phone));
    if (recipients.length === 0) {
      alert('None of the selected customers have a valid mobile/WhatsApp number.');
      return;
    }

    isCancelledRef.current = false;
    isPausedRef.current = false;

    const batchSize = Math.max(1, batchConfig.batchSize);
    const delayMs = Math.max(1, batchConfig.delaySeconds) * 1000;
    const restMs = Math.max(0, batchConfig.restMinutes) * 60 * 1000;
    const totalBatches = Math.ceil(recipients.length / batchSize);

    setCampaignState({
      status: 'sending',
      totalRecipients: recipients.length,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      pendingCount: recipients.length,
      currentBatchIndex: 1,
      totalBatches: totalBatches,
      restTimeRemainingSeconds: 0,
    });

    let sent = 0;
    let failed = 0;

    for (let b = 0; b < totalBatches; b++) {
      if (isCancelledRef.current) break;

      const batchRecipients = recipients.slice(b * batchSize, (b + 1) * batchSize);
      setCampaignState((prev) => ({
        ...prev,
        currentBatchIndex: b + 1,
      }));

      for (let i = 0; i < batchRecipients.length; i++) {
        if (isCancelledRef.current) break;

        // Check if paused
        while (isPausedRef.current) {
          await new Promise((res) => setTimeout(res, 500));
          if (isCancelledRef.current) break;
        }
        if (isCancelledRef.current) break;

        const cust = batchRecipients[i];
        const rawPhone = cust.whatsappNumber || cust.phone || '';
        const cleanPhone = cleanWhatsAppPhoneNumber(rawPhone);
        const resolvedMessage = renderPreviewText(messageBody, cust);

        try {
          // Open WhatsApp wa.me link
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(resolvedMessage)}`, '_blank');

          // Log entry to history
          const historyEntry: MessageHistoryEntry = {
            id: `msg-${Date.now()}-${i}`,
            customerId: cust.id,
            customerNic: cust.nicPassport,
            customerName: cust.fullName || cust.name,
            mobileNumber: rawPhone,
            templateTitle: selectedTemplate?.title || 'Custom Message',
            actualMessage: resolvedMessage,
            messageType: 'bulk',
            status: 'sent',
            sentAt: Date.now(),
            sentBy: currentUser?.name || 'Administrator',
            campaignName: campaignName || selectedTemplate?.title || 'Bulk WhatsApp Broadcast',
          };
          onAddMessageHistory(historyEntry);

          sent++;
          setCampaignState((prev) => ({
            ...prev,
            sentCount: sent,
            deliveredCount: sent,
            pendingCount: Math.max(0, recipients.length - (sent + failed)),
          }));
        } catch (err: any) {
          failed++;
          const failedEntry: MessageHistoryEntry = {
            id: `msg-${Date.now()}-${i}`,
            customerId: cust.id,
            customerNic: cust.nicPassport,
            customerName: cust.fullName || cust.name,
            mobileNumber: rawPhone,
            templateTitle: selectedTemplate?.title || 'Custom Message',
            actualMessage: resolvedMessage,
            messageType: 'bulk',
            status: 'failed',
            failureReason: String(err?.message || 'Failed to dispatch WhatsApp link'),
            sentAt: Date.now(),
            sentBy: currentUser?.name || 'Administrator',
            campaignName: campaignName || 'Bulk Broadcast',
          };
          onAddMessageHistory(failedEntry);

          setCampaignState((prev) => ({
            ...prev,
            failedCount: failed,
            pendingCount: Math.max(0, recipients.length - (sent + failed)),
          }));
        }

        // Delay between individual messages
        if (i < batchRecipients.length - 1 && !isCancelledRef.current) {
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }

      // Rest time between batches if not last batch
      if (b < totalBatches - 1 && !isCancelledRef.current && restMs > 0) {
        let restSecs = Math.floor(restMs / 1000);
        while (restSecs > 0 && !isCancelledRef.current) {
          setCampaignState((prev) => ({
            ...prev,
            restTimeRemainingSeconds: restSecs,
          }));
          await new Promise((res) => setTimeout(res, 1000));
          restSecs--;
        }
        setCampaignState((prev) => ({
          ...prev,
          restTimeRemainingSeconds: 0,
        }));
      }
    }

    setCampaignState((prev) => ({
      ...prev,
      status: isCancelledRef.current ? 'cancelled' : 'completed',
      restTimeRemainingSeconds: 0,
    }));
  };

  const handlePauseCampaign = () => {
    isPausedRef.current = true;
    setCampaignState((prev) => ({ ...prev, status: 'paused' }));
  };

  const handleResumeCampaign = () => {
    isPausedRef.current = false;
    setCampaignState((prev) => ({ ...prev, status: 'sending' }));
  };

  const handleCancelCampaign = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setCampaignState((prev) => ({ ...prev, status: 'cancelled' }));
  };

  // Single Quick Send to sample customer
  const handleSendSingleNow = (cust: Customer) => {
    const rawPhone = cust.whatsappNumber || cust.phone;
    if (!rawPhone) {
      alert('This customer does not have a valid mobile/WhatsApp number.');
      return;
    }
    const cleanPhone = cleanWhatsAppPhoneNumber(rawPhone);
    const resolvedMessage = renderPreviewText(messageBody, cust);

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(resolvedMessage)}`, '_blank');

    const historyEntry: MessageHistoryEntry = {
      id: `msg-${Date.now()}`,
      customerId: cust.id,
      customerNic: cust.nicPassport,
      customerName: cust.fullName || cust.name,
      mobileNumber: rawPhone,
      templateTitle: selectedTemplate?.title || 'Direct Message',
      actualMessage: resolvedMessage,
      messageType: 'single',
      status: 'sent',
      sentAt: Date.now(),
      sentBy: currentUser?.name || 'Cashier / Admin',
      campaignName: 'Direct Send',
    };
    onAddMessageHistory(historyEntry);
  };

  // Filtered Message History with 20 rows per page pagination
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const HISTORY_PAGE_SIZE = 20;

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch]);

  const filteredHistory = useMemo(() => {
    const list = Array.isArray(messageHistory) ? messageHistory : [];
    if (!historySearch.trim()) return list;
    const q = historySearch.toLowerCase();
    return list.filter(
      (m) =>
        (m.customerName || '').toLowerCase().includes(q) ||
        (m.customerNic || '').toLowerCase().includes(q) ||
        (m.mobileNumber || '').toLowerCase().includes(q) ||
        (m.templateTitle || '').toLowerCase().includes(q) ||
        (m.actualMessage || '').toLowerCase().includes(q)
    );
  }, [messageHistory, historySearch]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const startHistoryIdx = (safeHistoryPage - 1) * HISTORY_PAGE_SIZE;
  const paginatedHistory = filteredHistory.slice(
    startHistoryIdx,
    startHistoryIdx + HISTORY_PAGE_SIZE
  );

  const progressPercent = campaignState.totalRecipients > 0
    ? Math.round(((campaignState.sentCount + campaignState.failedCount) / campaignState.totalRecipients) * 100)
    : 0;

  return (
    <div className="space-y-5">
      
      {/* Top Banner Navigation: Composer vs History */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b ${t.divider}`}>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveMessagingView('composer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm ${
              activeMessagingView === 'composer' ? t.primaryBtn : t.inactiveTab
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Campaign Composer & WhatsApp Dispatcher</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMessagingView('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm ${
              activeMessagingView === 'history' ? t.primaryBtn : t.inactiveTab
            }`}
          >
            <History className="w-4 h-4" />
            <span>Message Audit Trail & Logs ({messageHistory.length})</span>
          </button>
        </div>

        {/* Live Progress Indicator if campaign is active */}
        {campaignState.status !== 'idle' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
              {campaignState.status} • {campaignState.sentCount}/{campaignState.totalRecipients}
            </span>
          </div>
        )}
      </div>

      {activeMessagingView === 'composer' ? (
        <div className="space-y-5">

          {/* ================= SECTION 1: LIVE CAMPAIGN PROGRESS WIDGET ================= */}
          {campaignState.status !== 'idle' && (
            <div className={`p-4 sm:p-5 rounded-2xl border shadow-xl ${t.cardBg} space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-bold ${t.textHeading}`}>
                      Active Campaign: {campaignName || 'Broadcast'}
                    </h3>
                    <p className={`text-xs ${t.textMuted}`}>
                      Batch {campaignState.currentBatchIndex} of {campaignState.totalBatches}
                      {campaignState.restTimeRemainingSeconds > 0 && (
                        <span className="text-amber-400 font-bold ml-2">
                          (⏳ Resting for {campaignState.restTimeRemainingSeconds}s before next batch...)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Pause / Resume / Cancel Controls */}
                <div className="flex items-center gap-2">
                  {campaignState.status === 'sending' && (
                    <button
                      type="button"
                      onClick={handlePauseCampaign}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  )}
                  {campaignState.status === 'paused' && (
                    <button
                      type="button"
                      onClick={handleResumeCampaign}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </button>
                  )}
                  {(campaignState.status === 'sending' || campaignState.status === 'paused') && (
                    <button
                      type="button"
                      onClick={handleCancelCampaign}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className={t.textMuted}>Overall Completion</span>
                  <span className="font-mono text-cyan-400">{progressPercent}%</span>
                </div>
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Counter Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center text-xs">
                <div className={`p-2.5 rounded-xl ${t.cardSubtleBg} border ${t.divider}`}>
                  <span className={`${t.textMuted} block text-[10px] uppercase font-bold`}>Total</span>
                  <span className={`text-base font-black ${t.textHeading}`}>{campaignState.totalRecipients}</span>
                </div>
                <div className={`p-2.5 rounded-xl ${t.cardSubtleBg} border ${t.divider}`}>
                  <span className="text-emerald-500 dark:text-emerald-400 block text-[10px] uppercase font-bold">Sent</span>
                  <span className="text-base font-black text-emerald-500 dark:text-emerald-400">{campaignState.sentCount}</span>
                </div>
                <div className={`p-2.5 rounded-xl ${t.cardSubtleBg} border ${t.divider}`}>
                  <span className="text-cyan-500 dark:text-cyan-400 block text-[10px] uppercase font-bold">Delivered</span>
                  <span className="text-base font-black text-cyan-500 dark:text-cyan-400">{campaignState.deliveredCount}</span>
                </div>
                <div className={`p-2.5 rounded-xl ${t.cardSubtleBg} border ${t.divider}`}>
                  <span className="text-rose-500 dark:text-rose-400 block text-[10px] uppercase font-bold">Failed</span>
                  <span className="text-base font-black text-rose-500 dark:text-rose-400">{campaignState.failedCount}</span>
                </div>
                <div className={`p-2.5 rounded-xl ${t.cardSubtleBg} border ${t.divider}`}>
                  <span className="text-amber-500 dark:text-amber-400 block text-[10px] uppercase font-bold">Pending</span>
                  <span className="text-base font-black text-amber-500 dark:text-amber-400">{campaignState.pendingCount}</span>
                </div>
                <div className={`p-2.5 rounded-xl ${t.cardSubtleBg} border ${t.divider}`}>
                  <span className="text-purple-500 dark:text-purple-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className="text-xs font-black text-purple-600 dark:text-purple-300 uppercase block mt-1">{campaignState.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 2: TEMPLATE SELECTOR & LIVE PREVIEW ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left: Template Selector & Settings (7 cols) */}
            <div className={`lg:col-span-7 p-4 sm:p-5 rounded-2xl border shadow-xl ${t.cardBg} space-y-4`}>
              <div className={`flex items-center justify-between pb-2 border-b ${t.divider}`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${t.textHeading}`}>
                    Message Template & Content
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  {allTemplates.length} templates available
                </span>
              </div>

              {/* Template Category & Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Select Standard Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${t.dropdownInput} cursor-pointer`}
                  >
                    {allTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.title} ({tpl.category.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Campaign Title / Tag
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Weekend Special Promo"
                    className={`w-full rounded-xl px-3 py-2 text-xs ${t.textInput}`}
                  />
                </div>
              </div>

              {/* Editable Message Text Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-xs font-semibold ${t.textHeading}`}>
                    Custom Message Text (Editable for Campaign)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Placeholders: {'{customer_name}'}, {'{shop_name}'}, {'{phone}'}, {'{nic}'}
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className={`w-full rounded-xl p-3 text-xs leading-relaxed ${t.textInput}`}
                  placeholder="Type your WhatsApp message here..."
                />
              </div>

              {/* Controlled Batch Sending Parameters */}
              <div className={`p-3.5 rounded-xl border ${t.cardSubtleBg} space-y-3`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-500 dark:text-cyan-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Controlled WhatsApp Bulk Dispatch Controls (Anti-Spam Throttling)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomThrottlingOpen(!isCustomThrottlingOpen);
                      setThrottlingError(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                      isCustomThrottlingOpen
                        ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/40'
                        : `${t.cardBg} ${t.textHeading} ${t.border} hover:border-cyan-500`
                    }`}
                  >
                    <Edit3 className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                    <span>{isCustomThrottlingOpen ? 'Close Custom Time' : 'Custom Time Options'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className={`block ${t.textMuted} text-[11px] font-medium mb-1`}>
                      Messages per Batch
                    </label>
                    <select
                      value={[5, 10, 20, 50].includes(batchConfig.batchSize) ? batchConfig.batchSize : 'custom'}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomThrottlingOpen(true);
                        } else {
                          const val = Number(e.target.value);
                          const next = { ...batchConfig, batchSize: val };
                          setBatchConfig(next);
                          setCustomBatchSizeInput(String(val));
                          try { localStorage.setItem('v_bulk_sending_config', JSON.stringify(next)); } catch {}
                        }
                      }}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${t.dropdownInput} cursor-pointer`}
                    >
                      <option value={5}>5 Messages</option>
                      <option value={10}>10 Messages (Recommended)</option>
                      <option value={20}>20 Messages</option>
                      <option value={50}>50 Messages</option>
                      {![5, 10, 20, 50].includes(batchConfig.batchSize) && (
                        <option value="custom">Custom ({batchConfig.batchSize} Messages)</option>
                      )}
                      <option value="custom">✏️ Custom Count...</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block ${t.textMuted} text-[11px] font-medium mb-1`}>
                      Delay Between Messages
                    </label>
                    <select
                      value={[3, 5, 10, 30, 60].includes(batchConfig.delaySeconds) ? batchConfig.delaySeconds : 'custom'}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomThrottlingOpen(true);
                        } else {
                          const val = Number(e.target.value);
                          const next = { ...batchConfig, delaySeconds: val };
                          setBatchConfig(next);
                          setCustomDelaySecondsInput(String(val));
                          try { localStorage.setItem('v_bulk_sending_config', JSON.stringify(next)); } catch {}
                        }
                      }}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${t.dropdownInput} cursor-pointer`}
                    >
                      <option value={3}>3 Seconds</option>
                      <option value={5}>5 Seconds (Safe)</option>
                      <option value={10}>10 Seconds (Recommended)</option>
                      <option value={30}>30 Seconds</option>
                      <option value={60}>1 Minute</option>
                      {![3, 5, 10, 30, 60].includes(batchConfig.delaySeconds) && (
                        <option value="custom">Custom ({batchConfig.delaySeconds}s Delay)</option>
                      )}
                      <option value="custom">✏️ Custom Time...</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block ${t.textMuted} text-[11px] font-medium mb-1`}>
                      Rest Between Batches
                    </label>
                    <select
                      value={[0.5, 1, 2, 5, 10].includes(batchConfig.restMinutes) ? batchConfig.restMinutes : 'custom'}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomThrottlingOpen(true);
                        } else {
                          const val = Number(e.target.value);
                          const next = { ...batchConfig, restMinutes: val };
                          setBatchConfig(next);
                          setCustomRestMinutesInput(String(val));
                          try { localStorage.setItem('v_bulk_sending_config', JSON.stringify(next)); } catch {}
                        }
                      }}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${t.dropdownInput} cursor-pointer`}
                    >
                      <option value={0.5}>30 Seconds</option>
                      <option value={1}>1 Minute</option>
                      <option value={2}>2 Minutes (Safe)</option>
                      <option value={5}>5 Minutes</option>
                      <option value={10}>10 Minutes</option>
                      {![0.5, 1, 2, 5, 10].includes(batchConfig.restMinutes) && (
                        <option value="custom">Custom ({batchConfig.restMinutes}m Rest)</option>
                      )}
                      <option value="custom">✏️ Custom Time...</option>
                    </select>
                  </div>
                </div>

                {/* Custom Time & Throttling Modification Panel */}
                {isCustomThrottlingOpen && (
                  <div className={`p-3.5 rounded-xl border border-cyan-500/30 ${t.cardBg} space-y-3 mt-2 shadow-sm`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${t.textHeading} flex items-center gap-1.5`}>
                        <Clock className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                        <span>Enter Custom Throttling & Time Range</span>
                      </span>
                      <span className={`text-[10px] ${t.textMuted}`}>
                        Validates delay range (1–300s) & rest range (0.1–120m)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={`block text-[11px] font-semibold ${t.textHeading} mb-1`}>
                          Custom Delay (Seconds):
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={300}
                            step={1}
                            value={customDelaySecondsInput}
                            onChange={(e) => {
                              setCustomDelaySecondsInput(e.target.value);
                              setThrottlingError(null);
                            }}
                            placeholder="e.g. 7"
                            className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                          />
                          <span className={`absolute right-3 top-2 text-[11px] ${t.textMuted}`}>sec</span>
                        </div>
                        <span className={`text-[10px] ${t.textMuted} block mt-0.5`}>Min: 1s • Max: 300s</span>
                      </div>

                      <div>
                        <label className={`block text-[11px] font-semibold ${t.textHeading} mb-1`}>
                          Custom Rest Time (Minutes):
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0.1}
                            max={120}
                            step={0.5}
                            value={customRestMinutesInput}
                            onChange={(e) => {
                              setCustomRestMinutesInput(e.target.value);
                              setThrottlingError(null);
                            }}
                            placeholder="e.g. 1.5"
                            className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                          />
                          <span className={`absolute right-3 top-2 text-[11px] ${t.textMuted}`}>min</span>
                        </div>
                        <span className={`text-[10px] ${t.textMuted} block mt-0.5`}>Min: 0.1m (6s) • Max: 120m</span>
                      </div>

                      <div>
                        <label className={`block text-[11px] font-semibold ${t.textHeading} mb-1`}>
                          Custom Batch Size (Msgs):
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={200}
                            step={1}
                            value={customBatchSizeInput}
                            onChange={(e) => {
                              setCustomBatchSizeInput(e.target.value);
                              setThrottlingError(null);
                            }}
                            placeholder="e.g. 15"
                            className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                          />
                          <span className={`absolute right-3 top-2 text-[11px] ${t.textMuted}`}>msgs</span>
                        </div>
                        <span className={`text-[10px] ${t.textMuted} block mt-0.5`}>Min: 1 • Max: 200 msgs</span>
                      </div>
                    </div>

                    {/* Validation Error Message */}
                    {throttlingError && (
                      <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-600 dark:text-rose-300 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{throttlingError}</span>
                      </div>
                    )}

                    {/* Success Feedback Message */}
                    {throttlingSuccess && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-emerald-600 dark:text-emerald-300 text-xs">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>{throttlingSuccess}</span>
                      </div>
                    )}

                    {/* Actions: Save & Validate Button + Reset Defaults */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-500/20">
                      <button
                        type="button"
                        onClick={handleResetThrottlingDefaults}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${t.cardSubtleBg} ${t.textHeading} ${t.border} hover:border-slate-400 flex items-center gap-1 cursor-pointer transition shadow-xs`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Defaults</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveCustomThrottling}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Throttling Times</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right: Live Preview Box (5 cols) */}
            <div className={`lg:col-span-5 p-4 sm:p-5 rounded-2xl border shadow-xl ${t.cardBg} flex flex-col justify-between space-y-4`}>
              <div className="space-y-3">
                <div className={`flex items-center justify-between pb-2 border-b ${t.divider}`}>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${t.textHeading}`}>
                      WhatsApp Live Preview
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Live Simulator
                  </span>
                </div>

                {/* Simulated WhatsApp Chat Bubble with distinct elevated container */}
                <div className={`p-4 rounded-2xl ${t.cardSubtleBg} border ${t.divider} shadow-md relative space-y-3`}>
                  <div className={`flex items-center gap-2 text-xs border-b ${t.divider} pb-2`}>
                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                      {sampleCustomer ? (sampleCustomer.fullName || sampleCustomer.name)[0]?.toUpperCase() : 'C'}
                    </div>
                    <div>
                      <span className={`font-bold block text-xs ${t.textHeading}`}>
                        {sampleCustomer ? (sampleCustomer.fullName || sampleCustomer.name) : 'Sample Customer'}
                      </span>
                      <span className={`text-[10px] ${t.textMuted} font-mono`}>
                        {sampleCustomer ? (sampleCustomer.whatsappNumber || sampleCustomer.phone || 'No phone') : '+94 77 123 4567'}
                      </span>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl ${themeMode === 'dark' ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-100' : 'bg-emerald-50 border-emerald-300 text-emerald-950'} border text-xs leading-relaxed whitespace-pre-wrap font-sans shadow-inner`}>
                    {renderPreviewText(messageBody, sampleCustomer)}
                  </div>

                  <div className={`text-right text-[10px] ${t.textMuted} font-mono`}>
                    Just now • Read ✓✓
                  </div>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleStartBulkCampaign}
                  disabled={selectedCustomerIds.size === 0 || campaignState.status === 'sending'}
                  className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${t.primaryBtn}`}
                >
                  <Send className="w-4 h-4" />
                  <span>
                    Send WhatsApp Campaign to Selected ({selectedCustomerIds.size})
                  </span>
                </button>

                {sampleCustomer && (
                  <button
                    type="button"
                    onClick={() => handleSendSingleNow(sampleCustomer)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-semibold border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Send Test Message to {sampleCustomer.fullName || sampleCustomer.name}</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* ================= SECTION 3: RECIPIENT SELECTION TABLE ================= */}
          <div className={`${t.cardBg} rounded-2xl border shadow-xl overflow-hidden space-y-4`}>
            
            {/* Table Header & Controls */}
            <div className={`p-4 sm:p-5 border-b ${t.divider} space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${t.textHeading}`}>
                      Select Campaign Recipients
                    </h3>
                    <p className={`text-xs ${t.textMuted}`}>
                      Exclude blocked/suspended customers automatically or filter by group
                    </p>
                  </div>
                </div>

                {/* Selected Counter Badge */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
                    Selected Customers: {selectedCustomerIds.size} of {eligibleCustomers.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllEligible}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${t.cardSubtleBg} ${t.textHeading} ${t.border} hover:border-cyan-500 cursor-pointer shadow-xs transition`}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${t.cardSubtleBg} ${t.textHeading} ${t.border} hover:border-cyan-500 cursor-pointer shadow-xs transition`}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by Name, NIC, Mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full rounded-xl pl-9 pr-4 py-2 text-xs ${t.searchInput}`}
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                </div>

                {/* Group Filter */}
                <div>
                  <select
                    value={selectedGroupFilter}
                    onChange={(e) => setSelectedGroupFilter(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${t.dropdownInput} cursor-pointer`}
                  >
                    <option value="all">Filter: All Customer Groups</option>
                    {customerGroups.map((g) => (
                      <option key={g.id} value={g.name}>
                        Group: {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exclude Suspended Toggle */}
                <div className="flex items-center">
                  <label className={`flex items-center gap-2 text-xs ${t.textMain} cursor-pointer select-none`}>
                    <input
                      type="checkbox"
                      checked={excludeSuspended}
                      onChange={(e) => setExcludeSuspended(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                      <span>Exclude Suspended & Blocked accounts</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Recipient Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className={`border-b ${t.divider} ${t.cardSubtleBg} ${t.textHeading}`}>
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={eligibleCustomers.length > 0 && selectedCustomerIds.size === eligibleCustomers.length}
                        onChange={(e) => {
                          if (e.target.checked) handleSelectAllEligible();
                          else handleDeselectAll();
                        }}
                        className="w-4 h-4 rounded text-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className={`p-3.5 font-bold uppercase text-[11px] tracking-wider ${t.textHeading}`}>Customer Name</th>
                    <th className={`p-3.5 font-bold uppercase text-[11px] tracking-wider ${t.textHeading}`}>NIC / Passport</th>
                    <th className={`p-3.5 font-bold uppercase text-[11px] tracking-wider ${t.textHeading}`}>WhatsApp / Mobile</th>
                    <th className={`p-3.5 font-bold uppercase text-[11px] tracking-wider ${t.textHeading}`}>Customer Groups</th>
                    <th className={`p-3.5 font-bold uppercase text-[11px] tracking-wider ${t.textHeading}`}>Status</th>
                    <th className={`p-3.5 font-bold uppercase text-[11px] tracking-wider text-right ${t.textHeading}`}>Quick Send</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${t.divider}`}>
                  {paginatedEligibleCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`p-8 text-center ${t.textMuted}`}>
                        No matching customers found.
                      </td>
                    </tr>
                  ) : (
                    paginatedEligibleCustomers.map((cust) => {
                      const isSelected = selectedCustomerIds.has(cust.id);
                      const isSuspended = isCustomerSuspendedOrBlocked(cust);
                      const phone = cust.whatsappNumber || cust.phone;

                      return (
                        <tr
                          key={cust.id}
                          className={`hover:${t.cardSubtleBg} transition cursor-pointer ${
                            isSelected ? 'bg-cyan-500/10' : ''
                          } ${isSuspended ? 'opacity-70 bg-rose-500/5' : ''}`}
                          onClick={() => handleToggleCustomer(cust.id)}
                        >
                          <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!phone}
                              onChange={() => handleToggleCustomer(cust.id)}
                              className="w-4 h-4 rounded text-emerald-500 cursor-pointer disabled:opacity-30"
                            />
                          </td>
                          <td className="p-3.5">
                            <span className={`font-bold block ${t.textHeading}`}>
                              {cust.fullName || cust.name}
                            </span>
                            {cust.address && (
                              <span className={`text-[10px] ${t.textMuted} block truncate max-w-[200px]`}>
                                {cust.address}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono">
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
                              {cust.nicPassport}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono">
                            {phone ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-500" />
                                <span>{phone}</span>
                              </span>
                            ) : (
                              <span className="text-rose-400 text-[11px] italic font-medium">No phone registered</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              {Array.isArray(cust.groups) && cust.groups.length > 0 ? (
                                cust.groups.map((g) => (
                                  <span key={g} className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300">
                                    {g}
                                  </span>
                                ))
                              ) : (
                                <span className={`italic text-[10px] ${t.textMuted}`}>—</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {getCustomerStatusBadge(cust.status)}
                            {cust.statusRemark && (
                              <span className="block text-[10px] text-rose-300/80 truncate max-w-[140px]" title={cust.statusRemark}>
                                {cust.statusRemark}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={!phone}
                              onClick={() => handleSendSingleNow(cust)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Send WhatsApp message to this customer now"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Send</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Recipient Table Pagination (20 rows per page) */}
            {eligibleCustomers.length > 0 && (
              <div className={`p-3.5 border-t ${t.divider} flex flex-col sm:flex-row items-center justify-between gap-3 text-xs`}>
                <span className={t.textMuted}>
                  Showing <strong className={t.textHeading}>{startRecipientIdx + 1}</strong> to{' '}
                  <strong className={t.textHeading}>
                    {Math.min(startRecipientIdx + RECIPIENT_PAGE_SIZE, eligibleCustomers.length)}
                  </strong>{' '}
                  of <strong className={t.textHeading}>{eligibleCustomers.length}</strong> recipients
                </span>

                {totalRecipientPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safeRecipientPage <= 1}
                      onClick={() => setRecipientPage((p) => Math.max(1, p - 1))}
                      className={`p-1.5 rounded-lg border ${t.divider} ${t.cardSubtleBg} hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer`}
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-300" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalRecipientPages }, (_, i) => i + 1).map((pageNum) => {
                        // Display sliding window around current page
                        if (
                          pageNum === 1 ||
                          pageNum === totalRecipientPages ||
                          (pageNum >= safeRecipientPage - 2 && pageNum <= safeRecipientPage + 2)
                        ) {
                          const isCurrent = pageNum === safeRecipientPage;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setRecipientPage(pageNum)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : `${t.cardSubtleBg} border ${t.divider} text-slate-300 hover:bg-slate-700/50`
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (
                          pageNum === safeRecipientPage - 3 ||
                          pageNum === safeRecipientPage + 3
                        ) {
                          return (
                            <span key={pageNum} className={`px-1 ${t.textMuted}`}>
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={safeRecipientPage >= totalRecipientPages}
                      onClick={() => setRecipientPage((p) => Math.min(totalRecipientPages, p + 1))}
                      className={`p-1.5 rounded-lg border ${t.divider} ${t.cardSubtleBg} hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer`}
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      ) : (
        /* ================= SECTION 4: AUDIT TRAIL & MESSAGE HISTORY ================= */
        <div className={`${t.cardBg} rounded-2xl border shadow-xl overflow-hidden space-y-4`}>
          
          <div className={`p-4 sm:p-5 border-b ${t.divider} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
            <div>
              <h3 className={`text-base font-bold ${t.textHeading}`}>
                Message Audit Trail & Log
              </h3>
              <p className={`text-xs ${t.textMuted}`}>
                Historical log of all individual & bulk WhatsApp messages dispatched from system
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search history by Name, NIC, Mobile..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className={`w-full rounded-xl pl-9 pr-4 py-2 text-xs ${t.searchInput}`}
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className={`border-b ${t.divider} ${t.cardSubtleBg} ${t.textHeading}`}>
                <tr>
                  <th className="p-3.5 font-bold">Sent At</th>
                  <th className="p-3.5 font-bold">Customer Name</th>
                  <th className="p-3.5 font-bold">NIC / Mobile</th>
                  <th className="p-3.5 font-bold">Template & Campaign</th>
                  <th className="p-3.5 font-bold">Dispatched Content</th>
                  <th className="p-3.5 font-bold">Sent By</th>
                  <th className="p-3.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divider}`}>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`p-8 text-center ${t.textMuted}`}>
                      No message history logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((item) => {
                    const dateStr = new Date(item.sentAt).toLocaleString();
                    const phone = item.mobileNumber || (item as any).phoneNumber || 'N/A';
                    const template = item.templateTitle || (item as any).templateName || 'Custom Message';
                    const msgContent = item.actualMessage || (item as any).messageContent || '';

                    return (
                      <tr key={item.id} className="hover:bg-slate-500/10 transition">
                        <td className={`p-3.5 font-mono text-[11px] ${t.textMuted} whitespace-nowrap`}>
                          {dateStr}
                        </td>
                        <td className={`p-3.5 font-bold ${t.textHeading} whitespace-nowrap`}>
                          {item.customerName || 'Customer'}
                        </td>
                        <td className="p-3.5 font-mono">
                          <span className="text-cyan-500 dark:text-cyan-400 font-semibold block">{item.customerNic || 'N/A'}</span>
                          <span className={`${t.textMuted} text-[10px] block`}>📞 {phone}</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`font-semibold ${t.textHeading} block`}>
                            {template}
                          </span>
                          {item.campaignName && (
                            <span className={`text-[10px] ${t.textMuted} block font-mono`}>
                              🏷 {item.campaignName}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <p className={`line-clamp-2 text-[11px] ${t.textMain} font-sans whitespace-pre-wrap`}>
                            {msgContent}
                          </p>
                        </td>
                        <td className={`p-3.5 ${t.textMuted} text-[11px] whitespace-nowrap`}>
                          {item.sentBy || 'System'}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {item.status === 'sent' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                              ✓ Sent
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30" title={item.failureReason}>
                              ✕ Failed
                            </span>
                          )}
                          {item.status === 'delivered' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                              ✓✓ Delivered
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* History Pagination Footer (20 rows per page) */}
          {filteredHistory.length > 0 && (
            <div className={`p-3.5 border-t ${t.divider} ${t.cardSubtleBg} flex flex-col sm:flex-row items-center justify-between gap-3 text-xs`}>
              <div className={t.textMuted}>
                Showing <span className={`font-bold ${t.textHeading}`}>{startHistoryIdx + 1}</span> to{' '}
                <span className={`font-bold ${t.textHeading}`}>
                  {Math.min(startHistoryIdx + HISTORY_PAGE_SIZE, filteredHistory.length)}
                </span>{' '}
                of <span className={`font-bold ${t.textHeading}`}>{filteredHistory.length}</span> logs (Page {safeHistoryPage} of {totalHistoryPages})
              </div>

              {totalHistoryPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={safeHistoryPage <= 1}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                      safeHistoryPage <= 1
                        ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500'
                        : `${t.cardBg} ${t.border} ${t.textHeading} hover:border-cyan-500 cursor-pointer`
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalHistoryPages }, (_, idx) => idx + 1)
                      .filter((p) => p === 1 || p === totalHistoryPages || Math.abs(p - safeHistoryPage) <= 2)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && p - prev > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className={`px-1 ${t.textMuted}`}>…</span>}
                            <button
                              type="button"
                              onClick={() => setHistoryPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                                p === safeHistoryPage
                                  ? 'bg-cyan-500 text-white shadow-sm'
                                  : `${t.cardBg} ${t.border} ${t.textMuted} hover:${t.textHeading} cursor-pointer`
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                    disabled={safeHistoryPage >= totalHistoryPages}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                      safeHistoryPage >= totalHistoryPages
                        ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500'
                        : `${t.cardBg} ${t.border} ${t.textHeading} hover:border-cyan-500 cursor-pointer`
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
