import { FileArchive, FileText, UploadCloud } from "lucide-react";
import { useRef } from "react";

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  error?: string | null;
  disabled?: boolean;
}

export default function UploadDropzone({ onFilesSelected, error, disabled = false }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="lux-card rounded-3xl p-6 md:p-8">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept=".txt,.md,.pdf,.docx,.pptx,.xlsx,.csv,.json,.html,.htm,.rtf,.xml,.log"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) onFilesSelected(files);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const files = Array.from(event.dataTransfer.files ?? []);
          if (files.length > 0) onFilesSelected(files);
        }}
        className="group flex min-h-[320px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--accent-border)] bg-[var(--input-bg)] p-8 text-center transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] hover:shadow-[0_0_42px_var(--glow-accent)]"
      >
        <span className="grid h-20 w-20 place-items-center rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--accent)] shadow-[0_0_36px_var(--glow-accent)] transition group-hover:scale-105">
          <UploadCloud className="h-9 w-9" />
        </span>
        <span className="mt-7 text-2xl font-semibold text-[var(--text-primary)]">拖拽一批资料到这里，或点击批量上传</span>
        <span className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
          支持一次选择多个 TXT、MD、PDF、DOCX、PPTX、XLSX、CSV、JSON、HTML 等资料。系统会按顺序解析、分析并写入知识星图。
        </span>
        <span className="mt-7 flex flex-wrap justify-center gap-3">
          {[
            ["文本 / 表格", FileText],
            ["PDF / Office", FileArchive],
          ].map(([label, Icon]) => {
            const TypedIcon = Icon as typeof FileText;
            return (
              <span key={String(label)} className="status-pill border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-secondary)]">
                <TypedIcon className="h-4 w-4 text-[var(--accent)]" />
                {label as string}
              </span>
            );
          })}
        </span>
      </button>
      {error && (
        <p className="mt-4 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning)]">
          {error}
        </p>
      )}
    </div>
  );
}
