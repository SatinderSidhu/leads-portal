"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 text-sm rounded transition ${
        active
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
}: RichTextEditorProps) {
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [codeContent, setCodeContent] = useState(content);
  const lastContentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastContentRef.current = html;
      onChange(html);
    },
  });

  // Sync editor content when the content prop changes externally (e.g. template selected)
  useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      lastContentRef.current = content;
      editor.commands.setContent(content);
      setCodeContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  function switchToCode() {
    if (editor) {
      const html = editor.getHTML();
      setCodeContent(html);
    }
    setMode("code");
  }

  function switchToVisual() {
    if (editor) {
      lastContentRef.current = codeContent;
      editor.commands.setContent(codeContent);
      onChange(codeContent);
    }
    setMode("visual");
  }

  function handleCodeChange(value: string) {
    setCodeContent(value);
    onChange(value);
  }

  if (!editor) return null;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        {mode === "visual" && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Bold"
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italic"
            >
              <em>I</em>
            </ToolbarButton>
            <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1 h-5" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              H3
            </ToolbarButton>
            <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1 h-5" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              title="Bullet List"
            >
              &#8226; List
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              title="Ordered List"
            >
              1. List
            </ToolbarButton>
            <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1 h-5" />
            <ToolbarButton
              onClick={setLink}
              active={editor.isActive("link")}
              title="Link"
            >
              Link
            </ToolbarButton>
            <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1 h-5" />
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              title="Undo"
            >
              Undo
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              title="Redo"
            >
              Redo
            </ToolbarButton>
          </>
        )}
        {mode === "code" && (
          <span className="text-xs text-gray-500 dark:text-gray-400 px-1">HTML Source</span>
        )}
        <div className="ml-auto">
          <ToolbarButton
            onClick={mode === "visual" ? switchToCode : switchToVisual}
            active={mode === "code"}
            title={mode === "visual" ? "Switch to HTML source" : "Switch to visual editor"}
          >
            {mode === "visual" ? "</>" : "Visual"}
          </ToolbarButton>
        </div>
      </div>
      {mode === "visual" ? (
        <EditorContent
          editor={editor}
          className="tiptap-editor bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      ) : (
        <textarea
          value={codeContent}
          onChange={(e) => handleCodeChange(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[200px] p-4 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none resize-y"
          placeholder="Enter HTML..."
        />
      )}
    </div>
  );
}
