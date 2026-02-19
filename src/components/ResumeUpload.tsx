import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { extractTextFromPDF } from '@/lib/pdfExtractor';

interface ResumeUploadProps {
  onTextExtracted: (text: string, fileName?: string) => void;
  resumeText: string;
  fileName?: string;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({ onTextExtracted, resumeText, fileName }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>(resumeText ? 'paste' : 'upload');

  const handleFile = useCallback(async (file: File) => {
    setError('');
    if (file.type === 'application/pdf') {
      setIsExtracting(true);
      try {
        const text = await extractTextFromPDF(file);
        onTextExtracted(text, file.name);
        setActiveTab('paste');
      } catch {
        setError('Failed to extract PDF text. Try pasting manually.');
      } finally {
        setIsExtracting(false);
      }
    } else if (file.type === 'text/plain') {
      const text = await file.text();
      onTextExtracted(text, file.name);
      setActiveTab('paste');
    } else {
      setError('Please upload a PDF or TXT file.');
    }
  }, [onTextExtracted]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'upload'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => setActiveTab('paste')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'paste'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Paste Text
        </button>
      </div>

      {activeTab === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : fileName
              ? 'border-primary/40 bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-muted/50'
          }`}
          onClick={() => document.getElementById('resume-file-input')?.click()}
        >
          <input
            id="resume-file-input"
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={handleFileInput}
          />
          {isExtracting ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Extracting text from PDF...</p>
            </div>
          ) : fileName ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="w-10 h-10 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">Click to replace</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Drop your resume here</p>
                <p className="text-xs text-muted-foreground mt-1">PDF or TXT • Click to browse</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'paste' && (
        <div className="relative">
          <textarea
            value={resumeText}
            onChange={(e) => onTextExtracted(e.target.value)}
            placeholder="Paste your resume text here..."
            className="w-full h-48 px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono"
          />
          {resumeText && (
            <button
              onClick={() => onTextExtracted('', undefined)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2 mt-2">
            <FileText className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {resumeText ? `${resumeText.split(/\s+/).filter(Boolean).length} words` : 'Supports any plain text resume format'}
            </span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
};
