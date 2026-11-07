import React, { useRef, useState, ChangeEvent, DragEvent } from 'react';
import { ClientProfile } from '../data/clientDatabases';
import { ReviewItem } from '../data/reviewItems';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Trash2,
  X,
  Plus
} from 'lucide-react';
import {
  IngestionFileType,
  IngestionFileItem,
  classifyFile,
  processIngestionFile,
  SAMPLE_INGESTION_FILES
} from '../engine/ingestion';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientProfile;
  onIngestVouchers: (vouchers: ReviewItem[], fileName: string) => void;
  onNavigateToExceptions?: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  client,
  onIngestVouchers,
  onNavigateToExceptions
}) => {
  const [files, setFiles] = useState<IngestionFileItem[]>(() => [...SAMPLE_INGESTION_FILES]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTypeChange = (id: string, newType: IngestionFileType) => {
    setFiles(prev =>
      prev.map(f => {
        if (f.id === id) {
          return {
            ...f,
            selectedType: newType,
            status: newType === 'Unknown' ? 'NEEDS_ATTENTION' : 'PENDING',
            failureReason: newType === 'Unknown' ? 'Unmapped file format. Please assign file type.' : undefined,
            progress: 0,
            rowsRead: undefined,
            vouchersIngested: undefined,
            rowsRejected: undefined,
            rejectedDetails: undefined,
            unmappedHeaders: undefined,
            parsedVouchers: undefined
          };
        }
        return f;
      })
    );
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleClearAll = () => {
    setFiles([]);
  };

  const handleAddSampleBatch = () => {
    setFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const freshSamples = SAMPLE_INGESTION_FILES.filter(s => !existingIds.has(s.id));
      if (freshSamples.length > 0) {
        return [...prev, ...freshSamples];
      }
      const suffix = Math.floor(Math.random() * 900 + 100);
      const cloned: IngestionFileItem = {
        ...SAMPLE_INGESTION_FILES[0],
        id: `sample-modal-${Date.now()}`,
        name: `Purchase_Register_Batch_${suffix}.csv`,
        status: 'PENDING',
        progress: 0
      };
      return [...prev, cloned];
    });
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    Array.from(selectedFiles).forEach(file => {
      const reader = new FileReader();
      const detected = classifyFile(file.name);
      const isText = file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.txt');

      if (isText) {
        reader.onload = event => {
          const content = event.target?.result as string;
          const refinedType = classifyFile(file.name, content.slice(0, 500));
          const newFileItem: IngestionFileItem = {
            id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            sizeBytes: file.size,
            sizeFormatted: formatFileSize(file.size),
            detectedType: refinedType,
            selectedType: refinedType,
            status: refinedType === 'Unknown' ? 'NEEDS_ATTENTION' : 'PENDING',
            progress: 0,
            rawText: content,
            failureReason: refinedType === 'Unknown' ? 'Unmapped file format. Please assign file type.' : undefined
          };
          setFiles(prev => [newFileItem, ...prev]);
        };
        reader.readAsText(file);
      } else {
        const newFileItem: IngestionFileItem = {
          id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          sizeBytes: file.size,
          sizeFormatted: formatFileSize(file.size),
          detectedType: detected,
          selectedType: detected,
          status: detected === 'Unknown' ? 'NEEDS_ATTENTION' : 'PENDING',
          progress: 0,
          failureReason: detected === 'Unknown' ? 'Unmapped file format. Please assign file type.' : undefined
        };
        setFiles(prev => [newFileItem, ...prev]);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    Array.from(droppedFiles).forEach(file => {
      const reader = new FileReader();
      const detected = classifyFile(file.name);
      const isText = file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.txt');

      if (isText) {
        reader.onload = event => {
          const content = event.target?.result as string;
          const refinedType = classifyFile(file.name, content.slice(0, 500));
          const newFileItem: IngestionFileItem = {
            id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            sizeBytes: file.size,
            sizeFormatted: formatFileSize(file.size),
            detectedType: refinedType,
            selectedType: refinedType,
            status: refinedType === 'Unknown' ? 'NEEDS_ATTENTION' : 'PENDING',
            progress: 0,
            rawText: content,
            failureReason: refinedType === 'Unknown' ? 'Unmapped file format. Please assign file type.' : undefined
          };
          setFiles(prev => [newFileItem, ...prev]);
        };
        reader.readAsText(file);
      } else {
        const newFileItem: IngestionFileItem = {
          id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          sizeBytes: file.size,
          sizeFormatted: formatFileSize(file.size),
          detectedType: detected,
          selectedType: detected,
          status: detected === 'Unknown' ? 'NEEDS_ATTENTION' : 'PENDING',
          progress: 0,
          failureReason: detected === 'Unknown' ? 'Unmapped file format. Please assign file type.' : undefined
        };
        setFiles(prev => [newFileItem, ...prev]);
      }
    });
  };

  const handleRunProcessing = () => {
    setIsProcessing(true);

    const pendingOrAttention = files.filter(f => f.status === 'PENDING' || f.status === 'NEEDS_ATTENTION');
    if (pendingOrAttention.length === 0) {
      setIsProcessing(false);
      return;
    }

    const updatedFiles = files.map(file => {
      if (file.status === 'PENDING' || (file.status === 'NEEDS_ATTENTION' && file.selectedType !== 'Unknown')) {
        const processed = processIngestionFile(file);

        if (processed.parsedVouchers && processed.parsedVouchers.length > 0 && onIngestVouchers) {
          onIngestVouchers(processed.parsedVouchers, processed.name);
        }
        return processed;
      }
      return file;
    });

    setFiles(updatedFiles);
    setIsProcessing(false);
  };

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const pendingCount = files.filter(f => f.status === 'PENDING').length;
  const completedCount = files.filter(f => f.status === 'COMPLETED').length;
  const totalVouchersIngested = files.reduce((acc, f) => acc + (f.vouchersIngested || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept=".csv,.json,.xlsx,.pdf,.txt"
      />

      <div className="w-full max-w-4xl bg-[#12151b] border border-[#262a33] rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#262a33] flex items-center justify-between shrink-0 bg-[#161920]">
          <div>
            <h2 className="text-base font-semibold text-[#e8eaf0]">Import documents</h2>
            <p className="text-xs text-[#8a909c] mt-0.5">
              Air-gapped multi-format document parser for {client.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8a909c] hover:text-[#e8eaf0] rounded hover:bg-[#1f232c] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-6 text-center transition cursor-pointer ${
              isDragOver
                ? 'border-[#3ddc97] bg-[#1a221f]'
                : 'border-[#262a33] hover:border-[#3ddc97] bg-[#161920]'
            }`}
          >
            <UploadCloud className="w-8 h-8 mx-auto text-[#8a909c] mb-2" />
            <h4 className="text-xs font-semibold text-[#e8eaf0] mb-0.5">
              Drop Excel books, GSTR-2B JSON, or bank statements here
            </h4>
            <p className="text-[11px] text-[#8a909c]">
              Click to browse local files. 100% on-device processing.
            </p>
          </div>

          {/* Quick Controls Bar */}
          <div className="flex items-center justify-between text-xs text-[#8a909c]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddSampleBatch}
                className="px-2.5 py-1 rounded bg-[#171a21] border border-[#262a33] text-xs text-[#e8eaf0] hover:border-[#3a404c] transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add sample files</span>
              </button>
              {files.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1 rounded bg-[#171a21] border border-[#262a33] text-xs text-[#8a909c] hover:text-[#e8eaf0] transition"
                >
                  Clear all
                </button>
              )}
            </div>
            <span className="tabular-nums">{files.length} files in queue</span>
          </div>

          {/* Staging List */}
          <div className="border border-[#262a33] rounded-lg divide-y divide-[#262a33] bg-[#161920]">
            {files.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8a909c]">
                No files selected. Click Add sample files to preview.
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {file.name.endsWith('.csv') || file.name.endsWith('.xlsx') ? (
                        <FileSpreadsheet className="w-4 h-4 text-[#3ddc97] shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#8a909c] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#e8eaf0] truncate">{file.name}</div>
                        <div className="text-[11px] text-[#8a909c]">{file.sizeFormatted}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={file.selectedType}
                        onChange={e => handleTypeChange(file.id, e.target.value as IngestionFileType)}
                        className="bg-[#0f1115] border border-[#262a33] text-[11px] text-[#e8eaf0] rounded px-2 py-1 focus:outline-none focus:border-[#3ddc97]"
                      >
                        <option value="Purchase Register">Purchase Register</option>
                        <option value="GSTR-2B JSON">GSTR-2B JSON</option>
                        <option value="Bank Statement">Bank Statement</option>
                        <option value="Tax Invoices">Tax Invoices</option>
                        <option value="Unknown">Unknown</option>
                      </select>

                      <div className="w-20 text-right">
                        {file.status === 'COMPLETED' && (
                          <span className="text-[11px] text-[#3ddc97] flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Parsed</span>
                          </span>
                        )}
                        {file.status === 'NEEDS_ATTENTION' && (
                          <span className="text-[11px] text-[#f5b754] flex items-center gap-1 justify-end">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Attention</span>
                          </span>
                        )}
                        {file.status === 'FAILED' && (
                          <span className="text-[11px] text-[#ff6b6b] flex items-center gap-1 justify-end">
                            <AlertCircle className="w-3 h-3" />
                            <span>Failed</span>
                          </span>
                        )}
                        {file.status === 'PENDING' && (
                          <span className="text-[11px] text-[#8a909c]">Queued</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        className="p-1 text-[#8a909c] hover:text-[#ff6b6b] rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {file.status === 'COMPLETED' && (
                    <div className="text-[11px] text-[#8a909c] flex items-center gap-3 pt-1 border-t border-[#1e222b]">
                      <span>Rows: <strong className="text-[#e8eaf0] tabular-nums">{file.rowsRead}</strong></span>
                      <span>·</span>
                      <span>Valid: <strong className="text-[#3ddc97] tabular-nums">{file.vouchersIngested || 0}</strong></span>
                      <span>·</span>
                      <span>Rejected: <strong className={`tabular-nums ${file.rowsRejected ? 'text-[#f5b754]' : 'text-[#e8eaf0]'}`}>{file.rowsRejected || 0}</strong></span>
                    </div>
                  )}

                  {file.failureReason && (
                    <div className="text-[11px] text-[#f5b754]">
                      {file.failureReason}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#262a33] flex items-center justify-between shrink-0 bg-[#161920]">
          <div className="text-xs text-[#8a909c]">
            {completedCount > 0 ? (
              <span className="text-[#3ddc97]">{totalVouchersIngested} vouchers loaded into review queue</span>
            ) : (
              <span>Ready for deterministic parsing</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-[#171a21] border border-[#262a33] text-xs text-[#8a909c] hover:text-[#e8eaf0] transition"
            >
              Close
            </button>

            <button
              type="button"
              disabled={isProcessing || pendingCount === 0}
              onClick={handleRunProcessing}
              className={`px-4 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 ${
                pendingCount > 0 && !isProcessing
                  ? 'bg-[#3ddc97] text-[#0f1115] hover:bg-[#34c787]'
                  : 'bg-[#1e222b] text-[#8a909c] cursor-not-allowed border border-[#262a33]'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Parsing...</span>
                </>
              ) : (
                <span>Start ingestion ({pendingCount})</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
