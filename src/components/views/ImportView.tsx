import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { ClientProfile } from '../../data/clientDatabases';
import { ReviewItem } from '../../data/reviewItems';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus
} from 'lucide-react';
import {
  IngestionFileType,
  IngestionFileItem,
  classifyFile,
  processIngestionFile,
  SAMPLE_INGESTION_FILES
} from '../../engine/ingestion';

interface ImportViewProps {
  client: ClientProfile;
  onIngestVouchers?: (vouchers: ReviewItem[], fileName: string) => void;
  onNavigateToExceptions?: () => void;
}

export const ImportView: React.FC<ImportViewProps> = ({
  client,
  onIngestVouchers,
  onNavigateToExceptions
}) => {
  const [files, setFiles] = useState<IngestionFileItem[]>(() => [...SAMPLE_INGESTION_FILES]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Type Override Handler
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

  // Remove individual file
  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (expandedFileId === id) setExpandedFileId(null);
  };

  // Clear all files
  const handleClearAll = () => {
    setFiles([]);
    setExpandedFileId(null);
  };

  // Add sample files
  const handleAddSampleBatch = () => {
    setFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const freshSamples = SAMPLE_INGESTION_FILES.filter(s => !existingIds.has(s.id));
      if (freshSamples.length > 0) {
        return [...prev, ...freshSamples];
      }
      // Generate a new random synthetic copy
      const suffix = Math.floor(Math.random() * 900 + 100);
      const cloned: IngestionFileItem = {
        ...SAMPLE_INGESTION_FILES[0],
        id: `sample-dup-${Date.now()}`,
        name: `Purchase_Register_Batch_${suffix}.csv`,
        status: 'PENDING',
        progress: 0
      };
      return [...prev, cloned];
    });
  };

  // Handle native file input selection
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

  // Drag and drop handlers
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

  // Run Ingestion Processing
  const handleRunProcessing = () => {
    setIsProcessing(true);

    const pendingOrAttention = files.filter(f => f.status === 'PENDING' || f.status === 'NEEDS_ATTENTION');
    if (pendingOrAttention.length === 0) {
      setIsProcessing(false);
      return;
    }

    // Process each file through the deterministic ingestion engine
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

  // Helper file size formatter
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const completedCount = files.filter(f => f.status === 'COMPLETED').length;
  const needsAttentionCount = files.filter(f => f.status === 'NEEDS_ATTENTION').length;
  const failedCount = files.filter(f => f.status === 'FAILED').length;
  const pendingCount = files.filter(f => f.status === 'PENDING').length;

  const totalRowsRead = files.reduce((acc, f) => acc + (f.rowsRead || 0), 0);
  const totalVouchersIngested = files.reduce((acc, f) => acc + (f.vouchersIngested || 0), 0);
  const totalRowsRejected = files.reduce((acc, f) => acc + (f.rowsRejected || 0), 0);

  return (
    <div className="cockpit-wrap space-y-6">
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept=".csv,.json,.xlsx,.pdf,.txt"
      />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262a33]">
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Import documents</h1>
          <p className="text-xs text-[#8a909c] mt-1">
            Deterministic multi-format parser for {client.name}. Integer paise arithmetic with zero network telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {files.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded bg-[#171a21] border border-[#262a33] text-xs text-[#8a909c] hover:text-[#e8eaf0] transition"
            >
              Clear all
            </button>
          )}

          <button
            type="button"
            onClick={handleAddSampleBatch}
            className="px-3 py-1.5 rounded bg-[#171a21] border border-[#262a33] text-xs text-[#e8eaf0] hover:border-[#3a404c] transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Sample files</span>
          </button>

          <button
            type="button"
            disabled={isProcessing || pendingCount === 0}
            onClick={handleRunProcessing}
            className={`px-3.5 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 ${
              pendingCount > 0 && !isProcessing
                ? 'bg-[#3ddc97] text-[#0f1115] hover:bg-[#34c787]'
                : 'bg-[#1e222b] text-[#8a909c] cursor-not-allowed border border-[#262a33]'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Parsing files...</span>
              </>
            ) : (
              <span>Start ingestion ({pendingCount})</span>
            )}
          </button>
        </div>
      </div>

      {/* Drag & Drop Zone (Flat, solid, Zero AI Slop: no glowing neon gradients) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border border-dashed rounded-lg p-7 text-center transition cursor-pointer ${
          isDragOver
            ? 'border-[#3ddc97] bg-[#1a221f]'
            : 'border-[#262a33] hover:border-[#3ddc97] bg-[#161920]'
        }`}
      >
        <UploadCloud className="w-9 h-9 mx-auto text-[#8a909c] mb-2.5" />
        <h3 className="text-sm font-semibold text-[#e8eaf0] mb-1">
          Drop Indian financial documents here or click to browse
        </h3>
        <p className="text-xs text-[#8a909c] max-w-lg mx-auto">
          Auto-classifies Purchase Registers (.xlsx / .csv), GSTR-2B JSON (official GSTN schema), Bank Statements (HDFC Current Account), and Tax Invoices.
        </p>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-[#161920] border border-[#262a33]">
          <div className="text-xs text-[#8a909c] mb-1">Staging files</div>
          <div className="text-xl font-semibold text-[#e8eaf0] tabular-nums">{files.length}</div>
          <div className="text-[11px] text-[#8a909c] mt-0.5">{pendingCount} pending parse</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#161920] border border-[#262a33]">
          <div className="text-xs text-[#8a909c] mb-1">Rows read</div>
          <div className="text-xl font-semibold text-[#e8eaf0] tabular-nums">{totalRowsRead}</div>
          <div className="text-[11px] text-[#3ddc97] mt-0.5">{totalVouchersIngested} vouchers valid</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#161920] border border-[#262a33]">
          <div className="text-xs text-[#8a909c] mb-1">Rows rejected</div>
          <div className={`text-xl font-semibold tabular-nums ${totalRowsRejected > 0 ? 'text-[#f5b754]' : 'text-[#e8eaf0]'}`}>
            {totalRowsRejected}
          </div>
          <div className="text-[11px] text-[#8a909c] mt-0.5">Strict typed errors</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#161920] border border-[#262a33]">
          <div className="text-xs text-[#8a909c] mb-1">Needs attention</div>
          <div className={`text-xl font-semibold tabular-nums ${needsAttentionCount > 0 ? 'text-[#f5b754]' : 'text-[#3ddc97]'}`}>
            {needsAttentionCount + failedCount}
          </div>
          <div className="text-[11px] text-[#8a909c] mt-0.5">No silent drops</div>
        </div>
      </div>

      {/* Ingestion Table */}
      <div className="border border-[#262a33] rounded-lg overflow-hidden bg-[#12151b]">
        <div className="px-4 py-3 border-b border-[#262a33] bg-[#161920] flex items-center justify-between">
          <span className="text-xs font-medium text-[#e8eaf0]">Document staging table</span>
          <span className="text-xs text-[#8a909c] tabular-nums">{files.length} files in queue</span>
        </div>

        {files.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8a909c]">
            No documents in staging area. Drop files or click Sample files above.
          </div>
        ) : (
          <div className="divide-y divide-[#262a33]">
            {files.map(file => {
              const isExpanded = expandedFileId === file.id;
              const hasRejected = file.rejectedDetails && file.rejectedDetails.length > 0;
              const hasUnmapped = file.unmappedHeaders && file.unmappedHeaders.length > 0;

              return (
                <div key={file.id} className="p-4 space-y-3 hover:bg-[#161920]/60 transition">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Icon, Name, and Metadata */}
                    <div className="flex items-start gap-3 min-w-0">
                      {file.name.endsWith('.csv') || file.name.endsWith('.xlsx') ? (
                        <FileSpreadsheet className="w-5 h-5 text-[#3ddc97] shrink-0 mt-0.5" />
                      ) : (
                        <FileText className="w-5 h-5 text-[#8a909c] shrink-0 mt-0.5" />
                      )}

                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#e8eaf0] truncate">{file.name}</div>
                        <div className="text-xs text-[#8a909c] mt-0.5 flex items-center gap-2">
                          <span className="tabular-nums">{file.sizeFormatted}</span>
                          <span>·</span>
                          <span>Detected: {file.detectedType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Type Override dropdown, Status, and Actions */}
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                      {/* Dropdown to override detected type */}
                      <select
                        value={file.selectedType}
                        onChange={e => handleTypeChange(file.id, e.target.value as IngestionFileType)}
                        className="bg-[#0f1115] border border-[#262a33] text-xs text-[#e8eaf0] rounded px-2.5 py-1.5 focus:outline-none focus:border-[#3ddc97]"
                      >
                        <option value="Purchase Register">Purchase Register</option>
                        <option value="GSTR-2B JSON">GSTR-2B JSON</option>
                        <option value="Bank Statement">Bank Statement</option>
                        <option value="Tax Invoices">Tax Invoices</option>
                        <option value="Unknown">Unknown (Unmapped)</option>
                      </select>

                      {/* Status indicator */}
                      <div className="w-28 text-right">
                        {file.status === 'COMPLETED' && (
                          <span className="text-xs text-[#3ddc97] flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Parsed</span>
                          </span>
                        )}
                        {file.status === 'PROCESSING' && (
                          <span className="text-xs text-[#f5b754] flex items-center gap-1 justify-end">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Processing</span>
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

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        title="Remove file from staging"
                        className="p-1 text-[#8a909c] hover:text-[#ff6b6b] rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Summary row stats when completed or attention */}
                  {file.status !== 'PENDING' && file.rowsRead !== undefined && (
                    <div className="flex flex-wrap items-center justify-between text-xs text-[#8a909c] pt-2 border-t border-[#1e222b]">
                      <div className="flex items-center gap-4">
                        <span>
                          Rows read: <strong className="text-[#e8eaf0] tabular-nums">{file.rowsRead}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Valid vouchers: <strong className="text-[#3ddc97] tabular-nums">{file.vouchersIngested || 0}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Rows rejected:{' '}
                          <strong className={`tabular-nums ${file.rowsRejected ? 'text-[#f5b754]' : 'text-[#e8eaf0]'}`}>
                            {file.rowsRejected || 0}
                          </strong>
                        </span>
                        {hasUnmapped && (
                          <>
                            <span>·</span>
                            <span className="text-[#f5b754]">
                              Unmapped columns: {file.unmappedHeaders?.join(', ')}
                            </span>
                          </>
                        )}
                      </div>

                      {hasRejected && (
                        <button
                          type="button"
                          onClick={() => setExpandedFileId(isExpanded ? null : file.id)}
                          className="text-xs text-[#3ddc97] hover:underline flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Hide rejected details' : 'View rejected rows'}</span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Failure / Attention notice */}
                  {file.failureReason && (
                    <div className="p-2.5 rounded bg-[#1f1914] border border-[#3d2b1f] text-xs text-[#f5b754] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{file.failureReason}</span>
                    </div>
                  )}

                  {/* Expandable Rejected Rows Detail */}
                  {isExpanded && hasRejected && (
                    <div className="mt-2 p-3 rounded bg-[#0f1115] border border-[#262a33] space-y-2 text-xs">
                      <div className="font-medium text-[#e8eaf0]">
                        Rejected rows ({file.rejectedDetails?.length}) — No silent drops
                      </div>
                      <div className="divide-y divide-[#1e222b]">
                        {file.rejectedDetails?.map((detail, idx) => (
                          <div key={idx} className="py-1.5 flex items-start justify-between gap-3">
                            <span className="text-[#8a909c] tabular-nums shrink-0">Row {detail.rowNumber}</span>
                            <span className="text-[#e8eaf0] font-mono text-[11px] shrink-0">[{detail.field}]</span>
                            <span className="text-[#f5b754] flex-1">{detail.reason}</span>
                            {detail.rawValue && (
                              <span className="text-[#8a909c] text-[11px] truncate max-w-[150px]">
                                Raw: &apos;{detail.rawValue}&apos;
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Done notification and CTA to Review Queue */}
      {completedCount > 0 && onNavigateToExceptions && (
        <div className="p-4 rounded-lg bg-[#161920] border border-[#262a33] flex items-center justify-between">
          <div className="text-xs">
            <span className="text-[#e8eaf0] font-medium">Ingestion active:</span>{' '}
            <span className="text-[#8a909c]">
              {totalVouchersIngested} vouchers verified with integer paise and loaded into {client.name} review queue.
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateToExceptions}
            className="px-3 py-1.5 rounded bg-[#3ddc97] text-[#0f1115] text-xs font-medium hover:bg-[#34c787] transition shrink-0"
          >
            Review vouchers →
          </button>
        </div>
      )}
    </div>
  );
};
