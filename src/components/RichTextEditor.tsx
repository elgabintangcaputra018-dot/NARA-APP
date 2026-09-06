"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Minus,
} from "lucide-react";

interface RichTextEditorProps {
  content: Record<string, unknown> | null | undefined;
  onChange: (json: Record<string, unknown>) => void;
  placeholder?: string;
  editable?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Tulis materi catatan OSN di sini...",
  editable = true,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: content || { type: "doc", content: [] },
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[420px] focus:outline-hidden p-5 sm:p-7 text-zinc-800 dark:text-zinc-100",
      },
    },
  });

  // Sync content if changed externally (e.g. initial load)
  useEffect(() => {
    if (editor && content && !editor.isFocused) {
      const currentJson = JSON.stringify(editor.getJSON());
      const nextJson = JSON.stringify(content);
      if (currentJson !== nextJson) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="min-h-[420px] p-6 flex items-center justify-center text-xs text-zinc-400">
        Menyiapkan Editor Catatan...
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Sticky Formatting Toolbar */}
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-300 select-none sticky top-0 z-10 backdrop-blur-xs">
          {/* Bold */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              editor.isActive("bold")
                ? "bg-accent-navy text-white shadow-xs"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Tebal (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              editor.isActive("italic")
                ? "bg-accent-navy text-white shadow-xs"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Miring (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>

          {/* Strike */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              editor.isActive("strike")
                ? "bg-accent-navy text-white shadow-xs"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Coret"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-zinc-300 dark:bg-zinc-700 mx-1" />

          {/* Heading 1 */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 ${
              editor.isActive("heading", { level: 1 })
                ? "bg-accent-navy text-white shadow-xs"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>

          {/* Heading 2 */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 ${
              editor.isActive("heading", { level: 2 })
                ? "bg-accent-navy text-white shadow-xs"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          {/* Heading 3 */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 ${
              editor.isActive("heading", { level: 3 })
                ? "bg-accent-navy text-white shadow-xs"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-zinc-300 dark:bg-zinc-700 mx-1" />

          {/* Bullet List */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              editor.isActive("bulletList")
                ? "bg-accent-navy text-white shadow-xs"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Daftar Poin (Bullet List)"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Numbered List */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              editor.isActive("orderedList")
                ? "bg-accent-navy text-white shadow-xs"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Daftar Angka (Numbered List)"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          {/* Blockquote */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              editor.isActive("blockquote")
                ? "bg-accent-navy text-white shadow-xs"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Kutipan (Blockquote)"
          >
            <Quote className="w-4 h-4" />
          </button>

          {/* Code Block */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              editor.isActive("codeBlock")
                ? "bg-accent-navy text-white shadow-xs"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Blok Kode / Rumus"
          >
            <Code className="w-4 h-4" />
          </button>

          {/* Horizontal Rule */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded-lg text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title="Garis Pemisah"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="ml-auto flex items-center gap-1">
            {/* Undo */}
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-1.5 rounded-lg text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
              title="Urungkan (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>

            {/* Redo */}
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-1.5 rounded-lg text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
              title="Ulangi (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 cursor-text bg-white dark:bg-zinc-900">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: "${placeholder}";
          float: left;
          color: #a1a1aa;
          pointer-events: none;
          height: 0;
        }
        .tiptap blockquote {
          border-left: 3px solid #6b95f1;
          padding-left: 1rem;
          margin-left: 0;
          margin-right: 0;
          font-style: italic;
          color: #64748b;
        }
        .tiptap ul {
          list-style-type: disc;
          padding-left: 1.5rem;
        }
        .tiptap ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
        }
        .tiptap code {
          background-color: rgba(107, 149, 241, 0.1);
          color: #3b82f6;
          padding: 0.15rem 0.3rem;
          border-radius: 0.25rem;
          font-family: monospace;
        }
        .tiptap pre {
          background: #18181b;
          color: #f4f4f5;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-family: monospace;
          margin: 0.5rem 0;
        }
        .tiptap hr {
          border: none;
          border-top: 1px solid #e4e4e7;
          margin: 1.5rem 0;
        }
        .dark .tiptap hr {
          border-top: 1px solid #27272a;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
