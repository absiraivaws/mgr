import React, { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Users, 
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Customer, CustomerStatus } from '../types';
import { ThemeMode, AccentColor, getThemeClasses } from '../utils/theme';
import { cleanWhatsAppPhoneNumber } from '../utils/customer';

interface BulkCustomerUploadModalProps {
  existingCustomers: Customer[];
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onClose: () => void;
  onImportCustomers: (imported: Customer[]) => void;
}

interface ParsedRow {
  rowNum: number;
  fullName: string;
  nicPassport: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  dob: string;
  groups: string[];
  status: CustomerStatus;
  statusRemark?: string;
  isValid: boolean;
  errors: string[];
  isExisting: boolean;
}

// Generate sample template CSV data with proper UTF-8 formatting
export function generateCustomerCsvTemplate(): string {
  const headers = [
    'Full Name',
    'NIC / Passport',
    'Mobile / Phone',
    'WhatsApp Number',
    'Address',
    'Date of Birth (YYYY-MM-DD)',
    'Customer Groups (semicolon separated)',
    'Status (active/suspended/blocked)',
    'Status Remark (optional)',
  ];

  const sampleRows = [
    [
      'Kasun Perera',
      '200012345678',
      '0771234567',
      '0771234567',
      'No. 45 Beach Road, Galle',
      '1998-05-14',
      'Regular;Student',
      'active',
      '',
    ],
    [
      'Sarah Jenkins',
      'N8892145A',
      '+447911123456',
      '+447911123456',
      'Lighthouse Hotel, Galle Fort',
      '1994-11-23',
      'Hotel;VIP',
      'active',
      '',
    ],
    [
      'Dinesh Silva',
      '198511223344',
      '0719876543',
      '0719876543',
      '12 Temple Lane, Unawatuna',
      '1985-02-18',
      'Local Resident',
      'suspended',
      'Late vehicle return on 2026-08-15',
    ],
  ];

  const escapeCsv = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...sampleRows.map((r) => r.map(escapeCsv).join(',')),
  ].join('\r\n');

  return csvContent;
}

export function downloadCustomerTemplateFile() {
  const content = generateCustomerCsvTemplate();
  // Include UTF-8 BOM for Microsoft Excel auto-detection
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Cycly_Customers_Bulk_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const BulkCustomerUploadModal: React.FC<BulkCustomerUploadModalProps> = ({
  existingCustomers,
  themeMode = 'dark',
  accent = 'emerald',
  onClose,
  onImportCustomers,
}) => {
  const t = getThemeClasses(themeMode, accent);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [importOption, setImportOption] = useState<'skip_existing' | 'update_existing'>('update_existing');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Set of existing normalized NICs for duplicate detection
  const existingNics = new Map<string, Customer>();
  existingCustomers.forEach((c) => {
    if (c.nicPassport) {
      existingNics.set(c.nicPassport.trim().toLowerCase(), c);
    }
  });

  // Simple CSV Line Parser handling quotes
  const parseCsvLines = (text: string): string[][] => {
    const lines: string[][] = [];
    const rawLines = text.split(/\r\n|\n|\r/);

    for (let raw of rawLines) {
      if (!raw.trim()) continue;
      const row: string[] = [];
      let inQuotes = false;
      let currentField = '';

      for (let i = 0; i < raw.length; i++) {
        const char = raw[i];
        if (char === '"') {
          if (inQuotes && raw[i + 1] === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      row.push(currentField.trim());
      lines.push(row);
    }

    return lines;
  };

  const processCsvFile = (content: string, name: string) => {
    setParseError(null);
    setFileName(name);

    try {
      const rows = parseCsvLines(content);
      if (rows.length < 2) {
        setParseError('The uploaded file has no data rows. Please ensure your file includes a header row followed by customer data.');
        setParsedRows([]);
        return;
      }

      // Check header row
      const dataRows = rows.slice(1);
      const parsed: ParsedRow[] = [];

      dataRows.forEach((cols, idx) => {
        const rowNum = idx + 2;
        const fullName = cols[0] || '';
        const nicPassport = cols[1] || '';
        const phone = cols[2] || '';
        const whatsappNumber = cols[3] || phone;
        const address = cols[4] || '';
        const dob = cols[5] || '';
        const groupsRaw = cols[6] || '';
        const rawStatus = (cols[7] || 'active').toLowerCase().trim();
        const statusRemark = cols[8] || '';

        const errors: string[] = [];

        if (!fullName.trim()) {
          errors.push('Full Name is required');
        }

        if (!nicPassport.trim()) {
          errors.push('NIC / Passport is required');
        }

        const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : '';
        const cleanWa = whatsappNumber ? cleanWhatsAppPhoneNumber(whatsappNumber) : '';

        // Validate Status
        const validStatuses: CustomerStatus[] = ['active', 'suspended', 'blocked', 'inactive', 'pending_verification'];
        const status: CustomerStatus = validStatuses.includes(rawStatus as CustomerStatus)
          ? (rawStatus as CustomerStatus)
          : 'active';

        // Parse groups (split by semicolon or comma)
        const groups = groupsRaw
          ? groupsRaw.split(/[;,]/).map((g) => g.trim()).filter(Boolean)
          : [];

        const isExisting = Boolean(nicPassport && existingNics.has(nicPassport.trim().toLowerCase()));

        parsed.push({
          rowNum,
          fullName: fullName.trim(),
          nicPassport: nicPassport.trim(),
          phone: cleanPhone || phone.trim(),
          whatsappNumber: cleanWa || cleanPhone || phone.trim(),
          address: address.trim(),
          dob: dob.trim(),
          groups,
          status,
          statusRemark: statusRemark.trim() || undefined,
          isValid: errors.length === 0,
          errors,
          isExisting,
        });
      });

      setParsedRows(parsed);
    } catch (err: any) {
      setParseError(`Failed to parse CSV file: ${err?.message || 'Invalid format'}`);
      setParsedRows([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processCsvFile(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processCsvFile(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);

    const customersToImport: Customer[] = [];

    validRows.forEach((row, i) => {
      const existing = existingNics.get(row.nicPassport.toLowerCase());

      if (existing) {
        if (importOption === 'update_existing') {
          customersToImport.push({
            ...existing,
            name: row.fullName,
            fullName: row.fullName,
            nicPassport: row.nicPassport,
            phone: row.phone || existing.phone,
            whatsappNumber: row.whatsappNumber || existing.whatsappNumber,
            address: row.address || existing.address,
            dob: row.dob || existing.dob,
            groups: Array.from(new Set([...(existing.groups || []), ...row.groups])),
            status: row.status,
            statusRemark: row.statusRemark || existing.statusRemark,
            statusUpdatedAt: Date.now(),
          });
        }
        // If 'skip_existing', ignore this row
      } else {
        customersToImport.push({
          id: `cust-${Date.now()}-${i}`,
          name: row.fullName,
          fullName: row.fullName,
          nicPassport: row.nicPassport,
          phone: row.phone,
          whatsappNumber: row.whatsappNumber,
          address: row.address,
          dob: row.dob,
          groups: row.groups,
          status: row.status,
          statusRemark: row.statusRemark,
          statusUpdatedAt: Date.now(),
          createdAt: Date.now(),
          totalRentalsCount: 0,
        });
      }
    });

    onImportCustomers(customersToImport);
    setIsProcessing(false);
    onClose();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;
  const existingCount = parsedRows.filter((r) => r.isExisting && r.isValid).length;
  const newCount = parsedRows.filter((r) => !r.isExisting && r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className={`relative w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${t.modalBg}`}>
        
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b ${t.divider} flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-black ${t.textHeading} tracking-tight`}>
                Bulk Customer Import (Excel / CSV)
              </h2>
              <p className={`text-xs ${t.textMuted}`}>
                Upload multiple customer profiles at once with auto-validation and group assignment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadCustomerTemplateFile}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${t.cardSubtleBg} ${t.textHeading} ${t.border} hover:border-emerald-500 shadow-xs`}
              title="Download pre-formatted CSV template file"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Download Excel Template</span>
              <span className="sm:hidden">Template</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl ${t.cardSubtleBg} ${t.textMuted} hover:${t.textHeading} cursor-pointer transition`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* File Upload Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10'
                : `border-slate-500/30 hover:border-emerald-500/60 ${t.cardSubtleBg}`
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-sm font-bold ${t.textHeading}`}>
                {fileName ? fileName : 'Click to browse or drag and drop your customer CSV file here'}
              </p>
              <p className={`text-xs ${t.textMuted} mt-1`}>
                Supports standard comma-separated files (.csv) formatted according to our template
              </p>
            </div>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              CSV Format • Max 2,000 customers per batch
            </span>
          </div>

          {/* Parse Error Banner */}
          {parseError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-500 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Parsed Summary & Options */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className={`p-3 rounded-xl border ${t.divider} ${t.cardSubtleBg}`}>
                  <span className={`text-[10px] uppercase font-bold ${t.textMuted} block`}>Total Rows</span>
                  <span className={`text-lg font-black ${t.textHeading}`}>{parsedRows.length}</span>
                </div>
                <div className={`p-3 rounded-xl border ${t.divider} ${t.cardSubtleBg}`}>
                  <span className="text-[10px] uppercase font-bold text-emerald-500 block">Valid Ready</span>
                  <span className="text-lg font-black text-emerald-500">{validCount}</span>
                </div>
                <div className={`p-3 rounded-xl border ${t.divider} ${t.cardSubtleBg}`}>
                  <span className="text-[10px] uppercase font-bold text-cyan-500 block">New / Existing</span>
                  <span className={`text-lg font-black ${t.textHeading}`}>{newCount} / {existingCount}</span>
                </div>
                <div className={`p-3 rounded-xl border ${t.divider} ${t.cardSubtleBg}`}>
                  <span className="text-[10px] uppercase font-bold text-rose-500 block">Errors</span>
                  <span className={`text-lg font-black ${invalidCount > 0 ? 'text-rose-500' : t.textMuted}`}>{invalidCount}</span>
                </div>
              </div>

              {/* Duplicate Resolution Setting */}
              <div className={`p-3.5 rounded-xl border ${t.divider} ${t.cardSubtleBg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs`}>
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span className={`font-semibold ${t.textHeading}`}>If customer NIC already exists:</span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importOption"
                      checked={importOption === 'update_existing'}
                      onChange={() => setImportOption('update_existing')}
                      className="w-3.5 h-3.5 text-emerald-500 cursor-pointer"
                    />
                    <span className={t.textMain}>Update existing customer data</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importOption"
                      checked={importOption === 'skip_existing'}
                      onChange={() => setImportOption('skip_existing')}
                      className="w-3.5 h-3.5 text-emerald-500 cursor-pointer"
                    />
                    <span className={t.textMain}>Skip duplicate</span>
                  </label>
                </div>
              </div>

              {/* Parsed Rows Preview Table */}
              <div className={`border ${t.divider} rounded-xl overflow-hidden`}>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={`sticky top-0 border-b ${t.divider} ${t.cardSubtleBg} ${t.textHeading} font-bold z-10`}>
                      <tr>
                        <th className="p-2.5 w-12 text-center">Row</th>
                        <th className="p-2.5">Full Name</th>
                        <th className="p-2.5">NIC / Passport</th>
                        <th className="p-2.5">Mobile / WhatsApp</th>
                        <th className="p-2.5">Groups</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-center">Validation</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${t.divider}`}>
                      {parsedRows.slice(0, 50).map((row) => (
                        <tr
                          key={row.rowNum}
                          className={`transition ${row.isValid ? 'hover:bg-slate-500/5' : 'bg-rose-500/5'}`}
                        >
                          <td className={`p-2.5 text-center font-mono ${t.textMuted}`}>{row.rowNum}</td>
                          <td className={`p-2.5 font-bold ${t.textHeading}`}>{row.fullName || '—'}</td>
                          <td className="p-2.5 font-mono text-cyan-500">{row.nicPassport || '—'}</td>
                          <td className={`p-2.5 font-mono ${t.textMuted}`}>{row.whatsappNumber || row.phone || '—'}</td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              {row.groups.length > 0 ? (
                                row.groups.map((g) => (
                                  <span key={g} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20">
                                    {g}
                                  </span>
                                ))
                              ) : (
                                <span className={t.textMuted}>—</span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5">
                            <span className="capitalize text-[11px] font-semibold">{row.status}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{row.isExisting ? 'Existing (Update)' : 'Valid'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500" title={row.errors.join(', ')}>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Error</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 50 && (
                  <div className={`p-2 text-center text-xs ${t.textMuted} border-t ${t.divider} ${t.cardSubtleBg}`}>
                    Showing first 50 of {parsedRows.length} rows preview
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className={`p-4 sm:p-5 border-t ${t.divider} ${t.cardSubtleBg} flex flex-col sm:flex-row items-center justify-between gap-3`}>
          <div className={`text-xs ${t.textMuted}`}>
            {parsedRows.length > 0 ? (
              <span>Ready to import <strong className={t.textHeading}>{validCount}</strong> valid customer profile(s)</span>
            ) : (
              <span>Select or drop a CSV file to inspect customers before saving</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold ${t.inactiveTab} cursor-pointer transition`}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={validCount === 0 || isProcessing}
              onClick={handleConfirmImport}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md ${
                validCount === 0 || isProcessing
                  ? 'opacity-40 cursor-not-allowed bg-emerald-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Confirm Import ({validCount})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
