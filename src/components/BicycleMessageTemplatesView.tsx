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
  Timer, 
  Shield, 
  Check 
} from 'lucide-react';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { AppSettings, MessageTemplate, MessageTemplateCategory } from '../types';
import { UserAccount } from '../utils/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  syncMessageTemplateToSupabase,
  syncAllMessageTemplatesToSupabase,
  deleteMessageTemplateFromSupabase,
  fetchMessageTemplatesFromSupabase,
  syncSettingsToSupabase,
} from '../lib/supabaseSync';
import {
  DEFAULT_MESSAGE_TEMPLATES,
  getStoredMessageTemplates,
  saveStoredMessageTemplates,
  resolveTemplatePlaceholders,
} from '../utils/customer';

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

  const [templates, setTemplates] = useState<MessageTemplate[]>(() => getStoredMessageTemplates());
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('all');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplCategory, setTmplCategory] = useState<MessageTemplateCategory>('general');
  const [tmplContent, setTmplContent] = useState('');
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Auto-logout states
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState<number>(() => {
    return settings?.autoLogoutMinutes ?? 15;
  });
  const [autoLogoutSaved, setAutoLogoutSaved] = useState(false);

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

    if (isSupabaseConfigured()) {
      const syncRes = await syncMessageTemplateToSupabase(targetTemplate);
      if (!syncRes.success) {
        setTemplateError(`Failed to save template to Supabase: ${syncRes.error || 'Database error'}`);
        return;
      }
    }

    setTemplates(updatedList);
    saveStoredMessageTemplates(updatedList);
    setIsTemplateModalOpen(false);
    setTemplateSuccess(editingTemplateId ? 'Template updated successfully!' : 'New template created!');
    setTimeout(() => setTemplateSuccess(null), 3000);
  };

  const handleDeleteTemplate = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete template "${title}"?`)) {
      if (isSupabaseConfigured()) {
        const syncRes = await deleteMessageTemplateFromSupabase(id);
        if (!syncRes.success) {
          alert(`Failed to delete template from Supabase: ${syncRes.error || 'Database error'}`);
          return;
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
    if (confirm('Reset to standard system default message templates? Custom changes may be replaced.')) {
      if (isSupabaseConfigured()) {
        const syncRes = await syncAllMessageTemplatesToSupabase(DEFAULT_MESSAGE_TEMPLATES);
        if (!syncRes.success) {
          alert(`Failed to reset templates in Supabase: ${syncRes.error || 'Database error'}`);
          return;
        }
      }
      setTemplates(DEFAULT_MESSAGE_TEMPLATES);
      saveStoredMessageTemplates(DEFAULT_MESSAGE_TEMPLATES);
      setTemplateSuccess('Templates reset to default successfully!');
      setTimeout(() => setTemplateSuccess(null), 3000);
    }
  };

  const handleSaveAutoLogout = () => {
    if (onUpdateSettings) {
      onUpdateSettings({ autoLogoutMinutes });
    }
    if (isSupabaseConfigured() && settings) {
      syncSettingsToSupabase({ ...settings, autoLogoutMinutes });
    }
    setAutoLogoutSaved(true);
    setTimeout(() => setAutoLogoutSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* SECTION HEADER */}
      <div className={`${t.cardBg} rounded-2xl p-4 sm:p-6 border shadow-xl space-y-5`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${t.divider}`}>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                  Automated Message Templates (WhatsApp & SMS)
                </h2>
                <p className={`text-xs ${t.textMuted} mt-0.5`}>
                  Create, customize and manage WhatsApp & notification message templates for birthdays, rental starts, returns, and promos.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaultTemplates}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${t.inactiveTab}`}
              title="Restore standard system templates"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              id="btn-add-message-template"
              type="button"
              onClick={handleOpenAddTemplate}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${t.primaryBtn}`}
            >
              <Plus className="w-4 h-4" />
              <span>+ New Template</span>
            </button>
          </div>
        </div>

        {templateSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{templateSuccess}</span>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2">
          {[
            { id: 'all', label: 'All Templates' },
            { id: 'birthday', label: '🎂 Birthday Wishes' },
            { id: 'rental', label: '🚴 Rental Desk' },
            { id: 'reminder', label: '🔔 Reminders' },
            { id: 'marketing', label: '🌟 Marketing & Promos' },
            { id: 'general', label: '💬 General' },
          ].map((tab) => {
            const isActive = templateCategoryFilter === tab.id;
            const count = tab.id === 'all'
              ? templates.length
              : templates.filter((tmpl) => matchTemplateCategory(tmpl.category, tab.id)).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTemplateCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  isActive ? t.activeTab : t.inactiveTab
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-700/50 text-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full p-8 rounded-2xl border border-dashed border-slate-700 text-center space-y-2">
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

              return (
                <div
                  key={tmpl.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${t.cardSubtleBg} hover:border-emerald-500/30`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeInfo.badge}`}>
                            {badgeInfo.label}
                          </span>
                          <h4 className={`text-sm font-bold ${t.textHeading}`}>
                            {tmpl.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTemplate(tmpl)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tmpl.id, tmpl.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* WhatsApp Message Preview Bubble */}
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-200 text-xs font-mono leading-relaxed whitespace-pre-wrap select-all">
                      {tmpl.content}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-700/30 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-[10px]">ID: {tmpl.id}</span>
                    <span>Last updated: {new Date(tmpl.updatedAt || tmpl.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SYSTEM AUTO-LOGOUT TIME MANAGEMENT */}
      <div className={`${t.cardBg} rounded-2xl p-4 sm:p-6 border shadow-xl space-y-4`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${t.divider}`}>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                  System Inactivity & Auto-Logout Security
                </h2>
                <p className={`text-xs ${t.textMuted} mt-0.5`}>
                  Manage when user sessions automatically lock upon inactivity. Automatically syncs across system roles and Supabase.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveAutoLogout}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${
              autoLogoutSaved ? 'bg-emerald-600 text-white' : t.primaryBtn
            }`}
          >
            {autoLogoutSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved & Active!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Auto-Logout Setting</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { value: 5, label: '5 Minutes', desc: 'High Security' },
            { value: 10, label: '10 Minutes', desc: 'Active Cashier' },
            { value: 15, label: '15 Minutes', desc: 'Recommended' },
            { value: 30, label: '30 Minutes', desc: 'Relaxed' },
            { value: 60, label: '60 Minutes', desc: '1 Hour' },
            { value: 0, label: 'Disabled', desc: 'Never Auto-Logout' },
          ].map((opt) => {
            const isSelected = autoLogoutMinutes === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAutoLogoutMinutes(opt.value)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 ring-2 ring-amber-500/20'
                    : `${t.cardSubtleBg} border-slate-700/40 text-slate-400 hover:border-slate-600`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">{opt.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <span className="text-[10px] opacity-70 block">{opt.desc}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs text-slate-300 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Security Tip: </span>
            Setting auto-logout to 15 minutes prevents unauthorized rental cancellations or cash modifications when staff members step away from the counter desk.
          </div>
        </div>
      </div>

      {/* MODAL: CREATE / EDIT MESSAGE TEMPLATE */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className={`${t.cardBg} rounded-2xl max-w-xl w-full border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
            {/* Modal Header */}
            <div className={`p-5 border-b ${t.divider} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${t.textHeading}`}>
                    {editingTemplateId ? 'Edit Message Template' : 'Create New Message Template'}
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    Customize placeholders and message body
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className={`p-1.5 rounded-xl text-slate-400 hover:text-white cursor-pointer ${t.inactiveTab}`}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 overflow-y-auto">
              {templateError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{templateError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                    Template Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Birthday Special 10% Off"
                    value={tmplTitle}
                    onChange={(e) => setTmplTitle(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-medium ${t.textInput}`}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                    Category
                  </label>
                  <select
                    value={tmplCategory}
                    onChange={(e) => setTmplCategory(e.target.value as MessageTemplateCategory)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${t.dropdownInput}`}
                  >
                    <option value="birthday">🎂 Birthday Wishes</option>
                    <option value="rental">🚴 Rental Desk</option>
                    <option value="reminder">🔔 Reminder / Notification</option>
                    <option value="marketing">🌟 Marketing & Promo</option>
                    <option value="general">💬 General</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Placeholder Tag Chips */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                  Insert Dynamic Placeholder Tag (Click to insert):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: '{customer_name}', label: 'Customer Name' },
                    { tag: '{name}', label: 'Short Name' },
                    { tag: '{vehicle_serial}', label: 'Vehicle Serial' },
                    { tag: '{vehicle_name}', label: 'Vehicle Type' },
                    { tag: '{rental_number}', label: 'Rental #' },
                    { tag: '{start_time}', label: 'Start Time' },
                    { tag: '{end_time}', label: 'End Time' },
                    { tag: '{duration}', label: 'Duration' },
                    { tag: '{amount}', label: 'Amount' },
                    { tag: '{balance}', label: 'Balance' },
                    { tag: '{shop_name}', label: 'Shop Name' },
                    { tag: '{phone}', label: 'Phone' },
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
                  Message Content (WhatsApp Formatted)
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Enter message text... You can use *bold*, _italics_, and placeholders like {customer_name} or {rental_number}."
                  value={tmplContent}
                  onChange={(e) => setTmplContent(e.target.value)}
                  className={`w-full rounded-xl p-3 text-xs font-mono ${t.textInput}`}
                />
              </div>

              {/* Live Preview */}
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
                      shopName: settings?.businessName || 'Mannar Green Ride',
                      currencySymbol: settings?.currencySymbol || 'LKR',
                      extra: {
                        vehicle_serial: 'CY-101',
                        vehicle_name: 'Standard City Bicycle',
                        rental_number: 'REN-0000001',
                        start_time: '10:00 AM',
                        end_time: '12:00 PM',
                        duration: '2 hrs',
                        amount: '1,200',
                        balance: '0',
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
                  <span>{editingTemplateId ? 'Update Template' : 'Save Template'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
