import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function PostBody({ children, preview = false }: { children: string; preview?: boolean }) {
  return <div className={`text-sm leading-6 break-words [overflow-wrap:anywhere] [&_p]:whitespace-pre-line [&_p+p]:mt-3 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h4]:text-sm [&_h5]:text-sm [&_h6]:text-sm [&_:is(h1,h2,h3,h4,h5,h6)]:my-3 [&_:is(h1,h2,h3,h4,h5,h6)]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_:is(ul,ol)]:my-2 [&_:is(ul,ol)]:pl-5 [&_blockquote]:my-2 [&_blockquote]:bg-neutral-50 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:text-muted [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:text-xs [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-neutral-100 [&_pre]:p-3 [&_pre_code]:p-0 [&_table]:block [&_table]:overflow-x-auto [&_table]:text-left [&_:is(th,td)]:px-3 [&_:is(th,td)]:py-1 [&_th]:bg-neutral-50 [&_input]:accent-accent [&>:first-child]:mt-0 [&>:last-child]:mb-0 ${preview ? "max-h-12 overflow-hidden" : ""}`}>
    <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
      a: ({ href, children }) => href ? <a href={href} rel="nofollow ugc noopener noreferrer" className="text-accent underline underline-offset-2">{children}</a> : <>{children}</>,
      img: ({ alt }) => <span className="text-muted">{alt || "图片"}</span>,
    }}>{children}</Markdown>
  </div>;
}
