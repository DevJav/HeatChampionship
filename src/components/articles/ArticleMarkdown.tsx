import Link from "next/link";
import Markdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MentionedDriver } from "@/lib/data/articles";
import { cn } from "@/lib/cn";
import { needsOutline } from "@/lib/colors";
import { remarkInterview } from "@/lib/remark-interview";
import { remarkMentions } from "@/lib/remark-mentions";
import { ChequeredStrip, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { t } from "@/i18n";

const linkClass = "font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary";

/** Inline driver chip: a car-color stripe and the name, linking to the profile. */
function Mention({ driver }: { driver: MentionedDriver }) {
  const color = driver.favoriteColor?.hex;
  return (
    <Link
      href={`/pilotos/${driver.username}`}
      className="inline-flex items-baseline gap-1.5 font-display font-bold uppercase italic tracking-wide hover:text-primary hover:underline"
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-[0.85em] w-1 shrink-0 translate-y-[0.05em] -skew-x-12 bg-border-strong",
          color && needsOutline(color) && "ring-1 ring-border-strong",
        )}
        style={color ? { backgroundColor: color } : undefined}
      />
      <span data-driver={driver.username ?? undefined} className="pr-0.5">
        {driver.name}
      </span>
    </Link>
  );
}

/** A red P or a driver-coloured R in the margin, the text lined up beside it (see remark-interview.ts). */
function InterviewRow({ letter, label, color, children }: { letter: string; label: string; color?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
      <span aria-hidden className="font-display text-lg leading-7 font-black text-primary italic" style={color ? { color } : undefined}>
        {letter}
      </span>
      <div className="flex flex-col gap-3 [&_p]:leading-7">
        <span className="sr-only">{label}:</span>
        {children}
      </div>
    </div>
  );
}

/** An interview question: `P: …` */
function InterviewQuestion({ children }: { children: React.ReactNode }) {
  return (
    <InterviewRow letter={t.articles.interview.questionMark} label={t.articles.interview.question}>
      <p className="font-semibold">{children}</p>
    </InterviewRow>
  );
}

/** An interview answer: `R @username: …`, its letter in the driver's car colour. A quote holds several paragraphs. */
function InterviewAnswer({ speaker, block, children }: { speaker: MentionedDriver | undefined; block: boolean; children: React.ReactNode }) {
  return (
    <InterviewRow
      letter={t.articles.interview.answerMark}
      label={speaker?.name ?? t.articles.interview.answer}
      color={speaker?.favoriteColor?.hex ?? "var(--color-fg-muted)"}
    >
      {block ? children : <p>{children}</p>}
    </InterviewRow>
  );
}

/** react-markdown passes its syntax-tree `node` to every component: keep it off the DOM. */
function withoutNode<P extends { node?: unknown }>(props: P): Omit<P, "node"> {
  const { node, ...rest } = props; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

/** Markdown column alignment (`| ---: |`), limited to what table cells support. */
const cellAlign = (align: string | undefined) =>
  align === "left" || align === "center" || align === "right" ? align : undefined;

/** An image on its own line: full width at most, never cropped, caption from its alt text, click for full size. */
function ArticleFigure({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      <a href={src} target="_blank" rel="noopener noreferrer" className="max-w-full" title={t.articles.embeds.fullSize}>
        {/* Any URL the admin pastes, so next/image's allowlist doesn't apply */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="max-h-[40rem] w-auto max-w-full clip-chamfer" />
      </a>
      {alt && <figcaption className="text-center text-sm text-fg-muted italic">{alt}</figcaption>}
    </figure>
  );
}

const speakerOf = (drivers: ReadonlyMap<string, MentionedDriver>, username: unknown) =>
  typeof username === "string" ? drivers.get(username) : undefined;

function components(drivers: ReadonlyMap<string, MentionedDriver>): Components {
  return {
    // A question and its answer in one panel (see remark-interview.ts)
    div: ({ node, ...props }) =>
      node?.properties?.dataInterview === "exchange" ? (
        <div className="flex flex-col gap-3 bg-surface-2 px-4 py-3 clip-chamfer">{props.children}</div>
      ) : (
        <div {...props} />
      ),
    h1: (props) => <h2 className="mt-4 text-3xl" {...withoutNode(props)} />,
    h2: ({ children, ...props }) => (
      <h2 className="mt-4 flex items-center gap-3 text-3xl" {...withoutNode(props)}>
        <span aria-hidden className="h-6 w-2 shrink-0 -skew-x-12 bg-primary" />
        <span>{children}</span>
      </h2>
    ),
    h3: (props) => <h3 className="mt-2 text-2xl" {...withoutNode(props)} />,
    h4: (props) => <h4 className="text-xl" {...withoutNode(props)} />,
    p: ({ node, ...props }) => {
      const role = node?.properties?.dataInterview;
      if (role === "question") return <InterviewQuestion>{props.children}</InterviewQuestion>;
      if (role === "answer") return <InterviewAnswer speaker={speakerOf(drivers, node?.properties?.dataSpeaker)} block={false}>{props.children}</InterviewAnswer>;
      // A paragraph holding just an image (how the editor inserts them) becomes a captioned figure
      const content = node?.children.filter((child) => child.type !== "text" || child.value.trim() !== "") ?? [];
      const [only] = content;
      if (content.length === 1 && only.type === "element" && only.tagName === "img") {
        const src = defaultUrlTransform(String(only.properties.src ?? ""));
        return <ArticleFigure src={src} alt={String(only.properties.alt ?? "")} />;
      }
      return <p className="leading-7" {...props} />;
    },
    a: ({ node, href = "", children, ...props }) => {
      const mention = node?.properties?.dataMention;
      const driver = typeof mention === "string" ? drivers.get(mention) : undefined;
      if (driver) return <Mention driver={driver} />;
      if (href.startsWith("/")) {
        return (
          <Link href={href} className={linkClass}>
            {children}
          </Link>
        );
      }
      const external = /^https?:/.test(href);
      return (
        <a
          href={href}
          className={linkClass}
          {...(external && { target: "_blank", rel: "noopener noreferrer" })}
          {...props}
        >
          {children}
        </a>
      );
    },
    ul: (props) => <ul className="list-disc space-y-1.5 pl-6 marker:text-primary" {...withoutNode(props)} />,
    ol: (props) => (
      <ol className="list-decimal space-y-1.5 pl-6 marker:font-display marker:font-bold marker:text-primary" {...withoutNode(props)} />
    ),
    li: (props) => <li className="pl-1 leading-7" {...withoutNode(props)} />,
    blockquote: ({ node, ...props }) =>
      node?.properties?.dataInterview === "answer" ? (
        <InterviewAnswer speaker={speakerOf(drivers, node.properties.dataSpeaker)} block>
          {props.children}
        </InterviewAnswer>
      ) : (
      <blockquote
        className="flex flex-col gap-2 border-l-4 border-primary bg-surface-2/60 px-5 py-3 text-lg italic text-fg-muted"
        {...props}
      />
    ),
    hr: () => <ChequeredStrip className="my-2 text-fg/15" />,
    // Images in the middle of a sentence; ones on their own line are figures (see p)
    img: ({ alt, ...props }) => (
      // Any URL the admin pastes, so next/image's allowlist doesn't apply
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt ?? ""} loading="lazy" className="inline-block h-auto max-w-full align-middle" {...withoutNode(props)} />
    ),
    code: (props) => <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em]" {...withoutNode(props)} />,
    pre: (props) => (
      <pre
        className="overflow-x-auto border-l-4 border-border-strong bg-surface-2 p-4 font-mono text-sm [&_code]:bg-transparent [&_code]:p-0"
        {...withoutNode(props)}
      />
    ),
    table: (props) => (
      <div className="surface-panel clip-chamfer">
        <Table {...withoutNode(props)} />
      </div>
    ),
    thead: (props) => <THead {...withoutNode(props)} />,
    tbody: (props) => <TBody {...withoutNode(props)} />,
    tr: (props) => <Tr {...withoutNode(props)} />,
    th: ({ align, ...props }) => <Th align={cellAlign(align)} {...withoutNode(props)} />,
    td: ({ align, ...props }) => <Td align={cellAlign(align)} {...withoutNode(props)} />,
  };
}

/** Comments get inline formatting and links only; anything else is reduced to its text. */
const COMMENT_ELEMENTS = ["p", "br", "a", "strong", "em", "del", "code"];

type ArticleMarkdownProps = {
  text: string;
  /** Drivers that can be mentioned, by lowercased username */
  drivers: ReadonlyMap<string, MentionedDriver>;
  variant?: "article" | "comment";
};

/** A Markdown chunk of an article (or a comment), in the site's look. Raw HTML is not rendered. */
export function ArticleMarkdown({ text, drivers, variant = "article" }: ArticleMarkdownProps) {
  const comment = variant === "comment";
  return (
    <div className={comment ? "flex flex-col gap-2 text-sm [&_p]:leading-6" : "flex flex-col gap-4 text-base"}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkInterview, [remarkMentions, { known: new Set(drivers.keys()) }]]}
        components={components(drivers)}
        {...(comment && { allowedElements: COMMENT_ELEMENTS, unwrapDisallowed: true })}
      >
        {/* In a comment box a single Enter means a new line, so make each one a hard break */}
        {comment ? text.replace(/\n/g, "  \n") : text}
      </Markdown>
    </div>
  );
}
