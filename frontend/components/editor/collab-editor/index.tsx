"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import * as Y from "yjs";
import { redoCommand, undoCommand, yCursorPlugin, ySyncPlugin, yUndoPlugin } from "y-prosemirror";
import { editorSchema } from "@/components/editor/collab-editor/schema";
import { PAGE_METRICS, type PageLayout, type PageStats } from "@/components/editor/collab-editor/constants";
import { buildCursor, presenceColor } from "@/components/editor/collab-editor/cursor";
import { EditorToolbar } from "@/components/editor/collab-editor/toolbar";
import { PageIndicator } from "@/components/editor/collab-editor/page-indicator";
import { YjsSocketProvider } from "@/lib/realtime/yjs-socket-provider";
import { cn } from "@/lib/utils";
import type { DocumentRole, SyncStatus, User, UserPresence } from "@/types";

type CollabEditorProps = {
  docId: string;
  token: string;
  role: DocumentRole;
  currentUser: User;
};

export function CollabEditor({ docId, token, role, currentUser }: CollabEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const pageLayoutRef = useRef<PageLayout>("a4");
  const [, setRevision] = useState(0);
  const [status, setStatus] = useState<SyncStatus>("offline");
  const [pageLayout, setPageLayout] = useState<PageLayout>("a4");
  const [pageStats, setPageStats] = useState<PageStats>({ current: 1, total: 1 });
  const [remotePresence, setRemotePresence] = useState<UserPresence[]>([]);
  const readOnly = role === "viewer";

  useEffect(() => {
    pageLayoutRef.current = pageLayout;
  }, [pageLayout]);

  const updatePageStats = useCallback(() => {
    const scrollHost = scrollRef.current;
    const editorHost = editorRef.current?.querySelector(
      ".ProseMirror"
    ) as HTMLElement | null;
    if (!scrollHost || !editorHost) return;

    const pageHeight = PAGE_METRICS[pageLayoutRef.current].height;
    const total = Math.max(1, Math.ceil(editorHost.scrollHeight / pageHeight));
    const editorTop = editorHost.getBoundingClientRect().top;
    const scrollTop = scrollHost.getBoundingClientRect().top;
    const visibleOffset = Math.max(0, scrollTop - editorTop);
    const current = Math.min(
      total,
      Math.max(1, Math.floor(visibleOffset / pageHeight) + 1)
    );
    setPageStats((previous) =>
      previous.current === current && previous.total === total
        ? previous
        : { current, total }
    );
  }, []);

  useEffect(() => {
    const host = editorRef.current;
    if (!host) return;

    let mounted = true;
    const ydoc = new Y.Doc();
    const provider = new YjsSocketProvider({
      doc: ydoc,
      docId,
      token,
      onStatusChange: setStatus,
    });
    provider.setLocalPresence({
      id: currentUser.id,
      name: currentUser.display_name || currentUser.email,
      color: presenceColor(currentUser.id),
    });
    const updatePresence = () => {
      setRemotePresence(Array.from(provider.getRemotePresence().values()));
    };
    provider.awareness.on("change", updatePresence);
    const type = ydoc.getXmlFragment("prosemirror");

    const state = EditorState.create({
      schema: editorSchema,
      plugins: [
        ySyncPlugin(type),
        yCursorPlugin(provider.awareness, {
          cursorBuilder: (user) => buildCursor(user as UserPresence),
        }),
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
      dispatchTransaction(this: EditorView, transaction: Transaction) {
        if (!mounted || this.isDestroyed || !this.dom.parentNode) return;
        const nextState = this.state.apply(transaction);
        this.updateState(nextState);
        if (mounted) {
          setRevision((value) => value + 1);
          window.requestAnimationFrame(updatePageStats);
        }
      },
      attributes: {
        class: cn(
          "prose-editor outline-none text-[15px] leading-relaxed transition-all duration-300"
        ),
      },
    });

    viewRef.current = view;
    setRevision((value) => value + 1);
    updatePageStats();

    const resizeObserver = new ResizeObserver(updatePageStats);
    resizeObserver.observe(view.dom);

    return () => {
      mounted = false;
      resizeObserver.disconnect();
      provider.awareness.off("change", updatePresence);
      view.destroy();
      provider.destroy();
      ydoc.destroy();
      viewRef.current = null;
    };
  }, [currentUser, docId, readOnly, token, updatePageStats]);

  useEffect(() => {
    updatePageStats();
  }, [pageLayout, updatePageStats]);

  function commandButton(
    command: (state: EditorState, dispatch?: EditorView["dispatch"]) => boolean
  ) {
    const view = viewRef.current;
    if (!view || readOnly) return false;
    const ok = command(view.state, view.dispatch);
    view.focus();
    return ok;
  }

  function insertHorizontalRule() {
    const view = viewRef.current;
    if (!view || readOnly) return;
    const rule = editorSchema.nodes.horizontal_rule.create();
    view.dispatch(view.state.tr.replaceSelectionWith(rule).scrollIntoView());
    view.focus();
  }

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      style={{ background: "var(--cream)" }}
    >
      <EditorToolbar
        readOnly={readOnly}
        pageLayout={pageLayout}
        onPageLayoutChange={setPageLayout}
        onCommand={commandButton}
        onInsertHorizontalRule={insertHorizontalRule}
        remotePresence={remotePresence}
        status={status}
      />

      <div
        ref={scrollRef}
        onScroll={updatePageStats}
        className="relative min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain"
        style={{ background: "#E8E4DC" }}
      >
        <PageIndicator pageLayout={pageLayout} pageStats={pageStats} />

        <div
          className={cn(
            "lattice-pages mx-auto w-full",
            pageLayout === "a4" ? "page-a4" : "page-standard"
          )}
        >
          <div
            ref={editorRef}
            className={cn(readOnly && "cursor-default opacity-95")}
            style={{
              "--document-height": `${
                PAGE_METRICS[pageLayout].height * pageStats.total
              }px`,
            } as React.CSSProperties}
          />
        </div>
      </div>
    </section>
  );
}
