import type React from "react";
import {
  Bold,
  Code2,
  Eraser,
  File,
  Heading1,
  Heading2,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Minus,
  Monitor,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { liftListItem, sinkListItem, wrapInList } from "prosemirror-schema-list";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { redoCommand, undoCommand } from "y-prosemirror";
import { StatusPill } from "@/components/ui/status-pill";
import type { SyncStatus, UserPresence } from "@/types";
import { PresenceStrip } from "@/components/editor/collab-editor/presence-strip";
import { PAGE_METRICS, type PageLayout } from "@/components/editor/collab-editor/constants";
import { editorSchema } from "@/components/editor/collab-editor/schema";
import { cn } from "@/lib/utils";

export type EditorCommand = (
  state: EditorState,
  dispatch?: EditorView["dispatch"]
) => boolean;

function clearFormattingCommand(state: EditorState, dispatch?: EditorView["dispatch"]) {
  const { from, to, empty } = state.selection;
  if (!dispatch) {
    return true;
  }

  let tr = state.tr;
  if (empty) {
    // Remove any stored marks so the next typed text is unformatted.
    dispatch(tr.setStoredMarks([]));
    return true;
  }

  // Remove all marks from the current selection.
  tr = tr.removeMark(from, to);
  // Also clear stored marks so formatting doesn't re-apply after selection changes.
  tr = tr.setStoredMarks([]);
  dispatch(tr.scrollIntoView());
  return true;
}

export function EditorToolbar({
  readOnly,
  pageLayout,
  onPageLayoutChange,
  onCommand,
  onInsertHorizontalRule,
  remotePresence,
  status,
}: {
  readOnly: boolean;
  pageLayout: PageLayout;
  onPageLayoutChange: (layout: PageLayout) => void;
  onCommand: (command: EditorCommand) => void;
  onInsertHorizontalRule: () => void;
  remotePresence: UserPresence[];
  status: SyncStatus;
}) {
  return (
    <div
      className="relative z-10 flex min-h-11 shrink-0 flex-col items-stretch gap-1.5 px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-4"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        <ToolButton
          label="Bold"
          disabled={readOnly}
          onClick={() => onCommand(toggleMark(editorSchema.marks.strong))}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Italic"
          disabled={readOnly}
          onClick={() => onCommand(toggleMark(editorSchema.marks.em))}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Underline"
          disabled={readOnly}
          onClick={() => onCommand(toggleMark(editorSchema.marks.underline))}
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Strikethrough"
          disabled={readOnly}
          onClick={() => onCommand(toggleMark(editorSchema.marks.strike))}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Inline code"
          disabled={readOnly}
          onClick={() => onCommand(toggleMark(editorSchema.marks.code))}
        >
          <Code2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Clear formatting"
          disabled={readOnly}
          onClick={() => onCommand(clearFormattingCommand)}
        >
          <Eraser className="h-3.5 w-3.5" />
        </ToolButton>
        <Divider />
        <ToolButton
          label="Paragraph"
          disabled={readOnly}
          onClick={() => onCommand(setBlockType(editorSchema.nodes.paragraph))}
        >
          <Pilcrow className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Heading 1"
          disabled={readOnly}
          onClick={() =>
            onCommand(setBlockType(editorSchema.nodes.heading, { level: 1 }))
          }
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Heading 2"
          disabled={readOnly}
          onClick={() =>
            onCommand(setBlockType(editorSchema.nodes.heading, { level: 2 }))
          }
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Quote"
          disabled={readOnly}
          onClick={() => onCommand(wrapIn(editorSchema.nodes.blockquote))}
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Code block"
          disabled={readOnly}
          onClick={() => onCommand(setBlockType(editorSchema.nodes.code_block))}
        >
          <Code2 className="h-3.5 w-3.5" />
        </ToolButton>
        <Divider />
        <ToolButton
          label="Bulleted list"
          disabled={readOnly}
          onClick={() => onCommand(wrapInList(editorSchema.nodes.bullet_list))}
        >
          <List className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          disabled={readOnly}
          onClick={() => onCommand(wrapInList(editorSchema.nodes.ordered_list))}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Indent"
          disabled={readOnly}
          onClick={() => onCommand(sinkListItem(editorSchema.nodes.list_item))}
        >
          <IndentIncrease className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Outdent"
          disabled={readOnly}
          onClick={() => onCommand(liftListItem(editorSchema.nodes.list_item))}
        >
          <IndentDecrease className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Divider"
          disabled={readOnly}
          onClick={onInsertHorizontalRule}
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolButton>
        <Divider />
        <ToolButton
          label="Undo"
          disabled={readOnly}
          onClick={() => onCommand(undoCommand)}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Redo"
          disabled={readOnly}
          onClick={() => onCommand(redoCommand)}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolButton>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-end sm:gap-3">
        <div className="min-w-0 overflow-hidden">
          <PresenceStrip users={remotePresence} />
        </div>
        <div
          className="flex shrink-0 items-center overflow-hidden rounded-sm"
          style={{ border: "1px solid var(--border)" }}
        >
          {(["standard", "a4"] as PageLayout[]).map((layout) => (
            <button
              key={layout}
              onClick={() => onPageLayoutChange(layout)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-all min-[420px]:px-2.5"
              style={{
                background: pageLayout === layout ? "var(--ink)" : "transparent",
                color: pageLayout === layout ? "var(--cream)" : "var(--ink-muted)",
                borderRight: layout === "standard" ? "1px solid var(--border)" : undefined,
              }}
            >
              {layout === "standard" ? (
                <Monitor className="h-3 w-3" />
              ) : (
                <File className="h-3 w-3" />
              )}
              <span className="hidden min-[420px]:inline">
                {PAGE_METRICS[layout].label}
              </span>
            </button>
          ))}
        </div>
        <StatusPill status={status} />
      </div>
    </div>
  );
}

function ToolButton({
  label,
  className,
  onMouseDown,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown?.(event);
      }}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors sm:h-7 sm:w-7",
        className
      )}
      style={{
        color: props.disabled ? "var(--ink-faint)" : "var(--ink-muted)",
        background: "transparent",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (!props.disabled) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--cream-dark)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-muted)";
      }}
      {...props}
    />
  );
}

function Divider() {
  return <div className="mx-1 h-4 w-px shrink-0" style={{ background: "var(--border)" }} />;
}
