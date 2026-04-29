"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { keymap } from "prosemirror-keymap";
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { baseKeymap, setBlockType, toggleMark } from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import * as Y from "yjs";
import { redoCommand, undoCommand, ySyncPlugin, yUndoPlugin } from "y-prosemirror";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { YjsSocketProvider } from "@/lib/yjs-socket-provider";
import { cn } from "@/lib/utils";
import type { DocumentRole, SyncStatus } from "@/types/types";

const nodes = addListNodes(basicSchema.spec.nodes, "paragraph block*", "block");
const editorSchema = new Schema({
  nodes,
  marks: basicSchema.spec.marks,
});

type CollabEditorProps = {
  docId: string;
  title: string;
  token: string;
  role: DocumentRole;
};

export function CollabEditor({ docId, title, token, role }: CollabEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [, setRevision] = useState(0);
  const [status, setStatus] = useState<SyncStatus>("offline");
  const readOnly = role === "viewer";

  useEffect(() => {
    const host = editorRef.current;
    if (!host) {
      return;
    }

    const ydoc = new Y.Doc();
    const provider = new YjsSocketProvider({
      doc: ydoc,
      docId,
      token,
      onStatusChange: setStatus,
    });
    const type = ydoc.getXmlFragment("prosemirror");

    const state = EditorState.create({
      schema: editorSchema,
      plugins: [
        ySyncPlugin(type),
        yUndoPlugin(),
        keymap({
          "Mod-z": undoCommand,
          "Mod-y": redoCommand,
          "Mod-Shift-z": redoCommand,
        }),
        keymap(baseKeymap),
      ],
    });

    const view = new EditorView(host, {
      state,
      editable: () => !readOnly,
      dispatchTransaction(transaction) {
        const nextState = view.state.apply(transaction);
        view.updateState(nextState);
        setRevision(value => value + 1);
      },
      attributes: {
        class:
          "prose-editor min-h-[calc(100vh-16rem)] outline-none text-[15px] leading-7 text-zinc-900",
      },
    });

    viewRef.current = view;
    setRevision(value => value + 1);

    return () => {
      provider.destroy();
      view.destroy();
      ydoc.destroy();
      viewRef.current = null;
    };
  }, [docId, readOnly, token]);

  function commandButton(command: (state: EditorState, dispatch?: EditorView["dispatch"]) => boolean) {
    const view = viewRef.current;
    if (!view || readOnly) {
      return false;
    }
    const ok = command(view.state, view.dispatch);
    view.focus();
    return ok;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-zinc-950">{title}</h1>
          <p className="text-xs text-zinc-500">{role}</p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-zinc-200 bg-white px-4">
        <ToolButton
          label="Bold"
          disabled={readOnly}
          onClick={() => commandButton(toggleMark(editorSchema.marks.strong))}
        >
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Italic"
          disabled={readOnly}
          onClick={() => commandButton(toggleMark(editorSchema.marks.em))}
        >
          <Italic className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          label="Heading 1"
          disabled={readOnly}
          onClick={() => commandButton(setBlockType(editorSchema.nodes.heading, { level: 1 }))}
        >
          <Heading1 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Heading 2"
          disabled={readOnly}
          onClick={() => commandButton(setBlockType(editorSchema.nodes.heading, { level: 2 }))}
        >
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          label="Bulleted list"
          disabled={readOnly}
          onClick={() => commandButton(wrapInList(editorSchema.nodes.bullet_list))}
        >
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          disabled={readOnly}
          onClick={() => commandButton(wrapInList(editorSchema.nodes.ordered_list))}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton label="Undo" disabled={readOnly} onClick={() => commandButton(undoCommand)}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Redo" disabled={readOnly} onClick={() => commandButton(redoCommand)}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-8">
        <div className="mx-auto min-h-[calc(100vh-14rem)] w-full max-w-3xl rounded-sm border border-zinc-200 bg-white px-12 py-10 shadow-sm">
          <div
            ref={editorRef}
            className={cn(readOnly && "cursor-default opacity-95")}
          />
        </div>
      </div>
    </section>
  );
}

function ToolButton({
  label,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      title={label}
      aria-label={label}
      className={cn("h-8 w-8 text-zinc-700", className)}
      {...props}
    />
  );
}

function Divider() {
  return <div className="mx-2 h-5 w-px bg-zinc-200" />;
}
