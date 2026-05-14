"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * TipTap's StarterKit + Link + Image schema only preserves a small set of
 * elements (headings, paragraphs, lists, blockquotes, bold/italic/strike,
 * links, images). Any richer HTML — `<table>`, `<style>`, inline
 * `style="background:..."`, `<center>`, framework class names — gets silently
 * stripped when TipTap parses the input. That's fine for casual composition
 * but disastrous for email templates: the admin pastes a beautifully styled
 * Gmail-friendly template, TipTap eats it, and the recipient gets plain text.
 *
 * This heuristic flags content that the visual editor can't round-trip. When
 * it returns true we open the editor in raw-HTML (code) mode so the template
 * goes through unmangled. The admin can still flip to visual at their own
 * risk via the toolbar button.
 */
function isComplexEmailHtml(html: string): boolean {
  if (!html) return false;
  return (
    /<table\b/i.test(html) ||
    /<style\b/i.test(html) ||
    /<center\b/i.test(html) ||
    /<html\b/i.test(html) ||
    /style\s*=\s*["'][^"']*(background|padding|border|gradient|color)/i.test(html) ||
    /<div\b[^>]*style\s*=/i.test(html) ||
    /<span\b[^>]*style\s*=/i.test(html)
  );
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
  // Start in code mode if the initial content looks like a styled email
  // template — see isComplexEmailHtml. Admin can still toggle to visual.
  const initialMode: "visual" | "code" = isComplexEmailHtml(content) ? "code" : "visual";
  const [mode, setMode] = useState<"visual" | "code">(initialMode);
  const [codeContent, setCodeContent] = useState(content);
  const [autoCodeNotice, setAutoCodeNotice] = useState(initialMode === "code");
  const lastContentRef = useRef(content);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: false }),
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

  // Sync editor content when the content prop changes externally (e.g. template selected).
  // If the incoming content is styled email HTML and we're currently in visual mode,
  // flip to code mode automatically so TipTap doesn't strip the styling on parse.
  useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      lastContentRef.current = content;
      const complex = isComplexEmailHtml(content);
      if (complex && mode === "visual") {
        setMode("code");
        setAutoCodeNotice(true);
        setCodeContent(content);
        // Push the same raw HTML upward so the consumer (compose form) sees
        // the un-stripped value if it reads onChange later.
        onChange(content);
      } else {
        editor.commands.setContent(content);
        setCodeContent(content);
        // Reset the notice when content is no longer complex (template cleared).
        if (!complex) setAutoCodeNotice(false);
      }
    }
  }, [content, editor, mode, onChange]);

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

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        editor.chain().focus().setImage({ src: url }).run();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload image");
      }
    } catch {
      alert("Failed to upload image");
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }, [editor]);

  function switchToCode() {
    if (editor) {
      const html = editor.getHTML();
      setCodeContent(html);
    }
    setMode("code");
  }

  function switchToVisual() {
    // Switching to visual makes TipTap parse the current HTML through its
    // schema and strip anything it doesn't recognize. For styled email
    // templates that means losing tables, inline styles, background colors,
    // etc. — warn the admin before discarding all that.
    if (isComplexEmailHtml(codeContent)) {
      const ok = window.confirm(
        "Switching to the visual editor will strip table layouts, inline styles, and other email-template formatting that the visual editor can't preserve. Continue?"
      );
      if (!ok) return;
    }
    if (editor) {
      lastContentRef.current = codeContent;
      editor.commands.setContent(codeContent);
      onChange(codeContent);
    }
    setMode("visual");
    setAutoCodeNotice(false);
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
            <ToolbarButton
              onClick={() => imageInputRef.current?.click()}
              title="Insert Image"
            >
              {imageUploading ? "..." : "Img"}
            </ToolbarButton>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />
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
      {autoCodeNotice && mode === "code" && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
          </svg>
          <div>
            <p className="font-semibold">Editing as raw HTML to preserve template styling.</p>
            <p>The visual editor would strip tables, inline styles, and email-template layouts. Use the <code className="font-mono">Visual</code> button only if you're rewriting from scratch.</p>
          </div>
        </div>
      )}
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
