import type { ReactNode } from "react";
import { type DocNode, isDocNode, safeHref } from "@/lib/content";

// Renders stored editor JSON with an allow-list of nodes and marks. Output is
// built from React elements (text is escaped by React), so stored content can
// never inject markup or script. Unknown nodes render their children only.

function renderMarks(text: string, marks: DocNode["marks"] = []): ReactNode {
  return marks.reduce<ReactNode>((child, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{child}</strong>;
      case "italic":
        return <em>{child}</em>;
      case "underline":
        return <u>{child}</u>;
      case "strike":
        return <s>{child}</s>;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        return href ? (
          <a href={href} rel="noopener noreferrer nofollow ugc" target="_blank">
            {child}
          </a>
        ) : (
          child
        );
      }
      default:
        return child;
    }
  }, text);
}

function renderNode(node: DocNode, key: number | string): ReactNode {
  const children = node.content?.map((child, i) => renderNode(child, i));
  switch (node.type) {
    case "text":
      return <span key={key}>{renderMarks(node.text ?? "", node.marks)}</span>;
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading":
      // Shifted down one level: the page title is the reading view's <h1>.
      return node.attrs?.level === 1 ? (
        <h2 key={key} className="heading-1">
          {children}
        </h2>
      ) : (
        <h3 key={key}>{children}</h3>
      );
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList": {
      const start = Number(node.attrs?.start);
      return (
        <ol key={key} start={Number.isInteger(start) && start > 1 ? start : undefined}>
          {children}
        </ol>
      );
    }
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    default:
      return children ? <div key={key}>{children}</div> : null;
  }
}

export function EntryBody({ doc, className = "" }: { doc: unknown; className?: string }) {
  if (!isDocNode(doc)) return null;
  return <div className={`prose-ink ${className}`}>{doc.content?.map((node, i) => renderNode(node, i))}</div>;
}
