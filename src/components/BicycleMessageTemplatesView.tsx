import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  RotateCcw, 
  Plus, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  Save, 
  Users, 
  Link as LinkIcon, 
  Check, 
  Send,
  PhoneCall,
  ExternalLink,
  ShieldCheck,
  Bell,
  ChevronDown,
  CheckSquare,
  Square,
  Settings,
  Search,
} from 'lucide-react';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { AppSettings, MessageTemplate, MessageTemplateCategory, NotificationContact, WhatsAppGroupLink } from '../types';
import { UserAccount } from '../utils/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  syncMessageTemplateToSupabase,
  syncAllMessageTemplatesToSupabase,
  deleteMessageTemplateFromSupabase,
  fetchMessageTemplatesFromSupabase,
  syncSettingsToSupabase,
  syncNotificationConfigToSupabase,
} from '../lib/supabaseSync';
import {
  DEFAULT_MESSAGE_TEMPLATES,
  getStoredMessageTemplates,
  saveStoredMessageTemplates,
  resolveTemplatePlaceholders,
  cleanWhatsAppPhoneNumber,
} from '../utils/customer';
import {
  NotificationDeliveryLog,
  getStoredDeliveryLogs,
  saveStoredDeliveryLogs,
  dispatchRentalNotification,
} from '../utils/bicyclePosUtils';

interface BicycleMessageTemplatesViewProps {
  currentUser: UserAccount;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  settings?: AppSettings;
  onUpdateSettings?: (updated: Partial<AppSettings>) => void;
}

export const BicycleMessageTemplatesView: React.FC<BicycleMessageTemplatesViewProps> = ({
  currentUser,
  themeMode = 'dark',
  accent = 'emerald',
  settings,
  onUpdateSettings,
}) => {
  const t = getThemeClasses(themeMode, accent);
  const isDark = themeMode !== 'light';

  // Active sub-tab: 'templates' | 'contacts' | 'delivery_logs'
  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'contacts' | 'delivery_logs'>('templates');
  const [deliveryLogs, setDeliveryLogs] = useState<NotificationDeliveryLog[]>(() => getStoredDeliveryLogs());
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<NotificationDeliveryLog | null>(null);
  const [testSendPhone, setTestSendPhone] = useState('0773606494');
  const [testSendStatus, setTestSendStatus] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    const handleDispatched = () => {
      setDeliveryLogs(getStoredDeliveryLogs());
    };
    window.addEventListener('cycly_notification_dispatched', handleDispatched);
    return () => window.removeEventListener('cycly_notification_dispatched', handleDispatched);
  }, []);

  const [templates, setTemplates] = useState<MessageTemplate[]>(() => getStoredMessageTemplates());
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('all');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplCategory, setTmplCategory] = useState<MessageTemplateCategory>('general');
  const [tmplContent, setTmplContent] = useState('');
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Additional WhatsApp contacts & group links states
  const [additionalContacts, setAdditionalContacts] = useState<NotificationContact[]>(() => {
    return settings?.additionalWhatsAppContacts || [
      { id: 'cnt-mgr', name: 'Store Manager', phone: '0773606494', active: true },
      { id: 'cnt-ops', name: 'Operations Desk', phone: '0772837620', active: true },
    ];
  });

  const [groupLinks, setGroupLinks] = useState<WhatsAppGroupLink[]>(() => {
    return settings?.whatsappGroupLinks || [
      { id: 'grp-1', name: 'Cycly Fleet Desk WhatsApp Group', url: 'https://chat.whatsapp.com/', active: true },
    ];
  });

  const [notifyCustomerOnStart, setNotifyCustomerOnStart] = useState<boolean>(() => settings?.notifyCustomerOnStart ?? true);
  const [notifyCustomerOnEnd, setNotifyCustomerOnEnd] = useState<boolean>(() => settings?.notifyCustomerOnEnd ?? true);
  const [notifyAdditionalOnStart, setNotifyAdditionalOnStart] = useState<boolean>(() => settings?.notifyAdditionalContactsOnStart ?? true);
  const [notifyAdditionalOnEnd, setNotifyAdditionalOnEnd] = useState<boolean>(() => settings?.notifyAdditionalContactsOnEnd ?? true);
  const [notifyBirthday, setNotifyBirthday] = useState<boolean>(() => settings?.notifyCustomerOnBirthday ?? true);
  const [notifyReminders, setNotifyReminders] = useState<boolean>(() => settings?.notifyRentalReminders ?? true);
  const [isDispatchDropdownOpen, setIsDispatchDropdownOpen] = useState(false);

  // New Contact form states
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);

  // New Group Link form states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupUrl, setNewGroupUrl] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);

  // Edit Contact & Group states
  const [editingContact, setEditingContact] = useState<NotificationContact | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');

  const [editingGroup, setEditingGroup] = useState<WhatsAppGroupLink | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupUrl, setEditGroupUrl] = useState('');

  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchMessageTemplatesFromSupabase().then((cloudTmpls) => {
        const merged = new Map<string, MessageTemplate>();
        for (const def of DEFAULT_MESSAGE_TEMPLATES) {
          merged.set(def.id, def);
        }
        if (cloudTmpls && cloudTmpls.length > 0) {
          for (const ct of cloudTmpls) {
            merged.set(ct.id, ct);
          }
        }
        const fullList = Array.from(merged.values());
        setTemplates(fullList);
        saveStoredMessageTemplates(fullList);
      });
    }
  }, []);

  const matchTemplateCategory = (tmplCat: string, filterCat: string): boolean => {
    if (filterCat === 'all') return true;
    const cat = (tmplCat || '').toLowerCase().trim();
    if (cat === filterCat) return true;

    if (filterCat === 'birthday') {
      return cat === 'birthday' || cat.includes('birthday');
    }
    if (filterCat === 'rental') {
      return cat === 'rental' || cat === 'welcome' || cat === 'return_reminder' || cat.includes('rental') || cat.includes('return') || cat.includes('start');
    }
    if (filterCat === 'reminder') {
      return cat === 'reminder' || cat === 'rental_reminder' || cat === 'payment_reminder' || cat.includes('reminder');
    }
    if (filterCat === 'marketing') {
      return (
        cat === 'marketing' ||
        cat === 'promotion' ||
        cat === 'tourist_promo' ||
        cat === 'fitness_promo' ||
        cat === 'special_offer' ||
        cat === 'holiday_greeting' ||
        cat.includes('promo') ||
        cat.includes('offer') ||
        cat.includes('greeting')
      );
    }
    if (filterCat === 'general') {
      return cat === 'general' || cat === 'thank_you' || cat === 'other';
    }
    return false;
  };

  const getCategoryBadgeDetails = (cat: string) => {
    if (matchTemplateCategory(cat, 'birthday')) {
      return { label: 'Birthday Wishes', badge: 'bg-pink-500/15 text-pink-400 border-pink-500/30' };
    }
    if (matchTemplateCategory(cat, 'rental')) {
      return { label: 'Rental Desk', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    }
    if (matchTemplateCategory(cat, 'reminder')) {
      return { label: 'Reminder', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    if (matchTemplateCategory(cat, 'marketing')) {
      return { label: 'Marketing & Promo', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    }
    return { label: 'General', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((tmpl) => matchTemplateCategory(tmpl.category, templateCategoryFilter));
  }, [templates, templateCategoryFilter]);

  const handleOpenAddTemplate = () => {
    setEditingTemplateId(null);
    setTmplTitle('');
    const defaultCat = (templateCategoryFilter !== 'all' && ['birthday', 'rental', 'reminder', 'marketing', 'general'].includes(templateCategoryFilter))
      ? (templateCategoryFilter as MessageTemplateCategory)
      : 'general';
    setTmplCategory(defaultCat);
    setTmplContent('');
    setTemplateError(null);
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: MessageTemplate) => {
    setEditingTemplateId(tmpl.id);
    setTmplTitle(tmpl.title);
    setTmplCategory(tmpl.category);
    setTmplContent(tmpl.content);
    setTemplateError(null);
    setIsTemplateModalOpen(true);
  };

  const handleInsertTag = (tag: string) => {
    setTmplContent((prev) => `${prev}${prev.endsWith(' ') || prev.length === 0 ? '' : ' '}${tag} `);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplTitle.trim()) {
      setTemplateError('Template title is required');
      return;
    }
    if (!tmplContent.trim()) {
      setTemplateError('Template content cannot be empty');
      return;
    }

    let updatedList: MessageTemplate[];
    let targetTemplate: MessageTemplate;

    if (editingTemplateId) {
      targetTemplate = {
        id: editingTemplateId,
        title: tmplTitle.trim(),
        category: tmplCategory,
        content: tmplContent.trim(),
        updatedAt: Date.now(),
      };
      updatedList = templates.map((t) => (t.id === editingTemplateId ? targetTemplate : t));
    } else {
      targetTemplate = {
        id: `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: tmplTitle.trim(),
        category: tmplCategory,
        content: tmplContent.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      updatedList = [targetTemplate, ...templates];
    }

    // Immediately persist locally & dispatch event so future messages use this updated template instantly
    setTemplates(updatedList);
    saveStoredMessageTemplates(updatedList);

    if (isSupabaseConfigured()) {
      const syncRes = await syncMessageTemplateToSupabase(targetTemplate);
      if (!syncRes.success) {
        console.warn('Supabase sync notice:', syncRes.error);
      }
    }

    setIsTemplateModalOpen(false);
    setTemplateSuccess(editingTemplateId ? '✓ Template updated! Will be immediately used for future messages.' : '✓ New template created and active!');
    setTimeout(() => setTemplateSuccess(null), 3500);
  };

  const handleDeleteTemplate = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete template "${title}"?`)) {
      if (isSupabaseConfigured()) {
        const syncRes = await deleteMessageTemplateFromSupabase(id);
        if (!syncRes.success) {
          console.warn('Supabase delete error:', syncRes.error);
        }
      }
      const updatedList = templates.filter((t) => t.id !== id);
      setTemplates(updatedList);
      saveStoredMessageTemplates(updatedList);
      setTemplateSuccess(`Template "${title}" deleted.`);
      setTimeout(() => setTemplateSuccess(null), 2500);
    }
  };

  const handleResetDefaultTemplates = async () => {
    if (confirm('Reset to standard system default message templates? Custom changes will be replaced.')) {
      if (isSupabaseConfigured()) {
        await syncAllMessageTemplatesToSupabase(DEFAULT_MESSAGE_TEMPLATES);
      }
      setTemplates(DEFAULT_MESSAGE_TEMPLATES);
      saveStoredMessageTemplates(DEFAULT_MESSAGE_TEMPLATES);
      setTemplateSuccess('Templates reset to default successfully without duration!');
      setTimeout(() => setTemplateSuccess(null), 3000);
    }
  };

  // --- ADDITIONAL CONTACTS HANDLERS ---
  const handleAddContact = () => {
    const name = newContactName.trim();
    const phone = newContactPhone.trim();
    if (!name) {
      setContactError('Please enter contact name or role title.');
      return;
    }
    if (!phone) {
      setContactError('Please enter a valid WhatsApp phone number.');
      return;
    }

    const newContact: NotificationContact = {
      id: `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      phone,
      active: true,
    };

    const updated = [...additionalContacts, newContact];
    setAdditionalContacts(updated);
    setNewContactName('');
    setNewContactPhone('');
    setContactError(null);
    handlePersistNotificationSettings(updated, groupLinks);
  };

  const handleToggleContact = (id: string) => {
    const updated = additionalContacts.map((c) => (c.id === id ? { ...c, active: !c.active } : c));
    setAdditionalContacts(updated);
    handlePersistNotificationSettings(updated, groupLinks);
  };

  const handleDeleteContact = (id: string) => {
    const updated = additionalContacts.filter((c) => c.id !== id);
    setAdditionalContacts(updated);
    handlePersistNotificationSettings(updated, groupLinks);
  };

  // --- WHATSAPP GROUP LINKS HANDLERS ---
  const handleAddGroupLink = () => {
    const name = newGroupName.trim();
    const url = newGroupUrl.trim();
    if (!name) {
      setGroupError('Please enter group name.');
      return;
    }
    if (!url) {
      setGroupError('Please enter WhatsApp group link (e.g. https://chat.whatsapp.com/...).');
      return;
    }

    const newGroup: WhatsAppGroupLink = {
      id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      url,
      active: true,
    };

    const updated = [...groupLinks, newGroup];
    setGroupLinks(updated);
    setNewGroupName('');
    setNewGroupUrl('');
    setGroupError(null);
    handlePersistNotificationSettings(additionalContacts, updated);
  };

  const handleToggleGroup = (id: string) => {
    const updated = groupLinks.map((g) => (g.id === id ? { ...g, active: !g.active } : g));
    setGroupLinks(updated);
    handlePersistNotificationSettings(additionalContacts, updated);
  };

  const handleDeleteGroup = (id: string) => {
    const updated = groupLinks.filter((g) => g.id !== id);
    setGroupLinks(updated);
    handlePersistNotificationSettings(additionalContacts, updated);
  };

  const handleOpenEditContact = (c: NotificationContact) => {
    setEditingContact(c);
    setEditContactName(c.name);
    setEditContactPhone(c.phone);
  };

  const handleSaveEditContact = () => {
    if (!editingContact || !editContactName.trim()) return;
    const updated = additionalContacts.map((c) =>
      c.id === editingContact.id ? { ...c, name: editContactName.trim(), phone: editContactPhone.trim() } : c
    );
    setAdditionalContacts(updated);
    handlePersistNotificationSettings(updated, groupLinks);
    setEditingContact(null);
  };

  const handleOpenEditGroup = (g: WhatsAppGroupLink) => {
    setEditingGroup(g);
    setEditGroupName(g.name);
    setEditGroupUrl(g.url);
  };

  const handleSaveEditGroup = () => {
    if (!editingGroup || !editGroupName.trim() || !editGroupUrl.trim()) return;
    const updated = groupLinks.map((g) =>
      g.id === editingGroup.id ? { ...g, name: editGroupName.trim(), url: editGroupUrl.trim() } : g
    );
    setGroupLinks(updated);
    handlePersistNotificationSettings(additionalContacts, updated);
    setEditingGroup(null);
  };

  const handlePersistNotificationSettings = (
    contacts = additionalContacts,
    groups = groupLinks,
    custStart = notifyCustomerOnStart,
    custEnd = notifyCustomerOnEnd,
    addStart = notifyAdditionalOnStart,
    addEnd = notifyAdditionalOnEnd,
    bday = notifyBirthday,
    reminders = notifyReminders
  ) => {
    const updatedSettingsPayload: Partial<AppSettings> = {
      additionalWhatsAppContacts: contacts,
      whatsappGroupLinks: groups,
      notifyCustomerOnStart: custStart,
      notifyCustomerOnEnd: custEnd,
      notifyAdditionalContactsOnStart: addStart,
      notifyAdditionalContactsOnEnd: addEnd,
      notifyCustomerOnBirthday: bday,
      notifyRentalReminders: reminders,
    };

    if (onUpdateSettings) {
      onUpdateSettings(updatedSettingsPayload);
    }

    if (settings) {
      const merged = { ...settings, ...updatedSettingsPayload };
      localStorage.setItem('v_rental_settings', JSON.stringify(merged));
      if (isSupabaseConfigured()) {
        syncSettingsToSupabase(merged);
        syncNotificationConfigToSupabase(merged);
      }
    }

    setSaveSettingsSuccess('✓ WhatsApp notification contacts & settings saved to database!');
    setTimeout(() => setSaveSettingsSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* SECTION HEADER & TABS */}
      <div className={`${t.cardBg} rounded-2xl p-4 sm:p-6 border shadow-xl space-y-5`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${t.divider}`}>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                  Message Templates & WhatsApp Notifications
                </h2>
                <p className={`text-xs ${t.textMuted} mt-0.5`}>
                  Manage automated WhatsApp rental messages, additional notification contacts, and WhatsApp group links.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* MESSAGE DISPATCH RULES CHECKBOX DROPDOWN (Requirement 9) */}
            <div className="relative">
              <button
                id="btn-message-dispatch-dropdown"
                type="button"
                onClick={() => setIsDispatchDropdownOpen((prev) => !prev)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition shadow-sm cursor-pointer ${
                  isDispatchDropdownOpen
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                    : t.inactiveTab
                }`}
                title="Select which automated messages and notifications are active"
              >
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                <span>Message Dispatch ({[
                  notifyCustomerOnStart,
                  notifyCustomerOnEnd,
                  notifyAdditionalOnStart,
                  notifyAdditionalOnEnd,
                  notifyBirthday,
                  notifyReminders,
                ].filter(Boolean).length}/6)</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDispatchDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDispatchDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDispatchDropdownOpen(false)} 
                  />
                  <div className={`absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl p-3.5 z-50 space-y-2.5 animate-in fade-in zoom-in-95 ${t.modalBg}`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span className={t.textHeading}>Notification Dispatch Selection</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        [
                          notifyCustomerOnStart,
                          notifyCustomerOnEnd,
                          notifyAdditionalOnStart,
                          notifyAdditionalOnEnd,
                          notifyBirthday,
                          notifyReminders,
                        ].filter(Boolean).length > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {[
                          notifyCustomerOnStart,
                          notifyCustomerOnEnd,
                          notifyAdditionalOnStart,
                          notifyAdditionalOnEnd,
                          notifyBirthday,
                          notifyReminders,
                        ].filter(Boolean).length} Active
                      </span>
                    </div>

                    <p className={`text-[11px] ${t.textMuted}`}>
                      Check or uncheck the automated notifications and dispatch triggers below:
                    </p>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {/* 1. Start - Customer */}
                      <label className={`flex items-start gap-2.5 p-2 rounded-xl transition cursor-pointer ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'}`}>
                        <input
                          type="checkbox"
                          checked={notifyCustomerOnStart}
                          onChange={(e) => {
                            setNotifyCustomerOnStart(e.target.checked);
                            handlePersistNotificationSettings(undefined, undefined, e.target.checked);
                          }}
                          className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className={`font-semibold block ${t.textMain}`}>Rental Start (Customer)</span>
                          <span className={`text-[10px] ${t.textMuted}`}>Dispatches welcome message & receipt link to customer</span>
                        </div>
                      </label>

                      {/* 2. Start - Additional Contacts */}
                      <label className={`flex items-start gap-2.5 p-2 rounded-xl transition cursor-pointer ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'}`}>
                        <input
                          type="checkbox"
                          checked={notifyAdditionalOnStart}
                          onChange={(e) => {
                            setNotifyAdditionalOnStart(e.target.checked);
                            handlePersistNotificationSettings(undefined, undefined, undefined, undefined, e.target.checked);
                          }}
                          className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className={`font-semibold block ${t.textMain}`}>Rental Start (Additional Contacts / Group)</span>
                          <span className={`text-[10px] ${t.textMuted}`}>Alerts Store Manager / Ops Desk on new rental start</span>
                        </div>
                      </label>

                      {/* 3. Return - Customer */}
                      <label className={`flex items-start gap-2.5 p-2 rounded-xl transition cursor-pointer ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'}`}>
                        <input
                          type="checkbox"
                          checked={notifyCustomerOnEnd}
                          onChange={(e) => {
                            setNotifyCustomerOnEnd(e.target.checked);
                            handlePersistNotificationSettings(undefined, undefined, undefined, e.target.checked);
                          }}
                          className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className={`font-semibold block ${t.textMain}`}>Rental Return & Settle (Customer)</span>
                          <span className={`text-[10px] ${t.textMuted}`}>Sends return thank you & settlement summary</span>
                        </div>
                      </label>

                      {/* 4. Return - Additional Contacts */}
                      <label className={`flex items-start gap-2.5 p-2 rounded-xl transition cursor-pointer ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'}`}>
                        <input
                          type="checkbox"
                          checked={notifyAdditionalOnEnd}
                          onChange={(e) => {
                            setNotifyAdditionalOnEnd(e.target.checked);
                            handlePersistNotificationSettings(undefined, undefined, undefined, undefined, undefined, e.target.checked);
                          }}
                          className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className={`font-semibold block ${t.textMain}`}>Rental Return (Additional Contacts / Group)</span>
                          <span className={`text-[10px] ${t.textMuted}`}>Alerts Store Manager / Desk on vehicle check-in</span>
                        </div>
                      </label>

                      {/* 5. Birthday Wishes */}
                      <label className={`flex items-start gap-2.5 p-2 rounded-xl transition cursor-pointer ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'}`}>
                        <input
                          type="checkbox"
                          checked={notifyBirthday}
                          onChange={(e) => {
                            setNotifyBirthday(e.target.checked);
                            handlePersistNotificationSettings(undefined, undefined, undefined, undefined, undefined, undefined, e.target.checked);
                          }}
                          className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className={`font-semibold block ${t.textMain}`}>Customer Birthday Greetings</span>
                          <span className={`text-[10px] ${t.textMuted}`}>Enables 1-click birthday wishes in customer directory</span>
                        </div>
                      </label>

                      {/* 6. Overdue & Return Reminders */}
                      <label className={`flex items-start gap-2.5 p-2 rounded-xl transition cursor-pointer ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'}`}>
                        <input
                          type="checkbox"
                          checked={notifyReminders}
                          onChange={(e) => {
                            setNotifyReminders(e.target.checked);
                            handlePersistNotificationSettings(undefined, undefined, undefined, undefined, undefined, undefined, undefined, e.target.checked);
                          }}
                          className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className={`font-semibold block ${t.textMain}`}>Overdue & Return Reminders</span>
                          <span className={`text-[10px] ${t.textMuted}`}>Enables automated return reminder triggers</span>
                        </div>
                      </label>
                    </div>

                    <div className={`pt-2 border-t flex items-center justify-between text-[11px] ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setNotifyCustomerOnStart(true);
                          setNotifyCustomerOnEnd(true);
                          setNotifyAdditionalOnStart(true);
                          setNotifyAdditionalOnEnd(true);
                          setNotifyBirthday(true);
                          setNotifyReminders(true);
                          handlePersistNotificationSettings(undefined, undefined, true, true, true, true, true, true);
                        }}
                        className="text-emerald-500 hover:underline font-semibold cursor-pointer"
                      >
                        Enable All
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDispatchDropdownOpen(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${t.primaryBtn} cursor-pointer`}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetDefaultTemplates}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${t.inactiveTab}`}
              title="Restore standard system templates"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            {activeSubTab === 'templates' && (
              <button
                id="btn-add-message-template"
                type="button"
                onClick={handleOpenAddTemplate}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${t.primaryBtn}`}
              >
                <Plus className="w-4 h-4" />
                <span>New Template</span>
              </button>
            )}
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {templateSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{templateSuccess}</span>
          </div>
        )}

        {saveSettingsSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSettingsSuccess}</span>
          </div>
        )}

        {/* TOP SUB-TAB NAVIGATOR */}
        <div className={`flex items-center gap-2 p-1 rounded-xl border max-w-fit ${
          isDark ? 'bg-slate-900/40 border-slate-700/50' : 'bg-slate-100 border-slate-300'
        }`}>
          <button
            type="button"
            onClick={() => setActiveSubTab('templates')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'templates'
                ? 'bg-emerald-500 text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-700 hover:text-slate-950 font-semibold'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Message Templates ({templates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('contacts')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'contacts'
                ? 'bg-purple-600 text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-700 hover:text-slate-950 font-semibold'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Additional Contacts & Groups ({additionalContacts.length + groupLinks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('delivery_logs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'delivery_logs'
                ? 'bg-cyan-600 text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-700 hover:text-slate-950 font-semibold'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Delivery Logs & Troubleshooting</span>
          </button>
        </div>

        {/* ================= TAB 1: TEMPLATES ================= */}
        {activeSubTab === 'templates' && (
          <div className="space-y-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'All Templates' },
                { id: 'rental', label: 'Rental Desk' },
                { id: 'birthday', label: 'Birthday Wishes' },
                { id: 'reminder', label: 'Reminders' },
                { id: 'marketing', label: 'Promotions' },
                { id: 'general', label: 'General' },
              ].map((tab) => {
                const isActive = templateCategoryFilter === tab.id;
                const count = templates.filter((t) => matchTemplateCategory(t.category, tab.id)).length;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTemplateCategoryFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isActive ? t.activeTab : t.inactiveTab
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isDark
                        ? 'bg-slate-700/50 text-slate-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Template Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.length === 0 ? (
                <div className={`col-span-full p-8 rounded-2xl border border-dashed text-center space-y-2 ${
                  isDark ? 'border-slate-700' : 'border-slate-300'
                }`}>
                  <p className={`text-sm font-semibold ${t.textHeading}`}>
                    No message templates found in this category.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddTemplate}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${t.primaryBtn}`}
                  >
                    + Create New Template
                  </button>
                </div>
              ) : (
                filteredTemplates.map((tmpl) => {
                  const badgeInfo = getCategoryBadgeDetails(tmpl.category);
                  const isReturnThanks = tmpl.id === 'tmpl-return-thanks';
                  const isWelcomeStart = tmpl.id === 'tmpl-welcome-start';

                  return (
                    <div
                      key={tmpl.id}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${t.cardSubtleBg} hover:border-emerald-500/30`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeInfo.badge}`}>
                                {badgeInfo.label}
                              </span>
                              {(isWelcomeStart || isReturnThanks) && (
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                  isDark ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-300'
                                }`}>
                                  {isWelcomeStart ? '⚡ Auto Start Message' : '⚡ Auto End Message'}
                                </span>
                              )}
                              <h4 className={`text-sm font-bold ${t.textHeading}`}>
                                {tmpl.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTemplate(tmpl)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                              title="Edit Template"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tmpl.id, tmpl.title)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Delete Template"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* WhatsApp Message Preview Bubble */}
                        <div className={`p-3.5 rounded-xl border text-xs font-mono leading-relaxed whitespace-pre-wrap select-all ${
                          isDark
                            ? 'bg-slate-900/60 border-slate-700/50 text-slate-200'
                            : 'bg-emerald-50/70 border-emerald-200 text-slate-800 shadow-sm'
                        }`}>
                          {tmpl.content}
                        </div>
                      </div>

                      <div className={`mt-3 pt-2.5 border-t ${t.divider} flex items-center justify-between text-[11px] ${
                        isDark ? 'text-slate-400' : 'text-slate-600 font-medium'
                      }`}>
                        <span className="font-mono">ID: {tmpl.id}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditTemplate(tmpl)}
                          className="font-bold text-emerald-500 hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Customize Template</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: ADDITIONAL CONTACTS & GROUPS ================= */}
        {activeSubTab === 'contacts' && (
          <div className="space-y-6">
            {/* Automatic Notification Toggles */}
            <div className={`p-4 sm:p-5 rounded-2xl border ${t.cardSubtleBg} space-y-4`}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <h3 className={`text-sm font-bold ${t.textHeading}`}>
                  Automated Start & End Notification Rules
                </h3>
              </div>
              <p className={`text-xs ${t.textMuted}`}>
                Configure who automatically receives WhatsApp notifications when a bicycle or motorbike rental starts or ends.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                  isDark ? 'bg-slate-900/40 border-slate-700/50' : 'bg-slate-50 border-slate-200 shadow-sm'
                }`}>
                  <input
                    type="checkbox"
                    checked={notifyCustomerOnStart}
                    onChange={(e) => {
                      setNotifyCustomerOnStart(e.target.checked);
                      handlePersistNotificationSettings(additionalContacts, groupLinks, e.target.checked);
                    }}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className={`font-bold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Customer on Start Rental</span>
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Send welcome message to customer phone</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                  isDark ? 'bg-slate-900/40 border-slate-700/50' : 'bg-slate-50 border-slate-200 shadow-sm'
                }`}>
                  <input
                    type="checkbox"
                    checked={notifyCustomerOnEnd}
                    onChange={(e) => {
                      setNotifyCustomerOnEnd(e.target.checked);
                      handlePersistNotificationSettings(additionalContacts, groupLinks, undefined, e.target.checked);
                    }}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className={`font-bold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Customer on End Rental</span>
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Send return receipt message (without duration)</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                  isDark ? 'bg-slate-900/40 border-slate-700/50' : 'bg-slate-50 border-slate-200 shadow-sm'
                }`}>
                  <input
                    type="checkbox"
                    checked={notifyAdditionalOnStart}
                    onChange={(e) => {
                      setNotifyAdditionalOnStart(e.target.checked);
                      handlePersistNotificationSettings(additionalContacts, groupLinks, undefined, undefined, e.target.checked);
                    }}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className={`font-bold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Additional Contacts on Start</span>
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Notify Owner/Manager when a rental starts</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                  isDark ? 'bg-slate-900/40 border-slate-700/50' : 'bg-slate-50 border-slate-200 shadow-sm'
                }`}>
                  <input
                    type="checkbox"
                    checked={notifyAdditionalOnEnd}
                    onChange={(e) => {
                      setNotifyAdditionalOnEnd(e.target.checked);
                      handlePersistNotificationSettings(additionalContacts, groupLinks, undefined, undefined, undefined, e.target.checked);
                    }}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className={`font-bold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Additional Contacts on End</span>
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Notify Owner/Manager when rental settles</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Additional WhatsApp Contacts Manager */}
            <div className={`p-4 sm:p-5 rounded-2xl border ${t.cardSubtleBg} space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-cyan-500" />
                    <h3 className={`text-sm font-bold ${t.textHeading}`}>
                      Additional WhatsApp Notification Numbers
                    </h3>
                  </div>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>
                    These contacts automatically receive copy of Start and End rental messages.
                  </p>
                </div>
              </div>

              {/* Add New Contact Form */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-900/50 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block">
                  Add Additional WhatsApp Contact
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Name / Role (e.g. Store Owner, Operations Desk)"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="tel"
                      placeholder="WhatsApp Number (e.g. 0771234567 or +94771234567)"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono border ${t.inputBg}`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddContact}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${t.primaryBtn}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
                {contactError && (
                  <p className="text-xs text-rose-500 font-semibold">{contactError}</p>
                )}
              </div>

              {/* Contacts Table */}
              <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-slate-700/60' : 'border-slate-200 shadow-sm'}`}>
                <table className="w-full text-left text-xs">
                  <thead className={`border-b font-bold uppercase text-[11px] ${
                    isDark ? 'bg-slate-900/70 border-slate-700/60 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3">Name / Role</th>
                      <th className="py-2.5 px-3">WhatsApp Number</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-200'}`}>
                    {additionalContacts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500 italic">
                          No additional WhatsApp contacts added. Add phone numbers above.
                        </td>
                      </tr>
                    ) : (
                      additionalContacts.map((c) => (
                        <tr key={c.id} className={`transition ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                          <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{c.name}</td>
                          <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-700 font-bold'}`}>
                            {cleanWhatsAppPhoneNumber(c.phone) || c.phone}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleContact(c.id)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                                c.active !== false
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {c.active !== false ? '● Active' : 'Disabled'}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditContact(c)}
                                className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                                title="Edit Contact"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteContact(c.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Delete Contact"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* WhatsApp Group Links Manager */}
            <div className={`p-4 sm:p-5 rounded-2xl border ${t.cardSubtleBg} space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-purple-500" />
                    <h3 className={`text-sm font-bold ${t.textHeading}`}>
                      WhatsApp Group Links
                    </h3>
                  </div>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>
                    Maintain shop or fleet WhatsApp group invite links for operations broadcasting.
                  </p>
                </div>
              </div>

              {/* Add New Group Link Form */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-900/50 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                  Add WhatsApp Group Link
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Group Name (e.g. Cycly Fleet Desk Group)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="url"
                      placeholder="Group URL (e.g. https://chat.whatsapp.com/ABC123XYZ)"
                      value={newGroupUrl}
                      onChange={(e) => setNewGroupUrl(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono border ${t.inputBg}`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddGroupLink}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${t.primaryBtn}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
                {groupError && (
                  <p className="text-xs text-rose-500 font-semibold">{groupError}</p>
                )}
              </div>

              {/* Group Links Table */}
              <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-slate-700/60' : 'border-slate-200 shadow-sm'}`}>
                <table className="w-full text-left text-xs">
                  <thead className={`border-b font-bold uppercase text-[11px] ${
                    isDark ? 'bg-slate-900/70 border-slate-700/60 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3">Group Name</th>
                      <th className="py-2.5 px-3">Group Link</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-200'}`}>
                    {groupLinks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500 italic">
                          No WhatsApp group links added. Add group link above.
                        </td>
                      </tr>
                    ) : (
                      groupLinks.map((g) => (
                        <tr key={g.id} className={`transition ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                          <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{g.name}</td>
                          <td className={`py-2.5 px-3 font-mono max-w-xs truncate ${isDark ? 'text-cyan-400' : 'text-cyan-700 font-semibold'}`}>
                            <a
                              href={g.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline flex items-center gap-1"
                            >
                              <span>{g.url}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleGroup(g.id)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                                g.active !== false
                                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                  : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {g.active !== false ? '● Active' : 'Disabled'}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditGroup(g)}
                                className="p-1 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-purple-500/10 transition cursor-pointer"
                                title="Edit Group Link"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGroup(g.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Delete Group Link"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal for Editing Contact */}
            {editingContact && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className={`w-full max-w-md p-5 rounded-2xl border shadow-2xl space-y-4 ${t.modalBg}`}>
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className={`text-sm font-bold ${t.textHeading}`}>Edit WhatsApp Contact</h3>
                    <button
                      type="button"
                      onClick={() => setEditingContact(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={editContactName}
                        onChange={(e) => setEditContactName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs border ${t.inputBg}`}
                        placeholder="e.g. Workshop Manager"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">WhatsApp Number</label>
                      <input
                        type="text"
                        value={editContactPhone}
                        onChange={(e) => setEditContactPhone(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono border ${t.inputBg}`}
                        placeholder="e.g. +94 77 123 4567"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setEditingContact(null)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditContact}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold ${t.primaryBtn} cursor-pointer`}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal for Editing Group Link */}
            {editingGroup && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className={`w-full max-w-md p-5 rounded-2xl border shadow-2xl space-y-4 ${t.modalBg}`}>
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className={`text-sm font-bold ${t.textHeading}`}>Edit WhatsApp Group Link</h3>
                    <button
                      type="button"
                      onClick={() => setEditingGroup(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Group Name</label>
                      <input
                        type="text"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs border ${t.inputBg}`}
                        placeholder="e.g. Cycly Fleet Desk Group"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Group URL</label>
                      <input
                        type="url"
                        value={editGroupUrl}
                        onChange={(e) => setEditGroupUrl(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono border ${t.inputBg}`}
                        placeholder="https://chat.whatsapp.com/..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setEditingGroup(null)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditGroup}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold ${t.primaryBtn} cursor-pointer`}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: DELIVERY LOGS & TROUBLESHOOTING (Requirement 10) ================= */}
        {activeSubTab === 'delivery_logs' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* DIAGNOSTICS & SYSTEM STATUS CARD */}
            <div className={`p-4 sm:p-5 rounded-2xl border ${t.cardSubtleBg} space-y-4`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
                isDark ? 'border-slate-700/60' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-500 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm sm:text-base ${t.textHeading}`}>
                      WhatsApp Delivery Diagnostics & Pipeline
                    </h3>
                    <p className={`text-xs ${t.textMuted}`}>
                      Verify delivery to Customer, Additional Contacts (Owner/Manager), and WhatsApp Group links.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryLogs(getStoredDeliveryLogs())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${t.inactiveTab}`}
                    title="Reload latest delivery records"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Refresh Logs</span>
                  </button>

                  {deliveryLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear all notification delivery logs?')) {
                          saveStoredDeliveryLogs([]);
                          setDeliveryLogs([]);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 transition cursor-pointer"
                      title="Clear log history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Logs</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Indicator Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-900/50 border-slate-700/60' : 'bg-slate-50 border-slate-200 shadow-sm'
                }`}>
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Gateway Dispatch Mode
                  </div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{settings?.whatsappApiUrl ? 'Cloud Gateway Connected' : 'Direct Link / Simulated Mode'}</span>
                  </div>
                  <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {settings?.whatsappApiUrl || 'Uses wa.me direct WhatsApp triggers'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-900/50 border-slate-700/60' : 'bg-slate-50 border-slate-200 shadow-sm'
                }`}>
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Additional Contacts
                  </div>
                  <div className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{additionalContacts.filter(c => c.active !== false).length} Active Contact(s)</span>
                  </div>
                  <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Notified on Start: {notifyAdditionalOnStart ? 'Yes' : 'No'} | End: {notifyAdditionalOnEnd ? 'Yes' : 'No'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-900/50 border-slate-700/60' : 'bg-slate-50 border-slate-200 shadow-sm'
                }`}>
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Group Links
                  </div>
                  <div className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{groupLinks.filter(g => g.active !== false).length} Active Group(s)</span>
                  </div>
                  <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Group links tracked and included in delivery hub
                  </div>
                </div>
              </div>

              {/* Instant Test Dispatch Box */}
              <div className={`pt-2 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Enter mobile number to test delivery pipeline (e.g. 0773606494)..."
                      value={testSendPhone}
                      onChange={(e) => setTestSendPhone(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-xs font-mono font-medium ${t.textInput}`}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isSendingTest}
                    onClick={async () => {
                      setIsSendingTest(true);
                      setTestSendStatus(null);
                      try {
                        const cleanPhone = cleanWhatsAppPhoneNumber(testSendPhone);
                        if (!cleanPhone) {
                          setTestSendStatus('Error: Please enter a valid test mobile number.');
                          return;
                        }

                        const sampleRental: any = {
                          id: 'test-rental',
                          rentalNumber: 'REN-TEST01',
                          vehicleSerialNumber: '01-0001',
                          vehicleTypeName: 'Standard Bicycle',
                          customerName: 'Test Customer',
                          customerPhone: cleanPhone,
                          customerNicPassport: '199000000000',
                          startTime: Date.now() - 3600000,
                          totalAmount: 150,
                        };

                        const res = await dispatchRentalNotification({
                          type: 'start',
                          rental: sampleRental,
                          settings: settings || ({} as any),
                          overrideCustomerPhone: cleanPhone,
                          overrideCustomerName: 'Test Recipient',
                        });

                        setDeliveryLogs(getStoredDeliveryLogs());
                        setTestSendStatus(`✓ Dispatched test notification to ${res.recipients.length} destination(s). Check log below!`);
                      } catch (err: any) {
                        setTestSendStatus(`Failed test dispatch: ${err.message || err}`);
                      } finally {
                        setIsSendingTest(false);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${t.primaryBtn} disabled:opacity-50 cursor-pointer shrink-0`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingTest ? 'Testing...' : 'Send Test Notification'}</span>
                  </button>
                </div>

                {testSendStatus && (
                  <p className={`text-xs mt-2 font-semibold ${testSendStatus.startsWith('Error') ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {testSendStatus}
                  </p>
                )}
              </div>
            </div>

            {/* SEARCH / FILTER LOGS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Filter by Rental # (e.g. REN-0000158), recipient name, or phone..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-medium ${t.searchInput}`}
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-500">
                  <Search className="w-4 h-4" />
                </div>
              </div>

              {logSearchQuery && (
                <button
                  type="button"
                  onClick={() => setLogSearchQuery('')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${t.inactiveTab}`}
                >
                  Clear Filter
                </button>
              )}
            </div>

            {/* DELIVERY LOGS CARDS */}
            <div className="space-y-4">
              {(() => {
                const q = logSearchQuery.trim().toLowerCase();
                const filtered = deliveryLogs.filter((log) => {
                  if (!q) return true;
                  const matchRental = log.rentalNumber.toLowerCase().includes(q);
                  const matchRecipients = log.recipients.some(
                    (r) => r.name.toLowerCase().includes(q) || r.phoneOrUrl.toLowerCase().includes(q)
                  );
                  return matchRental || matchRecipients;
                });

                if (filtered.length === 0) {
                  return (
                    <div className={`p-8 rounded-2xl border text-center ${t.cardSubtleBg} space-y-2`}>
                      <ShieldCheck className="w-8 h-8 mx-auto text-slate-400" />
                      <p className={`text-sm font-bold ${t.textHeading}`}>
                        {logSearchQuery ? `No delivery logs matching "${logSearchQuery}"` : 'No Delivery Records Yet'}
                      </p>
                      <p className={`text-xs ${t.textMuted} max-w-md mx-auto`}>
                        Whenever a rental starts or return is completed (such as #REN-0000158), full recipient delivery logs, gateway status, and direct WhatsApp links are captured here for troubleshooting.
                      </p>
                    </div>
                  );
                }

                return filtered.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleString('en-GB', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Asia/Colombo',
                  });

                  return (
                    <div
                      key={log.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition ${t.cardBg} space-y-3 shadow-sm`}
                    >
                      {/* Log Header */}
                      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b ${
                        isDark ? 'border-slate-700/40' : 'border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            #{log.rentalNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.type === 'start'
                              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {log.type === 'start' ? 'Start Rental' : 'Return & Settle'}
                          </span>
                          <span className={`text-xs ${t.textMuted}`}>
                            {dateStr} (SLST)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.overallStatus === 'success'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : log.overallStatus === 'partial'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          }`}>
                            {log.overallStatus === 'success' ? 'All Recipients Ready/Sent' : log.overallStatus === 'partial' ? 'Partial Delivery' : 'Action Required'}
                          </span>
                        </div>
                      </div>

                      {/* Recipient breakdown list */}
                      <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-slate-700/50' : 'border-slate-200 shadow-sm'}`}>
                        <table className="w-full text-left text-xs">
                          <thead className={`border-b font-bold uppercase text-[10px] ${
                            isDark ? 'bg-slate-900/60 border-slate-700/50 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                          }`}>
                            <tr>
                              <th className="py-2 px-3">Recipient / Role</th>
                              <th className="py-2 px-3">Destination</th>
                              <th className="py-2 px-3">Delivery Status & Notes</th>
                              <th className="py-2 px-3 text-right">Quick Action</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-200'}`}>
                            {log.recipients.map((rec, idx) => {
                              const roleBadge = rec.role === 'customer'
                                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30'
                                : rec.role === 'group'
                                ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30'
                                : 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/30';

                              const roleLabel = rec.role === 'customer'
                                ? 'Customer'
                                : rec.role === 'group'
                                ? 'WhatsApp Group'
                                : 'Store Manager / Desk';

                              return (
                                <tr key={idx} className={`transition ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{rec.name}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${roleBadge}`}>
                                        {roleLabel}
                                      </span>
                                    </div>
                                  </td>
                                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {rec.phoneOrUrl}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${
                                          rec.status === 'delivered'
                                            ? 'bg-emerald-500'
                                            : rec.status === 'failed'
                                            ? 'bg-rose-500'
                                            : 'bg-cyan-500'
                                        }`} />
                                        <span className={`font-semibold capitalize ${
                                          rec.status === 'delivered'
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : rec.status === 'failed'
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-cyan-600 dark:text-cyan-400'
                                        }`}>
                                          {rec.status === 'delivered' ? 'Gateway Delivered' : rec.status === 'failed' ? 'Failed' : 'Direct Link Ready'}
                                        </span>
                                      </div>
                                      {rec.error && (
                                        <span className={`text-[10px] italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                          {rec.error}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {rec.role === 'group' ? (
                                      <a
                                        href={rec.phoneOrUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold text-[11px] transition"
                                      >
                                        <span>Open Group</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      <a
                                        href={`https://wa.me/${cleanWhatsAppPhoneNumber(rec.phoneOrUrl)}?text=${encodeURIComponent(log.messageText)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] transition"
                                      >
                                        <Send className="w-3 h-3" />
                                        <span>Open WhatsApp</span>
                                      </a>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Expandable Message Content preview */}
                      <details className="text-xs group">
                        <summary className={`font-semibold cursor-pointer list-none flex items-center gap-1.5 ${
                          isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                        }`}>
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Compiled Message Text ({log.messageText.length} chars)</span>
                        </summary>
                        <div className={`mt-2 p-3 rounded-xl font-mono text-[11px] whitespace-pre-wrap max-h-40 overflow-y-auto border ${
                          isDark ? 'bg-slate-900/60 border-slate-700/50 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}>
                          {log.messageText}
                        </div>
                      </details>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`${t.modalBg} rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-700/60 flex flex-col max-h-[92vh]`}>
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b ${t.divider} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${t.textHeading}`}>
                    {editingTemplateId ? 'Edit Message Template' : 'Create New Message Template'}
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    Changes will immediately be used for all future rental messages.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveTemplate} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {templateError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{templateError}</span>
                </div>
              )}

              {/* Template Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Template Title: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Return Completed & Thank You"
                    value={tmplTitle}
                    onChange={(e) => setTmplTitle(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Category: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={tmplCategory}
                    onChange={(e) => setTmplCategory(e.target.value as MessageTemplateCategory)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
                  >
                    <option value="welcome">Welcome / Rental Start</option>
                    <option value="return_reminder">Return & Thank You</option>
                    <option value="birthday">Birthday Wishes</option>
                    <option value="rental_reminder">Rental Active Reminder</option>
                    <option value="payment_reminder">Payment Reminder</option>
                    <option value="promotion">Special Promotion</option>
                    <option value="fitness_promo">Fitness & Health Ride</option>
                    <option value="tourist_promo">Tourist & Explorer Package</option>
                    <option value="thank_you">Customer Appreciation</option>
                    <option value="special_offer">VIP Special Offer</option>
                    <option value="holiday_greeting">Holiday Greeting</option>
                    <option value="general">General Notification</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Placeholder Insertion Chips */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                  Insert Dynamic Placeholder Tag (Click tag to insert):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: '{customer_name}', label: 'Customer Name' },
                    { tag: '{vehicle_name}', label: 'Vehicle Type' },
                    { tag: '{rental_number}', label: 'Rental #' },
                    { tag: '{start_time}', label: 'Start Time' },
                    { tag: '{end_time}', label: 'End Time' },
                    { tag: '{amount}', label: 'Amount' },
                    { tag: '{shop_name}', label: 'Shop Name' },
                    { tag: '{phone}', label: 'Phone' },
                    { tag: '{start_km}', label: 'Start KM' },
                    { tag: '{end_km}', label: 'End KM' },
                    { tag: '{nic}', label: 'NIC' },
                    { tag: '{date}', label: 'Date' },
                  ].map((p) => (
                    <button
                      key={p.tag}
                      type="button"
                      onClick={() => handleInsertTag(p.tag)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer"
                      title={p.label}
                    >
                      + {p.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Content */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                  Message Content: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Enter message template text..."
                  value={tmplContent}
                  onChange={(e) => setTmplContent(e.target.value)}
                  className={`w-full p-3 rounded-xl text-xs font-mono leading-relaxed border ${t.inputBg}`}
                />
              </div>

              {/* Live Preview Box */}
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-emerald-400">
                  Live Resolved Preview:
                </span>
                <div className={`p-3 rounded-xl border text-xs font-mono whitespace-pre-wrap leading-relaxed ${
                  themeMode === 'light' ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-900/80 border-slate-700 text-slate-200'
                }`}>
                  {tmplContent ? (
                    resolveTemplatePlaceholders(tmplContent, {
                      customer: { fullName: 'Kamal Perera', whatsappNumber: '+94 77 123 4567', nicPassport: '199512345678' },
                      shopName: settings?.businessName || 'Cycly Rent',
                      currencySymbol: settings?.currencySymbol || 'LKR',
                      extra: {
                        vehicle_serial: 'MB-101',
                        vehicle_name: 'Motorbike - 125cc',
                        rental_number: 'REN-0000001',
                        start_time: '10:00 AM',
                        end_time: '12:00 PM',
                        amount: '1,500 LK',
                        balance: '0 LK',
                        start_km: '12,450 km',
                        end_km: '12,510 km',
                      },
                    })
                  ) : (
                    <span className="text-slate-500 italic">Type message content above to see live preview...</span>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-700/30">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${t.inactiveTab}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingTemplateId ? 'Update & Activate Template' : 'Save & Activate Template'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
