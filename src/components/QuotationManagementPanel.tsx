import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  X,
  Calendar,
  DollarSign,
  Tag,
  User,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Printer,
  Download,
  CheckCircle2,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ArrowRight,
  Edit3,
  Eye,
  RefreshCw,
  ShoppingBag,
  Bike,
  Sparkles,
  Clock,
  Copy,
  FileCheck,
  Check,
  AlertCircle,
  Percent,
  Send,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { AppSettings, Customer, DiscountType, QuotationCurrency, QuotationRecord, QuotationType, RentalCalculationType, Vehicle, VehicleType } from '../types';
import { UserAccount } from '../utils/auth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  DEFAULT_TERMS_AND_CONDITIONS_RENT,
  DEFAULT_TERMS_AND_CONDITIONS_SALE,
  calculateRentQuotation,
  calculateSaleQuotation,
  formatQuotationCurrency,
  formatQuotationNumber,
  getNextQuotationNumber,
  getStoredQuotations,
  saveStoredQuotations,
} from '../utils/quotationUtils';

interface QuotationManagementPanelProps {
  settings: AppSettings;
  currentUser: UserAccount;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  customers?: Customer[];
  vehicleTypes?: VehicleType[];
  vehicles?: Vehicle[];
  onNavigateTab?: (tab: any) => void;
}

export const QuotationManagementPanel: React.FC<QuotationManagementPanelProps> = ({
  settings,
  currentUser,
  themeMode = 'dark',
  accent = 'emerald',
  customers = [],
  vehicleTypes = [],
  vehicles = [],
  onNavigateTab,
}) => {
  const t = getThemeClasses(themeMode, accent);
  const isAdmin = currentUser.role === 'admin' || currentUser.email === 'absiraiva@gmail.com';

  // Get current SL date
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
  }, []);

  const defaultValidUntil = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
  }, []);

  // ==========================================
  // STATE: QUOTATIONS LIST
  // ==========================================
  const [quotations, setQuotations] = useState<QuotationRecord[]>(() => {
    return getStoredQuotations();
  });

  // Keep localStorage synced whenever quotations list updates
  const handleUpdateQuotationsList = (newQuotations: QuotationRecord[]) => {
    setQuotations(newQuotations);
    saveStoredQuotations(newQuotations);
  };

  // ==========================================
  // STATE: FORM MODAL / DRAWER
  // ==========================================
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  // Form Fields
  const [quotationType, setQuotationType] = useState<QuotationType>('sale');
  const [quotationNumber, setQuotationNumber] = useState<string>('');
  const [quotationDate, setQuotationDate] = useState<string>(todayStr);
  const [validUntilDate, setValidUntilDate] = useState<string>(defaultValidUntil);

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerNicPassport, setCustomerNicPassport] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Product / Item Selection
  const [productName, setProductName] = useState<string>('');
  const [productDescription, setProductDescription] = useState<string>('');
  const [currency, setCurrency] = useState<QuotationCurrency>('LKR');

  // Sale-Specific Fields
  const [quantity, setQuantity] = useState<number>(1);
  const [saleUnitPrice, setSaleUnitPrice] = useState<number>(0);
  const [saleDiscountType, setSaleDiscountType] = useState<DiscountType>('fixed');
  const [saleDiscountValue, setSaleDiscountValue] = useState<number>(0);

  // Rent-Specific Fields
  const [rentalCalcType, setRentalCalcType] = useState<RentalCalculationType>('day');
  const [rentUnits, setRentUnits] = useState<number>(1);
  const [rentDuration, setRentDuration] = useState<number>(1); // Number of days or hours
  const [rentUnitPrice, setRentUnitPrice] = useState<number>(0);
  const [rentDiscountType, setRentDiscountType] = useState<DiscountType>('fixed');
  const [rentDiscountValue, setRentDiscountValue] = useState<number>(0);

  // Terms and Conditions State
  const [termsAndConditions, setTermsAndConditions] = useState<string>(DEFAULT_TERMS_AND_CONDITIONS_SALE);

  // Feedback & Copy State
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // ==========================================
  // STATE: PREVIEW & PRINT MODAL
  // ==========================================
  const [previewQuotation, setPreviewQuotation] = useState<QuotationRecord | null>(null);

  // ==========================================
  // STATE: SEND EMAIL MODAL
  // ==========================================
  const [emailModalQuotation, setEmailModalQuotation] = useState<QuotationRecord | null>(null);
  const [emailTo, setEmailTo] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ==========================================
  // STATE: SEARCH, FILTER & SORT FOR TABLE
  // ==========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'LKR' | 'USD'>('all');
  const [sortField, setSortField] = useState<'date' | 'quotationNumber' | 'finalTotal' | 'customerName'>('quotationNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  // ==========================================
  // LIVE COMPUTATION: SALE VS RENT CALCULATIONS
  // ==========================================
  const computedSale = useMemo(() => {
    return calculateSaleQuotation(saleUnitPrice, quantity, saleDiscountValue, saleDiscountType);
  }, [saleUnitPrice, quantity, saleDiscountValue, saleDiscountType]);

  const computedRent = useMemo(() => {
    return calculateRentQuotation(rentUnitPrice, rentUnits, rentDuration, rentDiscountValue, rentDiscountType);
  }, [rentUnitPrice, rentUnits, rentDuration, rentDiscountValue, rentDiscountType]);

  const currentSubtotal = quotationType === 'sale' ? computedSale.subtotal : computedRent.subtotal;
  const currentDiscount = quotationType === 'sale' ? computedSale.discount : computedRent.discount;
  const currentFinalTotal = quotationType === 'sale' ? computedSale.finalTotal : computedRent.finalTotal;

  // Sync default terms when switching type in a brand new form
  const handleQuotationTypeChange = (newType: QuotationType) => {
    setQuotationType(newType);
    if (!editingQuotationId) {
      if (newType === 'sale') {
        setTermsAndConditions(DEFAULT_TERMS_AND_CONDITIONS_SALE);
      } else {
        setTermsAndConditions(DEFAULT_TERMS_AND_CONDITIONS_RENT);
      }
    }
  };

  // Open New Quotation Modal
  const handleOpenCreateModal = (presetType: QuotationType = 'sale') => {
    setEditingQuotationId(null);
    setQuotationType(presetType);
    const nextNum = getNextQuotationNumber(quotations);
    setQuotationNumber(nextNum);
    setQuotationDate(todayStr);
    setValidUntilDate(defaultValidUntil);

    // Reset customer
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerNicPassport('');
    setCustomerSearchQuery('');

    // Reset items
    setProductName('');
    setProductDescription('');
    setCurrency('LKR');

    // Sale
    setQuantity(1);
    setSaleUnitPrice(0);
    setSaleDiscountType('fixed');
    setSaleDiscountValue(0);

    // Rent
    setRentalCalcType('day');
    setRentUnits(1);
    setRentDuration(1);
    setRentUnitPrice(0);
    setRentDiscountType('fixed');
    setRentDiscountValue(0);

    // Terms
    setTermsAndConditions(
      presetType === 'sale' ? DEFAULT_TERMS_AND_CONDITIONS_SALE : DEFAULT_TERMS_AND_CONDITIONS_RENT
    );

    setSaveSuccessMessage(null);
    setShowFormModal(true);
  };

  // Open Edit Modal for Existing Quotation
  const handleOpenEditModal = (record: QuotationRecord) => {
    setEditingQuotationId(record.id);
    setQuotationType(record.quotationType);
    setQuotationNumber(record.quotationNumber);
    setQuotationDate(record.date || todayStr);
    setValidUntilDate(record.validUntil || defaultValidUntil);

    // Customer
    setSelectedCustomerId(record.customerId || '');
    setCustomerName(record.customerName || '');
    setCustomerPhone(record.customerPhone || '');
    setCustomerEmail(record.customerEmail || '');
    setCustomerAddress(record.customerAddress || '');
    setCustomerNicPassport(record.customerNicPassport || '');
    setCustomerSearchQuery(record.customerName || '');

    // Product
    setProductName(record.productName || '');
    setProductDescription(record.items?.[0]?.productDescription || '');
    setCurrency(record.currency || 'LKR');

    if (record.quotationType === 'sale') {
      setQuantity(record.quantity || 1);
      setSaleUnitPrice(record.unitPrice || 0);
      setSaleDiscountType(record.discountType || 'fixed');
      setSaleDiscountValue(record.discountValue !== undefined ? record.discountValue : (record.discount || 0));
    } else {
      setRentalCalcType(record.rentalCalcType || 'day');
      setRentUnits(record.units || record.quantity || 1);
      setRentDuration(record.duration || 1);
      setRentUnitPrice(record.unitPrice || 0);
      setRentDiscountType(record.discountType || 'fixed');
      setRentDiscountValue(record.discountValue !== undefined ? record.discountValue : (record.discount || 0));
    }

    setTermsAndConditions(record.termsAndConditions || (
      record.quotationType === 'sale' ? DEFAULT_TERMS_AND_CONDITIONS_SALE : DEFAULT_TERMS_AND_CONDITIONS_RENT
    ));

    setSaveSuccessMessage(null);
    setShowFormModal(true);
  };

  // Handle Customer Selection
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.fullName || c.name);
    setCustomerPhone(c.whatsappNumber || c.phone || '');
    setCustomerEmail((c as any).email || '');
    setCustomerAddress(c.address || '');
    setCustomerNicPassport(c.nicPassport || '');
    setCustomerSearchQuery(c.fullName || c.name);
    setShowCustomerDropdown(false);
  };

  // Quick Preset Selector from Vehicle Types or Inventory
  const handleSelectInventoryOrType = (name: string, suggestedPrice?: number) => {
    setProductName(name);
    if (suggestedPrice && suggestedPrice > 0) {
      if (quotationType === 'sale') {
        setSaleUnitPrice(suggestedPrice);
      } else {
        setRentUnitPrice(suggestedPrice);
      }
    }
  };

  // Save / Update Quotation Action
  const handleSaveQuotation = () => {
    if (!productName.trim()) {
      alert('Please enter or select a product/item name for this quotation.');
      return;
    }

    const finalUnit = quotationType === 'sale' ? saleUnitPrice : rentUnitPrice;
    const finalQty = quotationType === 'sale' ? quantity : rentUnits;
    const finalDur = quotationType === 'rent' ? rentDuration : undefined;
    const finalCalcType = quotationType === 'rent' ? rentalCalcType : undefined;
    const finalDiscType = quotationType === 'sale' ? saleDiscountType : rentDiscountType;
    const finalDiscVal = quotationType === 'sale' ? saleDiscountValue : rentDiscountValue;
    const finalDiscAmount = quotationType === 'sale' ? computedSale.discount : computedRent.discount;

    const lineItem = {
      id: `item-${Date.now()}-1`,
      quotationType,
      productName: productName.trim(),
      productDescription: productDescription.trim() || undefined,
      quantity: finalQty,
      rentalCalcType: finalCalcType,
      units: quotationType === 'rent' ? rentUnits : undefined,
      duration: finalDur,
      unitPrice: finalUnit,
      currency,
      subtotal: currentSubtotal,
      discountType: finalDiscType,
      discountValue: finalDiscVal,
      discount: finalDiscAmount,
      finalTotal: currentFinalTotal,
    };

    const existingRecord = editingQuotationId ? quotations.find((q) => q.id === editingQuotationId) : null;

    const newOrUpdatedRecord: QuotationRecord = {
      id: editingQuotationId || `quo-${Date.now()}`,
      quotationNumber: quotationNumber || getNextQuotationNumber(quotations),
      date: quotationDate,
      validUntil: validUntilDate,
      quotationType,
      customerId: selectedCustomerId || undefined,
      customerName: customerName.trim() || 'Valued Client',
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerNicPassport: customerNicPassport.trim() || undefined,
      items: [lineItem],
      productName: productName.trim(),
      quantity: finalQty,
      rentalCalcType: finalCalcType,
      units: quotationType === 'rent' ? rentUnits : undefined,
      duration: finalDur,
      unitPrice: finalUnit,
      currency,
      subtotal: currentSubtotal,
      discountType: finalDiscType,
      discountValue: finalDiscVal,
      discount: finalDiscAmount,
      finalTotal: currentFinalTotal,
      termsAndConditions: termsAndConditions.trim(),
      cashierName: currentUser.name || settings.cashierName || 'Sales Desk',
      status: existingRecord?.status || 'saved',
      lastSentEmailAt: existingRecord?.lastSentEmailAt,
      sentEmailCount: existingRecord?.sentEmailCount,
      createdAt: existingRecord?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    let updatedList: QuotationRecord[];
    if (editingQuotationId) {
      updatedList = quotations.map((q) => (q.id === editingQuotationId ? newOrUpdatedRecord : q));
    } else {
      updatedList = [newOrUpdatedRecord, ...quotations];
    }

    handleUpdateQuotationsList(updatedList);
    setSaveSuccessMessage(`Quotation #${newOrUpdatedRecord.quotationNumber} saved successfully!`);

    setTimeout(() => {
      setShowFormModal(false);
      setSaveSuccessMessage(null);
      // Auto open preview to wow user
      setPreviewQuotation(newOrUpdatedRecord);
    }, 450);
  };

  // Delete Quotation Action
  const handleDeleteQuotation = (id: string, num: string) => {
    if (!isAdmin) {
      alert('Only administrators can delete quotations.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete Quotation #${num}? This action cannot be undone.`)) {
      const filtered = quotations.filter((q) => q.id !== id);
      handleUpdateQuotationsList(filtered);
    }
  };

  // Filtered & Sorted Quotations List
  const filteredQuotations = useMemo(() => {
    let list = [...quotations];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.quotationNumber.toLowerCase().includes(q) ||
          item.customerName.toLowerCase().includes(q) ||
          item.productName.toLowerCase().includes(q) ||
          (item.customerPhone && item.customerPhone.toLowerCase().includes(q)) ||
          (item.customerNicPassport && item.customerNicPassport.toLowerCase().includes(q)) ||
          item.date.includes(q)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      list = list.filter((item) => item.quotationType === typeFilter);
    }

    // Currency filter
    if (currencyFilter !== 'all') {
      list = list.filter((item) => item.currency === currencyFilter);
    }

    // Sort (Default descending)
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'quotationNumber') {
        comparison = a.quotationNumber.localeCompare(b.quotationNumber);
      } else if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'finalTotal') {
        comparison = a.finalTotal - b.finalTotal;
      } else if (sortField === 'customerName') {
        comparison = a.customerName.localeCompare(b.customerName);
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [quotations, searchQuery, typeFilter, currencyFilter, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filteredQuotations.length / PAGE_SIZE) || 1;
  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredQuotations.slice(start, start + PAGE_SIZE);
  }, [filteredQuotations, currentPage]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'finalTotal' || field === 'quotationNumber' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Native Print Handler
  const handlePrintQuotation = () => {
    window.print();
  };

  // Helper: Generates high-fidelity A4 PDF using html2canvas & jsPDF from the quotation sheet
  const generateQuotationPdfBlob = async (
    record: QuotationRecord
  ): Promise<{ blob: Blob; base64: string; filename: string }> => {
    const printableElement = document.getElementById('printable-official-quotation');
    if (!printableElement) {
      throw new Error('Printable document element was not found in the DOM.');
    }

    const canvas = await html2canvas(printableElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12; // 12mm margins (Top, Bottom, Left, Right)
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, Math.min(contentHeight, pageHeight - margin * 2));
    const filename = `Quotation-${record.quotationNumber}.pdf`;
    const pdfBlob = pdf.output('blob');
    const base64 = pdf.output('datauristring').split(',')[1];
    return { blob: pdfBlob, base64, filename };
  };

  // Download PDF Handler (Exports real A4 PDF directly)
  const handleDownloadPDF = async () => {
    if (!previewQuotation) return;
    try {
      const { filename, base64 } = await generateQuotationPdfBlob(previewQuotation);
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${base64}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Direct PDF download fallback to window.print():', err);
      window.print();
    }
  };

  // Open Send Email Modal with customer pre-fill and editable default body
  const handleOpenEmailModal = (record: QuotationRecord) => {
    // If preview is not already set to this record, set it so that html2canvas can capture the sheet if needed
    if (!previewQuotation || previewQuotation.id !== record.id) {
      setPreviewQuotation(record);
    }
    setEmailModalQuotation(record);
    setEmailTo(record.customerEmail || '');
    setEmailSubject(`Quotation from Mannar Green Ride – ${record.quotationNumber}`);
    setEmailBody(
`Dear ${record.customerName || 'Valued Customer'},

Greetings from Mannar Green Ride.

Please find attached the quotation ${record.quotationNumber} for your review.

Quotation Details:
Quotation No: ${record.quotationNumber}
Date: ${record.date}
Valid Until: ${record.validUntil || 'N/A'}
Type: ${record.quotationType === 'sale' ? 'Sale' : 'Rent'}

Please note that 50% advance payment is required to confirm the reservation.

If you need any clarification or changes, please feel free to contact us.

Thank you.

Best regards,
Mannar Green Ride
MM-10, Mannar UC New Building, Madawachiya Road, Mannar
Tel: +94776574418
Email: mannargreenride@gmail.com
Website: https://www.mannargreenride.com/`
    );
    setEmailFeedback(null);
  };

  // Dispatch Email with auto-attached PDF
  const handleSendEmail = async () => {
    if (!emailTo.trim()) {
      alert('Please enter a recipient email address.');
      return;
    }
    if (!emailModalQuotation) return;

    setIsSendingEmail(true);
    setEmailFeedback(null);

    try {
      // 1. Generate PDF attachment if preview element is rendered
      let attachments: any[] = [];
      try {
        const { base64, filename } = await generateQuotationPdfBlob(emailModalQuotation);
        if (base64) {
          attachments.push({
            filename,
            content: base64,
            encoding: 'base64',
            contentType: 'application/pdf',
          });
        }
      } catch (pdfErr) {
        console.warn('PDF generation notice:', pdfErr);
      }

      // 2. Prepare HTML & text body
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; max-width: 650px;">
          ${emailBody.replace(/\n/g, '<br/>')}
        </div>
      `;

      // 3. Dispatch to API
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: emailSubject.trim(),
          text: emailBody.trim(),
          html: htmlBody,
          attachments,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok && !result.success) {
        throw new Error(result.error || 'Failed to dispatch email');
      }

      // 4. Update quotation record with dispatch metadata
      const now = Date.now();
      const updatedQuotation: QuotationRecord = {
        ...emailModalQuotation,
        customerEmail: emailTo.trim(),
        status: 'sent',
        lastSentEmailAt: now,
        sentEmailCount: (emailModalQuotation.sentEmailCount || 0) + 1,
        updatedAt: now,
      };

      const nextList = quotations.map((q) => (q.id === updatedQuotation.id ? updatedQuotation : q));
      handleUpdateQuotationsList(nextList);

      if (previewQuotation && previewQuotation.id === updatedQuotation.id) {
        setPreviewQuotation(updatedQuotation);
      }

      setEmailFeedback({
        type: 'success',
        message: `Quotation #${updatedQuotation.quotationNumber} sent successfully to ${emailTo.trim()}! Auto-attached PDF included.`,
      });

      setTimeout(() => {
        setEmailModalQuotation(null);
        setIsSendingEmail(false);
        setEmailFeedback(null);
      }, 1800);
    } catch (err: any) {
      console.error('[Send Quotation Email Error]', err);
      setEmailFeedback({
        type: 'error',
        message: err.message || 'Error dispatching email. Please verify connection and server credentials.',
      });
      setIsSendingEmail(false);
    }
  };

  // Customer Autocomplete Filter
  const matchedCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return [];
    const q = customerSearchQuery.toLowerCase().trim();
    return customers
      .filter(
        (c) =>
          c.fullName?.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.whatsappNumber?.includes(q) ||
          c.nicPassport?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [customers, customerSearchQuery]);

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. HERO HEADER & QUICK ACTION BAR                               */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border backdrop-blur-md transition-all shadow-sm"
        style={{
          background: themeMode === 'dark' 
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)' 
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.85) 100%)',
          borderColor: themeMode === 'dark' ? 'rgba(51, 65, 85, 0.7)' : 'rgba(226, 232, 240, 0.9)',
        }}
      >
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-2xl ${t.accentBg} text-white shadow-md flex items-center justify-center shrink-0`}>
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className={`text-xl font-extrabold tracking-tight ${t.textHeading}`}>
                Bicycle POS Quotation
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${t.badge}`}>
                Sale & Rent
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${t.textMuted}`}>
              Generate official branded quotations in LKR & USD with automatic calculations, customizable terms, and PDF export.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenCreateModal('sale')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all transform active:scale-95 cursor-pointer ${t.primaryBtn}`}
          >
            <Plus className="w-4 h-4" />
            <span>+ New Sale Quotation</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreateModal('rent')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer ${
              themeMode === 'dark'
                ? 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/40 text-blue-300'
                : 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>+ New Rent Quotation</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. STATS & KPI STRIP                                            */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className={`p-4 rounded-xl border ${t.cardBg} ${t.borderMain} shadow-xs`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>Total Quotations</span>
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-2xl font-extrabold mt-1.5 ${t.textHeading}`}>
            {quotations.length}
          </div>
          <div className={`text-[10px] mt-0.5 ${t.textMuted}`}>
            All recorded estimates
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${t.cardBg} ${t.borderMain} shadow-xs`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>Sale Quotations</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-extrabold mt-1.5 text-emerald-500`}>
            {quotations.filter((q) => q.quotationType === 'sale').length}
          </div>
          <div className={`text-[10px] mt-0.5 ${t.textMuted}`}>
            Bicycles & equipment
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${t.cardBg} ${t.borderMain} shadow-xs`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>Rent Quotations</span>
            <Bike className="w-4 h-4 text-blue-400" />
          </div>
          <div className={`text-2xl font-extrabold mt-1.5 text-blue-500`}>
            {quotations.filter((q) => q.quotationType === 'rent').length}
          </div>
          <div className={`text-[10px] mt-0.5 ${t.textMuted}`}>
            Day / Hour fleet hire
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${t.cardBg} ${t.borderMain} shadow-xs`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>Next Sequence</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-mono font-black mt-1.5 text-amber-500 truncate">
            {getNextQuotationNumber(quotations)}
          </div>
          <div className={`text-[10px] mt-0.5 ${t.textMuted}`}>
            Monotonic 7-digit series
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SEARCH, FILTERS & ACTION CONTROLS                             */}
      {/* ============================================================== */}
      <div className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${t.cardBg} ${t.borderMain}`}>
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by Quote #, Customer, Product, Phone, Date..."
            className={`w-full pl-9 pr-8 py-2 rounded-lg text-xs font-medium border transition-colors outline-hidden ${t.searchInput}`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${t.textMuted} hover:${t.textMain}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center p-0.5 rounded-lg border text-xs font-semibold"
            style={{
              borderColor: themeMode === 'dark' ? 'rgba(75, 85, 99, 0.6)' : 'rgba(209, 213, 219, 0.8)',
              background: themeMode === 'dark' ? 'rgba(31, 41, 55, 0.6)' : 'rgba(243, 244, 246, 0.8)',
            }}
          >
            <button
              type="button"
              onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                typeFilter === 'all' ? `${t.accentBg} text-white shadow-xs` : `${t.textMuted} hover:${t.textMain}`
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => { setTypeFilter('sale'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                typeFilter === 'sale' ? `${t.accentBg} text-white shadow-xs` : `${t.textMuted} hover:${t.textMain}`
              }`}
            >
              Sale
            </button>
            <button
              type="button"
              onClick={() => { setTypeFilter('rent'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                typeFilter === 'rent' ? `${t.accentBg} text-white shadow-xs` : `${t.textMuted} hover:${t.textMain}`
              }`}
            >
              Rent
            </button>
          </div>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => {
              setCurrencyFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${t.dropdownInput}`}
          >
            <option value="all">All Currencies</option>
            <option value="LKR">LKR (Rupees)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. QUOTATIONS DATA TABLE                                        */}
      {/* ============================================================== */}
      <div className={`rounded-xl border overflow-hidden shadow-xs ${t.cardBg} ${t.borderMain}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${themeMode === 'dark' ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <th
                  onClick={() => handleSort('quotationNumber')}
                  className="px-3.5 py-3 font-bold cursor-pointer select-none hover:text-emerald-500 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Quotation #</span>
                    {sortField === 'quotationNumber' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('date')}
                  className="px-3.5 py-3 font-bold cursor-pointer select-none hover:text-emerald-500 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    {sortField === 'date' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Type</th>
                <th
                  onClick={() => handleSort('customerName')}
                  className="px-3.5 py-3 font-bold cursor-pointer select-none hover:text-emerald-500 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Customer Details</span>
                    {sortField === 'customerName' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="px-3.5 py-3 font-bold whitespace-nowrap">Product / Item</th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Quantity / Units</th>
                <th className="px-3.5 py-3 font-bold text-right whitespace-nowrap">Unit Price</th>
                <th
                  onClick={() => handleSort('finalTotal')}
                  className="px-3.5 py-3 font-bold text-right cursor-pointer select-none hover:text-emerald-500 whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Final Amount</span>
                    {sortField === 'finalTotal' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="px-3.5 py-3 font-bold text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {paginatedQuotations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h4 className={`text-sm font-bold ${t.textHeading}`}>No Quotations Found</h4>
                      <p className={`text-xs mt-1 ${t.textMuted}`}>
                        {searchQuery
                          ? 'No quotation matches your search criteria. Try a different query.'
                          : 'Get started by creating your first official Sale or Rent quotation.'}
                      </p>
                      {!searchQuery && (
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            type="button"
                            onClick={() => handleOpenCreateModal('sale')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${t.primaryBtn}`}
                          >
                            + Sale Quotation
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateModal('rent')}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white"
                          >
                            + Rent Quotation
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedQuotations.map((quo) => {
                  const isSale = quo.quotationType === 'sale';
                  return (
                    <tr
                      key={quo.id}
                      className={`transition-colors ${
                        themeMode === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Quotation Number */}
                      <td className="px-3.5 py-3 font-mono font-bold whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md border text-[11px] ${
                          isSale
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {quo.quotationNumber}
                        </span>
                      </td>

                      {/* Date */}
                      <td className={`px-3.5 py-3 whitespace-nowrap font-medium ${t.textMuted}`}>
                        <div>{quo.date}</div>
                        {quo.lastSentEmailAt && (
                          <div className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                            <span>Emailed {quo.sentEmailCount && quo.sentEmailCount > 1 ? `(${quo.sentEmailCount}x)` : ''}</span>
                          </div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                            isSale
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                          }`}
                        >
                          {isSale ? <ShoppingBag className="w-3 h-3" /> : <Bike className="w-3 h-3" />}
                          {isSale ? 'Sale' : `Rent (${quo.rentalCalcType?.toUpperCase() || 'DAY'})`}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-3.5 py-3 max-w-[200px]">
                        <div className={`font-bold truncate ${t.textHeading}`}>
                          {quo.customerName}
                        </div>
                        <div className={`text-[10px] truncate ${t.textMuted}`}>
                          {quo.customerPhone || quo.customerNicPassport || 'No contact provided'}
                        </div>
                      </td>

                      {/* Product */}
                      <td className="px-3.5 py-3 max-w-[220px]">
                        <div className={`font-semibold truncate ${t.textMain}`}>
                          {quo.productName}
                        </div>
                        {quo.items?.[0]?.productDescription && (
                          <div className={`text-[10px] truncate ${t.textMuted}`}>
                            {quo.items[0].productDescription}
                          </div>
                        )}
                      </td>

                      {/* Quantity / Units & Duration */}
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        {isSale ? (
                          <span className="font-bold">{quo.quantity} Qty</span>
                        ) : (
                          <div>
                            <span className="font-bold">{quo.units || quo.quantity} Units</span>
                            <span className={`text-[10px] block ${t.textMuted}`}>
                              for {quo.duration || 1} {quo.rentalCalcType === 'hour' ? 'Hour(s)' : 'Day(s)'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className={`px-3.5 py-3 text-right font-medium whitespace-nowrap ${t.textMuted}`}>
                        {formatQuotationCurrency(quo.unitPrice, quo.currency)}
                      </td>

                      {/* Final Total */}
                      <td className="px-3.5 py-3 text-right whitespace-nowrap font-mono font-bold text-sm">
                        <span className={isSale ? 'text-emerald-500' : 'text-blue-400'}>
                          {formatQuotationCurrency(quo.finalTotal, quo.currency)}
                        </span>
                        {quo.discount > 0 && (
                          <span className="text-[10px] block text-rose-400 font-normal">
                            disc: -{formatQuotationCurrency(quo.discount, quo.currency)}
                          </span>
                        )}
                      </td>

                      {/* Action Buttons: View, Edit, Print, Send Email, Delete */}
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View & Preview */}
                          <button
                            type="button"
                            onClick={() => setPreviewQuotation(quo)}
                            title="View Official Quotation"
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              themeMode === 'dark'
                                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(quo)}
                            title="Edit Quotation"
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              themeMode === 'dark'
                                ? 'bg-slate-800 hover:bg-emerald-900/40 border-slate-700 hover:border-emerald-700 text-emerald-400'
                                : 'bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-300 text-emerald-700'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Print Shortcut */}
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewQuotation(quo);
                              setTimeout(() => window.print(), 350);
                            }}
                            title="Print / PDF Quotation"
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              themeMode === 'dark'
                                ? 'bg-slate-800 hover:bg-blue-900/40 border-slate-700 hover:border-blue-700 text-blue-400'
                                : 'bg-white hover:bg-blue-50 border-slate-200 hover:border-blue-300 text-blue-700'
                            }`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Send / Resend Email */}
                          <button
                            type="button"
                            onClick={() => handleOpenEmailModal(quo)}
                            title={quo.sentEmailCount ? `Email sent ${quo.sentEmailCount}x (Last: ${new Date(quo.lastSentEmailAt || 0).toLocaleDateString()}). Click to resend.` : 'Send Quotation by Email'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              quo.lastSentEmailAt
                                ? themeMode === 'dark'
                                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50'
                                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                : themeMode === 'dark'
                                  ? 'bg-slate-800 hover:bg-violet-900/40 border-slate-700 hover:border-violet-700 text-violet-400'
                                  : 'bg-white hover:bg-violet-50 border-slate-200 hover:border-violet-300 text-violet-700'
                            }`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (Admin Only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteQuotation(quo.id, quo.quotationNumber)}
                              title="Delete Quotation"
                              className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredQuotations.length > 0 && (
          <div className={`p-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${t.cardSubtleBg} ${t.borderMain}`}>
            <span className={t.textMuted}>
              Showing{' '}
              <strong className={t.textMain}>
                {(currentPage - 1) * PAGE_SIZE + 1}
              </strong>{' '}
              to{' '}
              <strong className={t.textMain}>
                {Math.min(currentPage * PAGE_SIZE, filteredQuotations.length)}
              </strong>{' '}
              of <strong className={t.textMain}>{filteredQuotations.length}</strong> quotations
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`px-2.5 py-1 rounded-md border font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                  themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                Previous
              </button>

              <span className={`px-2.5 py-1 font-bold ${t.textMain}`}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`px-2.5 py-1 rounded-md border font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                  themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 5. CREATE / EDIT QUOTATION MODAL                               */}
      {/* ============================================================== */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden my-auto ${t.modalBg} ${t.borderMain}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${t.borderMain} ${t.cardSubtleBg}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${t.accentBg} text-white`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-extrabold ${t.textHeading}`}>
                    {editingQuotationId ? `Edit Quotation #${quotationNumber}` : 'Create New Official Quotation'}
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    Mannar Green Ride · Sequential Reference #{quotationNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textMain} cursor-pointer transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Type Switcher: SALE vs RENT */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${t.textMuted}`}>
                  1. Quotation Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuotationTypeChange('sale')}
                    className={`p-3.5 rounded-xl border flex items-center justify-center gap-3 transition-all cursor-pointer ${
                      quotationType === 'sale'
                        ? `${t.accentBg} text-white font-bold shadow-md`
                        : `${themeMode === 'dark' ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'} hover:border-emerald-500/50`
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <div className="text-left">
                      <div className="text-sm font-bold">Sale Quotation</div>
                      <div className={`text-[10px] ${quotationType === 'sale' ? 'text-white/80' : t.textMuted}`}>
                        Product, accessories, spare parts
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuotationTypeChange('rent')}
                    className={`p-3.5 rounded-xl border flex items-center justify-center gap-3 transition-all cursor-pointer ${
                      quotationType === 'rent'
                        ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-md'
                        : `${themeMode === 'dark' ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'} hover:border-blue-500/50`
                    }`}
                  >
                    <Bike className="w-5 h-5" />
                    <div className="text-left">
                      <div className="text-sm font-bold">Rent Quotation</div>
                      <div className={`text-[10px] ${quotationType === 'rent' ? 'text-white/80' : t.textMuted}`}>
                        Fleet hire by Day or Hour
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quotation Meta: Number, Date, Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${t.textHeading}`}>
                    Quotation #
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={quotationNumber}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border bg-slate-500/10 cursor-not-allowed ${t.textMain} ${t.borderMain}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${t.textHeading}`}>
                    Quotation Date
                  </label>
                  <input
                    type="date"
                    value={quotationDate}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${t.textHeading}`}>
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={validUntilDate}
                    onChange={(e) => setValidUntilDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${t.textInput}`}
                  />
                </div>
              </div>

              {/* Customer Details Section */}
              <div className={`p-4 rounded-xl border ${t.cardSubtleBg} ${t.borderMain} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-500" />
                    <span className={`text-xs font-bold uppercase tracking-wider ${t.textHeading}`}>
                      2. Customer Details
                    </span>
                  </div>
                  {selectedCustomerId && (
                    <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      ✓ Linked from Directory
                    </span>
                  )}
                </div>

                {/* Search & Auto-Select from Customers */}
                <div className="relative">
                  <label className={`block text-[11px] font-medium mb-1 ${t.textMuted}`}>
                    Quick Select Customer (or type custom details below):
                  </label>
                  <div className="relative">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setCustomerName(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search existing customer by Name, Mobile, NIC..."
                      className={`w-full pl-8 pr-3 py-2 rounded-lg text-xs border ${t.searchInput}`}
                    />
                  </div>

                  {showCustomerDropdown && matchedCustomers.length > 0 && (
                    <div
                      className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-30 max-h-48 overflow-y-auto ${t.modalBg} ${t.borderMain}`}
                    >
                      {matchedCustomers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className={`p-2.5 border-b last:border-b-0 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                            themeMode === 'dark' ? 'hover:bg-slate-700/60 border-slate-700/60' : 'hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{c.fullName || c.name}</div>
                            <div className={`text-[10px] ${t.textMuted}`}>
                              {c.whatsappNumber || c.phone || 'No phone'} · NIC: {c.nicPassport || 'N/A'}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold ${t.accentText}`}>Select</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline Customer Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase ${t.textMuted}`}>
                      Client Full Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. A.B. Siraiva"
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${t.textInput}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase ${t.textMuted}`}>
                      Phone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 0773606494"
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${t.textInput}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase ${t.textMuted}`}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="client@example.com"
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${t.textInput}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase ${t.textMuted}`}>
                      NIC / Passport
                    </label>
                    <input
                      type="text"
                      value={customerNicPassport}
                      onChange={(e) => setCustomerNicPassport(e.target.value)}
                      placeholder="198802900037"
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${t.textInput}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[10px] font-bold uppercase ${t.textMuted}`}>
                    Address / Hotel
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="e.g. Main Street, Mannar / Resort Name"
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${t.textInput}`}
                  />
                </div>
              </div>

              {/* Product / Item Specifications */}
              <div className={`p-4 rounded-xl border ${t.cardSubtleBg} ${t.borderMain} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-500" />
                    <span className={`text-xs font-bold uppercase tracking-wider ${t.textHeading}`}>
                      3. Item & Product Specifications
                    </span>
                  </div>

                  {/* Currency Picker: LKR vs USD */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${t.textMuted}`}>Currency:</span>
                    <div className="flex items-center rounded-lg border p-0.5 text-xs font-bold"
                      style={{
                        borderColor: themeMode === 'dark' ? 'rgba(75, 85, 99, 0.6)' : 'rgba(209, 213, 219, 0.8)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setCurrency('LKR')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          currency === 'LKR' ? `${t.accentBg} text-white shadow-xs` : `${t.textMuted} hover:${t.textMain}`
                        }`}
                      >
                        LKR (Rs.)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrency('USD')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          currency === 'USD' ? 'bg-blue-600 text-white shadow-xs' : `${t.textMuted} hover:${t.textMain}`
                        }`}
                      >
                        USD ($)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Presets from Registered Vehicle Categories */}
                {vehicleTypes.length > 0 && (
                  <div>
                    <label className={`block text-[11px] font-medium mb-1.5 ${t.textMuted}`}>
                      Quick Autofill from Categories:
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto">
                      {vehicleTypes.map((vt) => {
                        const price = quotationType === 'sale'
                          ? (vt.rates?.ratePerDay ? vt.rates.ratePerDay * 30 : 25000)
                          : (rentalCalcType === 'hour' ? (vt.rates?.ratePerHour || 150) : (vt.rates?.ratePerDay || 1200));

                        return (
                          <button
                            key={vt.id}
                            type="button"
                            onClick={() => handleSelectInventoryOrType(vt.name, price)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                              productName === vt.name
                                ? `${t.accentBg} text-white font-bold border-transparent`
                                : `${themeMode === 'dark' ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-100'} ${t.textMain}`
                            }`}
                          >
                            {vt.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Product Name & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${t.textHeading}`}>
                      Product / Item Name *
                    </label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder={quotationType === 'sale' ? 'e.g. Phoenix Mountain Bike 26"' : 'e.g. Standard City Bicycle'}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border ${t.textInput}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${t.textHeading}`}>
                      Description / Model Notes
                    </label>
                    <input
                      type="text"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      placeholder="e.g. 21-Speed Shimano gears, front suspension, lock included"
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${t.textInput}`}
                    />
                  </div>
                </div>

                {/* ====================================================== */}
                {/* DYNAMIC CALCULATION FIELDS (SALE VS RENT)              */}
                {/* ====================================================== */}
                {quotationType === 'sale' ? (
                  /* ================= SALE FLOW ================= */
                  <div className={`p-4 rounded-xl border ${themeMode === 'dark' ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50/60 border-emerald-200'} space-y-3.5`}>
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                        Sale Pricing & Math Engine
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {/* Quantity */}
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${t.textHeading}`}>
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${t.textInput}`}
                        />
                      </div>

                      {/* Unit Price */}
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${t.textHeading}`}>
                          Unit Price ({currency})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={saleUnitPrice || ''}
                          onChange={(e) => setSaleUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="0.00"
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${t.textInput}`}
                        />
                      </div>

                      {/* Discount with Type Selector */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={`text-xs font-bold ${t.textHeading}`}>
                            Discount
                          </label>
                          <div
                            className="flex items-center rounded-lg border p-0.5 text-[10px] font-bold"
                            style={{
                              borderColor: themeMode === 'dark' ? 'rgba(51, 65, 85, 0.7)' : 'rgba(203, 213, 225, 0.9)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setSaleDiscountType('percentage')}
                              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                saleDiscountType === 'percentage'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : `${t.textMuted} hover:${t.textMain}`
                              }`}
                            >
                              % Pct
                            </button>
                            <button
                              type="button"
                              onClick={() => setSaleDiscountType('fixed')}
                              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                saleDiscountType === 'fixed'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : `${t.textMuted} hover:${t.textMain}`
                              }`}
                            >
                              Fixed ({currency})
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max={saleDiscountType === 'percentage' ? 100 : undefined}
                            step="any"
                            value={saleDiscountValue || ''}
                            onChange={(e) => setSaleDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder={saleDiscountType === 'percentage' ? 'e.g. 10 (%)' : '0.00'}
                            className={`w-full px-3 py-2 pr-12 rounded-xl text-xs font-bold border ${t.textInput}`}
                          />
                          <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400 select-none">
                            {saleDiscountType === 'percentage' ? '%' : currency}
                          </span>
                        </div>
                        {saleDiscountType === 'percentage' && saleDiscountValue > 0 && (
                          <div className="text-[10px] text-emerald-500 font-medium mt-1">
                            {saleDiscountValue}% = -{formatQuotationCurrency(computedSale.discount, currency)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Calculation Breakdown Preview */}
                    <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                      themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <div>
                        <span className={t.textMuted}>Calculation Formula: </span>
                        <span className="font-mono font-semibold">
                          {formatQuotationCurrency(saleUnitPrice, currency)} × {quantity} Qty = {formatQuotationCurrency(computedSale.subtotal, currency)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <span className={t.textMuted}>Subtotal: </span>
                          <span className="font-bold">{formatQuotationCurrency(computedSale.subtotal, currency)}</span>
                        </div>
                        {computedSale.discount > 0 && (
                          <div className="text-rose-400">
                            <span>Discount {saleDiscountType === 'percentage' ? `(${saleDiscountValue}%)` : ''}: </span>
                            <span className="font-bold">-{formatQuotationCurrency(computedSale.discount, currency)}</span>
                          </div>
                        )}
                        <div className="text-emerald-500 font-extrabold text-sm font-mono">
                          Total: {formatQuotationCurrency(computedSale.finalTotal, currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= RENT FLOW ================= */
                  <div className={`p-4 rounded-xl border ${themeMode === 'dark' ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50/60 border-blue-200'} space-y-3.5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                          Rental Pricing & Math Engine
                        </span>
                      </div>

                      {/* Calculation Type Toggle: Day vs Hour */}
                      <div className="flex items-center rounded-lg border p-0.5 text-xs font-bold"
                        style={{
                          borderColor: themeMode === 'dark' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(147, 197, 253, 0.8)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setRentalCalcType('day')}
                          className={`px-2.5 py-0.5 rounded-md transition-all ${
                            rentalCalcType === 'day' ? 'bg-blue-600 text-white shadow-xs' : `${t.textMuted} hover:${t.textMain}`
                          }`}
                        >
                          Per Day
                        </button>
                        <button
                          type="button"
                          onClick={() => setRentalCalcType('hour')}
                          className={`px-2.5 py-0.5 rounded-md transition-all ${
                            rentalCalcType === 'hour' ? 'bg-blue-600 text-white shadow-xs' : `${t.textMuted} hover:${t.textMain}`
                          }`}
                        >
                          Per Hour
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                      {/* Units */}
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${t.textHeading}`}>
                          Number of Units
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={rentUnits}
                          onChange={(e) => setRentUnits(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${t.textInput}`}
                        />
                      </div>

                      {/* Duration */}
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${t.textHeading}`}>
                          Number of {rentalCalcType === 'hour' ? 'Hours' : 'Days'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={rentDuration}
                          onChange={(e) => setRentDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${t.textInput}`}
                        />
                      </div>

                      {/* Unit Rental Price */}
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${t.textHeading}`}>
                          Price per {rentalCalcType === 'hour' ? 'Hour' : 'Day'} ({currency})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={rentUnitPrice || ''}
                          onChange={(e) => setRentUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="0.00"
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${t.textInput}`}
                        />
                      </div>

                      {/* Discount with Type Selector */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={`text-xs font-bold ${t.textHeading}`}>
                            Discount
                          </label>
                          <div
                            className="flex items-center rounded-lg border p-0.5 text-[10px] font-bold"
                            style={{
                              borderColor: themeMode === 'dark' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(147, 197, 253, 0.8)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setRentDiscountType('percentage')}
                              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                rentDiscountType === 'percentage'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : `${t.textMuted} hover:${t.textMain}`
                              }`}
                            >
                              % Pct
                            </button>
                            <button
                              type="button"
                              onClick={() => setRentDiscountType('fixed')}
                              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                rentDiscountType === 'fixed'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : `${t.textMuted} hover:${t.textMain}`
                              }`}
                            >
                              Fixed ({currency})
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max={rentDiscountType === 'percentage' ? 100 : undefined}
                            step="any"
                            value={rentDiscountValue || ''}
                            onChange={(e) => setRentDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder={rentDiscountType === 'percentage' ? 'e.g. 10 (%)' : '0.00'}
                            className={`w-full px-3 py-2 pr-12 rounded-xl text-xs font-bold border ${t.textInput}`}
                          />
                          <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400 select-none">
                            {rentDiscountType === 'percentage' ? '%' : currency}
                          </span>
                        </div>
                        {rentDiscountType === 'percentage' && rentDiscountValue > 0 && (
                          <div className="text-[10px] text-blue-500 font-medium mt-1">
                            {rentDiscountValue}% = -{formatQuotationCurrency(computedRent.discount, currency)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Calculation Breakdown Preview */}
                    <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                      themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <div>
                        <span className={t.textMuted}>Calculation Formula: </span>
                        <span className="font-mono font-semibold">
                          {formatQuotationCurrency(rentUnitPrice, currency)} × {rentUnits} Units × {rentDuration} {rentalCalcType === 'hour' ? 'hr' : 'day'} = {formatQuotationCurrency(computedRent.subtotal, currency)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <span className={t.textMuted}>Subtotal: </span>
                          <span className="font-bold">{formatQuotationCurrency(computedRent.subtotal, currency)}</span>
                        </div>
                        {computedRent.discount > 0 && (
                          <div className="text-rose-400">
                            <span>Discount {rentDiscountType === 'percentage' ? `(${rentDiscountValue}%)` : ''}: </span>
                            <span className="font-bold">-{formatQuotationCurrency(computedRent.discount, currency)}</span>
                          </div>
                        )}
                        <div className="text-blue-500 font-extrabold text-sm font-mono">
                          Total: {formatQuotationCurrency(computedRent.finalTotal, currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================== */}
              {/* 4. TERMS AND CONDITIONS EDITOR                                 */}
              {/* ============================================================== */}
              <div className={`p-4 rounded-xl border ${t.cardSubtleBg} ${t.borderMain} space-y-2.5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    <span className={`text-xs font-bold uppercase tracking-wider ${t.textHeading}`}>
                      4. Terms & Conditions (Editable per Quotation)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTermsAndConditions(
                        quotationType === 'sale'
                          ? DEFAULT_TERMS_AND_CONDITIONS_SALE
                          : DEFAULT_TERMS_AND_CONDITIONS_RENT
                      );
                    }}
                    className={`text-[11px] font-semibold flex items-center gap-1 ${t.accentText} hover:underline`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset to Default Policy
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Type or edit custom terms, payment schedule, liability policies, validity period..."
                  className={`w-full p-3 rounded-xl text-xs font-mono border leading-relaxed ${t.textInput}`}
                />
                <p className={`text-[10px] ${t.textMuted}`}>
                  These terms will appear directly at the bottom of the official printed and downloaded PDF quotation.
                </p>
              </div>

              {/* Final Grand Summary Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                quotationType === 'sale'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}>
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wider ${
                    quotationType === 'sale' ? 'text-emerald-500' : 'text-blue-500'
                  }`}>
                    Quotation Grand Total Summary
                  </div>
                  <div className={`text-xs mt-0.5 ${t.textMuted}`}>
                    {quotationType === 'sale'
                      ? `${quantity} unit(s) @ ${formatQuotationCurrency(saleUnitPrice, currency)} each`
                      : `${rentUnits} unit(s) for ${rentDuration} ${rentalCalcType}(s) @ ${formatQuotationCurrency(rentUnitPrice, currency)}/${rentalCalcType}`}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black font-mono tracking-tight text-emerald-500">
                    {formatQuotationCurrency(currentFinalTotal, currency)}
                  </div>
                  {currentDiscount > 0 && (
                    <div className="text-[11px] text-rose-400 font-medium">
                      (Includes discount waiver of {formatQuotationCurrency(currentDiscount, currency)})
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className={`flex items-center justify-between px-6 py-4 border-t ${t.borderMain} ${t.cardSubtleBg}`}>
              <div className="text-xs">
                {saveSuccessMessage ? (
                  <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    {saveSuccessMessage}
                  </span>
                ) : (
                  <span className={t.textMuted}>
                    Review items and terms before saving
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveQuotation}
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer ${t.primaryBtn}`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{editingQuotationId ? 'Save & Update Quotation' : 'Save Quotation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Injected Print Styles for Clean A4 Output */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 15mm 15mm 15mm 15mm;
              }
              html, body {
                background: #ffffff !important;
                color: #0f172a !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-official-quotation, #printable-official-quotation * {
                visibility: visible !important;
              }
              #printable-official-quotation {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                background: #ffffff !important;
                overflow: visible !important;
              }
              .print\\:hidden, nav, header, aside {
                display: none !important;
              }
            }
          `,
        }}
      />

      {/* ============================================================== */}
      {/* 6. OFFICIAL QUOTATION PREVIEW, PRINT & PDF DOWNLOAD MODAL       */}
      {/* ============================================================== */}
      {previewQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
          <div className="w-full max-w-4xl rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
            {/* Modal Top Bar (Hidden on print) */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200 bg-slate-50 print:hidden">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Official Quotation Document #{previewQuotation.quotationNumber}
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Preview, Print, Download as PDF, or Send via Email
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintQuotation}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEmailModal(previewQuotation)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewQuotation(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet (A4 Balanced Layout with Clean Top, Bottom, Left, Right Spacing) */}
            <div
              id="printable-official-quotation"
              className="px-8 sm:px-12 md:px-14 pt-10 pb-12 space-y-7 flex-1 bg-white text-slate-900 font-sans overflow-y-auto print:p-0 print:m-0 print:space-y-6"
            >
              {/* Document Header with Logo & Business Details */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-emerald-600">
                <div className="flex items-start gap-4">
                  {settings.companyLogo ? (
                    <img
                      src={settings.companyLogo}
                      alt="Mannar Green Ride Logo"
                      className="w-16 h-16 rounded-xl object-contain border border-slate-200 shadow-xs shrink-0 mt-0.5"
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center w-16 h-16 rounded-xl text-white shadow-md shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                    >
                      <Bike className="w-8 h-8" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                      {settings.businessName || 'Mannar Green Ride'}
                    </h1>
                    <div className="text-xs text-slate-600 font-medium">
                      Bicycle POS & Fleet Rental Operations
                    </div>
                    <div className="text-[11px] text-slate-500">
                      MM-10, Mannar UC New Building, Madawachiya Road, Mannar
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tel: +94776574418 · Email: mannargreenride@gmail.com
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold">
                      Website:{' '}
                      <a
                        href="https://www.mannargreenride.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-emerald-800"
                      >
                        https://www.mannargreenride.com/
                      </a>
                    </div>
                  </div>
                </div>

                {/* Quotation Metadata Box (Top Right) */}
                <div className="text-left sm:text-right space-y-1 sm:min-w-[210px]">
                  <div className="inline-block px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black uppercase tracking-widest mb-1">
                    OFFICIAL QUOTATION
                  </div>
                  <div className="text-base font-black font-mono text-slate-900 tracking-tight">
                    {previewQuotation.quotationNumber}
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Date:</span> {previewQuotation.date}
                  </div>
                  {previewQuotation.validUntil && (
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Valid Until:</span> {previewQuotation.validUntil}
                    </div>
                  )}
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Type:</span>{' '}
                    <span className="uppercase font-bold text-emerald-700">
                      {previewQuotation.quotationType} QUOTATION
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Currency:</span>{' '}
                    <span className="font-bold text-emerald-700">{previewQuotation.currency}</span>
                  </div>

                  {/* Customer Line cleanly integrated without separate card box */}
                  {previewQuotation.customerName && previewQuotation.customerName !== 'Valued Client' && (
                    <div className="text-xs text-slate-700 pt-1.5 mt-1 border-t border-slate-200">
                      <span className="font-semibold text-slate-500 uppercase text-[10px] block">Customer:</span>
                      <span className="font-bold text-slate-900">{previewQuotation.customerName}</span>
                      {previewQuotation.customerPhone && (
                        <span className="block text-[11px] text-slate-500">Phone: {previewQuotation.customerPhone}</span>
                      )}
                      {previewQuotation.customerEmail && (
                        <span className="block text-[11px] text-slate-500">Email: {previewQuotation.customerEmail}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Quotation Table with generous cell spacing */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Item Description</th>
                      <th className="px-4 py-3 text-center">Type</th>
                      <th className="px-4 py-3 text-center">Qty / Units</th>
                      {previewQuotation.quotationType === 'rent' && (
                        <th className="px-4 py-3 text-center">Duration</th>
                      )}
                      <th className="px-4 py-3 text-right">Unit Rate</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr>
                      <td className="px-4 py-3.5 font-bold text-slate-400">1</td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{previewQuotation.productName}</div>
                        {previewQuotation.items?.[0]?.productDescription && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {previewQuotation.items[0].productDescription}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center uppercase font-bold text-[10px] text-emerald-700">
                        {previewQuotation.quotationType}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold">
                        {previewQuotation.quantity || previewQuotation.units || 1}
                      </td>
                      {previewQuotation.quotationType === 'rent' && (
                        <td className="px-4 py-3.5 text-center font-bold">
                          {previewQuotation.duration || 1} {previewQuotation.rentalCalcType === 'hour' ? 'Hour(s)' : 'Day(s)'}
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-right font-medium">
                        {formatQuotationCurrency(previewQuotation.unitPrice, previewQuotation.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold font-mono">
                        {formatQuotationCurrency(previewQuotation.subtotal, previewQuotation.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary Block with clean alignment */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-80 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">Subtotal:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatQuotationCurrency(previewQuotation.subtotal, previewQuotation.currency)}
                    </span>
                  </div>

                  {previewQuotation.discount > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-slate-200 text-rose-600">
                      <span className="font-medium">
                        Discount
                        {previewQuotation.discountType === 'percentage' && previewQuotation.discountValue
                          ? ` (${previewQuotation.discountValue}%):`
                          : ':'}
                      </span>
                      <span className="font-bold font-mono">
                        -{formatQuotationCurrency(previewQuotation.discount, previewQuotation.currency)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-2.5 border-b-2 border-slate-900 text-sm font-black">
                    <span className="text-slate-900 uppercase tracking-wide">Final Total:</span>
                    <span className="font-mono text-emerald-700 text-base">
                      {formatQuotationCurrency(previewQuotation.finalTotal, previewQuotation.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions Section (Includes 50% reservation payment rule) */}
              <div className="pt-4 border-t border-slate-200 space-y-2 text-xs">
                <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Terms & Conditions:
                </h5>
                <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                  {previewQuotation.termsAndConditions}
                </div>
              </div>

              {/* Signatures & Official Stamp Area with proper spacing */}
              <div className="pt-10 pb-4 mt-6 grid grid-cols-2 gap-12 text-xs text-slate-700">
                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1.5 font-bold text-center">
                    Customer Acceptance
                  </div>
                  <div className="text-[10px] text-slate-500 text-center">
                    Signature & Date
                  </div>
                </div>

                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1.5 font-bold text-center text-emerald-700">
                    For Mannar Green Ride
                  </div>
                  <div className="text-[10px] text-slate-500 text-center">
                    Authorized Signatory & Official Stamp
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. SEND QUOTATION BY EMAIL MODAL                                */}
      {/* ============================================================== */}
      {emailModalQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-2xl overflow-hidden my-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Send Quotation by Email
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    #{emailModalQuotation.quotationNumber} · Auto-attach PDF & Editable Content
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEmailModalQuotation(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Feedback Alert */}
              {emailFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                    emailFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 font-medium'
                  }`}
                >
                  {emailFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{emailFeedback.message}</span>
                </div>
              )}

              {/* Resend Notice (if already sent) */}
              {emailModalQuotation.lastSentEmailAt && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Previously Sent:</span> Dispatched{' '}
                    {emailModalQuotation.sentEmailCount || 1} time(s) (Last sent:{' '}
                    {new Date(emailModalQuotation.lastSentEmailAt).toLocaleString()}). You can edit the text and resend now.
                  </div>
                </div>
              )}

              {/* Recipient Email Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Recipient Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full px-3.5 py-2 pl-9 rounded-xl text-xs font-medium border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Auto-filled from customer profile if available. You may edit or enter any recipient email.
                </span>
              </div>

              {/* Email Subject Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Email Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Quotation Subject..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Email Body Textarea (Editable) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Email Body Content (Editable) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Fully customizable before sending</span>
                </div>
                <textarea
                  rows={10}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full p-3.5 rounded-xl text-xs font-mono border border-slate-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Attachment Badge */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">Quotation-{emailModalQuotation.quotationNumber}.pdf</span>
                  <span className="text-[11px] text-slate-500">(Auto-generated & attached as PDF)</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                  PDF Attached
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setEmailModalQuotation(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSendingEmail || !emailTo.trim()}
                onClick={handleSendEmail}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer transition-all ${
                  isSendingEmail || !emailTo.trim()
                    ? 'bg-indigo-400 text-white cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                }`}
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PDF & Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{emailModalQuotation.lastSentEmailAt ? 'Resend Email Now' : 'Send Email Now'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
