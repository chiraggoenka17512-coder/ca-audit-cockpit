import React, { useState } from 'react';
import { ClientProfile } from '../../data/clientDatabases';
import { UploadCloud, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

interface ImportViewProps {
  client: ClientProfile;
  onImportComplete?: (summary: string) => void;
}

export type FileType = 'Purchase Register' | 'GSTR-2B JSON' | 'Bank Statement' | 'Invoice PDF' | 'Unknown';

export interface IngestedFile {
  id: string;
  name: string;
  size: string;
  detectedType: FileType;
  selectedType: FileType;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'NEEDS_ATTENTION' | 'FAILED';
  progress: number;
  rowsRead?: number;
  rowsRejected?: number;
  unmappedHeaders?: string[];
  failureReason?: string;
}

const INITIAL_FILES: IngestedFile[] = [
  {
    id: "f-1",
    name: "Sept24_Purchase_Register.xlsx",
    size: "1.4 MB",
    detectedType: "Purchase Register",
    selectedType: "Purchase Register",
    status: "COMPLETED",
    progress: 100,
    rowsRead: 524,
    rowsRejected: 2,
    unmappedHeaders: ["Internal_Project_Tag", "Approver_Notes"]
  },
  {
    id: "f-2",
    name: "GSTR2B_27AABCA1234F1Z5_092024.json",
    size: "840 KB",
    detectedType: "GSTR-2B JSON",
    selectedType: "GSTR-2B JSON",
    status: "COMPLETED",
    progress: 100,
    rowsRead: 482,
    rowsRejected: 0,
    unmappedHeaders: []
  },
  {
    id: "f-3",
    name: "HDFC_Current_Account_00492819_Sept2024.csv",
    size: "320 KB",
    detectedType: "Bank Statement",
    selectedType: "Bank Statement",
    status: "COMPLETED",
    progress: 100,
    rowsRead: 114,
    rowsRejected: 1,
    unmappedHeaders: ["Reference_Code_3"]
  },
  {
    id: "f-4",
    name: "Vendor_Tax_Invoice_902_Siemens.pdf",
    size: "480 KB",
    detectedType: "Invoice PDF",
    selectedType: "Invoice PDF",
    status: "COMPLETED",
    progress: 100,
    rowsRead: 1,
    rowsRejected: 0,
    unmappedHeaders: []
  },
  {
    id: "f-5",
    name: "Encrypted_Contract_2024.pdf",
    size: "2.1 MB",
    detectedType: "Unknown",
    selectedType: "Unknown",
    status: "NEEDS_ATTENTION",
    progress: 0,
    failureReason: "Password-protected PDF stream. Decryption key required to parse table data."
  }
];

export const ImportView: React.FC<ImportViewProps> = ({ client, onImportComplete }) => {
  const [files, setFiles] = useState<IngestedFile[]>(INITIAL_FILES);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTypeChange = (id: string, newType: FileType) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        return {
          ...f,
          selectedType: newType,
          status: newType === 'Unknown' ? 'NEEDS_ATTENTION' : 'PENDING',
          failureReason: undefined
        };
      }
      return f;
    }));
  };

  const handleAddSampleBatch = () => {
    const newFile: IngestedFile = {
      id: `f-${Date.now()}`,
      name: `October_Advance_Register_Batch_${Math.floor(Math.random() * 100)}.xlsx`,
      size: "890 KB",
      detectedType: "Purchase Register",
      selectedType: "Purchase Register",
      status: "PENDING",
      progress: 0
    };
    setFiles(prev => [newFile, ...prev]);
  };

  const handleRunProcessing = () => {
    setIsProcessing(true);
    let step = 0;
    const interval = setInterval(() => {
      step += 25;
      setFiles(prev => prev.map(f => {
        if (f.status === 'PENDING') {
          if (step >= 100) {
            return {
              ...f,
              status: 'COMPLETED',
              progress: 100,
              rowsRead: 48,
              rowsRejected: 0,
              unmappedHeaders: []
            };
          }
          return { ...f, status: 'PROCESSING', progress: step };
        }
        return f;
      }));

      if (step >= 100) {
        clearInterval(interval);
        setIsProcessing(false);
        if (onImportComplete) {
          onImportComplete(`Processed document batch into ${client.name} workspace.`);
        }
      }
    }, 400);
  };

  const completedCount = files.filter(f => f.status === 'COMPLETED').length;
  const needsAttentionCount = files.filter(f => f.status === 'NEEDS_ATTENTION' || f.status === 'FAILED').length;

  return (
    <div className="cockpit-wrap space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262a33]">
        <div>
          <h1 className="cockpit-h1">Import documents</h1>
          <p className="cockpit-sub mb-0">
            Calamine &amp; JSON in-memory ingestion for {client.name}. 100% on-device execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddSampleBatch}
            className="cockpit-btn text-xs py-2"
          >
            + Add files
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleRunProcessing}
            className="cockpit-btn primary text-xs py-2"
          >
            {isProcessing ? 'Parsing files…' : 'Process batch'}
          </button>
        </div>
      </div>

      {/* Drag & Drop Simulation Dropzone: Flat, solid, no gradients */}
      <div className="border border-dashed border-[#363b47] hover:border-[#3ddc97] rounded-lg p-8 text-center bg-[#171a21] transition cursor-pointer">
        <UploadCloud className="w-10 h-10 mx-auto text-[#8a909c] mb-3" />
        <h3 className="text-sm font-semibold text-[#e8eaf0] mb-1">
          Drag and drop Excel books, GSTR-2B JSON, or bank statements here
        </h3>
        <p className="text-xs text-[#8a909c] max-w-md mx-auto">
          Supports .xlsx (Calamine native), .json (official GSTN GSTR-2B schema), .csv, and scanned invoice PDFs.
        </p>
      </div>

      {/* Summary Status Strip */}
      <div className="flex items-center justify-between text-xs text-[#8a909c] pt-2">
        <span>{files.length} files in staging area</span>
        <div className="flex items-center gap-4">
          <span className="text-[#3ddc97]">{completedCount} parsed successfully</span>
          {needsAttentionCount > 0 && (
            <span className="text-[#f5b754]">{needsAttentionCount} needs attention</span>
          )}
        </div>
      </div>

      {/* Ingestion Files List */}
      <div className="border-t border-[#262a33] divide-y divide-[#262a33]">
        {files.map((file) => (
          <div key={file.id} className="py-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {file.name.endsWith('.xlsx') || file.name.endsWith('.csv') ? (
                  <FileSpreadsheet className="w-5 h-5 text-[#3ddc97] shrink-0 mt-0.5" />
                ) : (
                  <FileText className="w-5 h-5 text-[#8a909c] shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-sm font-medium text-[#e8eaf0] truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-[#8a909c] mt-0.5 space-x-2">
                    <span>{file.size}</span>
                    <span>•</span>
                    <span>Detected as: {file.detectedType}</span>
                  </div>
                </div>
              </div>

              {/* Type Override Dropdown before processing */}
              <div className="flex items-center gap-3 shrink-0">
                <select
                  value={file.selectedType}
                  onChange={(e) => handleTypeChange(file.id, e.target.value as FileType)}
                  className="bg-[#0f1115] border border-[#262a33] text-xs text-[#e8eaf0] rounded px-2.5 py-1.5 focus:outline-none focus:border-[#3ddc97]"
                >
                  <option value="Purchase Register">Purchase Register</option>
                  <option value="GSTR-2B JSON">GSTR-2B JSON</option>
                  <option value="Bank Statement">Bank Statement</option>
                  <option value="Invoice PDF">Invoice PDF</option>
                  <option value="Unknown">Unknown (Needs Review)</option>
                </select>

                <div className="w-24 text-right">
                  {file.status === 'COMPLETED' && (
                    <span className="text-xs text-[#3ddc97] flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Parsed</span>
                    </span>
                  )}
                  {file.status === 'PROCESSING' && (
                    <span className="text-xs text-[#f5b754] flex items-center gap-1 justify-end">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{file.progress}%</span>
                    </span>
                  )}
                  {file.status === 'NEEDS_ATTENTION' && (
                    <span className="text-xs text-[#f5b754] flex items-center gap-1 justify-end">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Attention</span>
                    </span>
                  )}
                  {file.status === 'FAILED' && (
                    <span className="text-xs text-[#ff6b6b] flex items-center gap-1 justify-end">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Failed</span>
                    </span>
                  )}
                  {file.status === 'PENDING' && (
                    <span className="text-xs text-[#8a909c]">Queued</span>
                  )}
                </div>
              </div>
            </div>

            {/* Results breakdown per file */}
            {file.status === 'COMPLETED' && (
              <div className="pl-8 text-xs text-[#8a909c] flex flex-wrap items-center gap-4">
                <span>
                  Rows read: <strong className="text-[#e8eaf0] tabular-nums">{file.rowsRead}</strong>
                </span>
                <span>•</span>
                <span>
                  Rows rejected: <strong className={`tabular-nums ${file.rowsRejected ? 'text-[#f5b754]' : 'text-[#e8eaf0]'}`}>{file.rowsRejected || 0}</strong>
                </span>
                {file.unmappedHeaders && file.unmappedHeaders.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-[#f5b754]">
                      Unmapped headers: {file.unmappedHeaders.join(', ')}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Needs Attention Failure message */}
            {file.status === 'NEEDS_ATTENTION' && file.failureReason && (
              <div className="pl-8 text-xs text-[#f5b754]">
                {file.failureReason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
