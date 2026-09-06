import TextareaAutosize from "react-textarea-autosize";
import { useDeferredValue, useState, type ComponentProps } from "react";
import { PostBody } from "./markdown";

export function MarkdownEditor({
  value,
  className,
  minRows = 3,
  ...props
}: ComponentProps<typeof TextareaAutosize> & { value: string }) {
  const [preview, setPreview] = useState(false);

  const hasMarkdown =
    /(^|\n)\s*(#{1,6}\s|>\s?|[-*+]\s|\d+[.)]\s|```|~~~)|[*_`~]{1,2}\S|\[[^\]]+\]\(|https?:\/\/|\|.+\|/.test(
      value,
    );

  const showingPreview = preview && hasMarkdown;
  const rendered = useDeferredValue(value);

  return (
    <div className="relative min-w-0">
      {hasMarkdown && (
        <div className="flex h-8 items-center justify-end px-3 md:hidden">
          <button
            type="button"
            aria-pressed={showingPreview}
            className="text-xs font-medium text-muted hover:text-accent"
            onClick={() => setPreview(!showingPreview)}
          >
            {showingPreview ? "继续编辑" : "预览"}
          </button>
        </div>
      )}
      <div className={`grid min-w-0 items-stretch ${hasMarkdown ? "md:grid-cols-2" : ""}`}>
        <div className={`min-w-0 ${showingPreview ? "hidden md:block" : ""}`}>
          <TextareaAutosize {...props} value={value} minRows={minRows} className={className} />
        </div>
        {hasMarkdown && (
          <div
            role="region"
            aria-label="Markdown 预览"
            className={`min-w-0 border-t border-neutral-200 px-4 py-3 md:border-t-0 md:border-l ${showingPreview ? "" : "hidden md:block"}`}
          >
            <span className="mb-3 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-muted">
              预览
            </span>
            <PostBody>{rendered}</PostBody>
          </div>
        )}
      </div>
    </div>
  );
}
