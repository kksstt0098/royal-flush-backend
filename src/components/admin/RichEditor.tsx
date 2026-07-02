import { useCallback, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
  Rows,
  Columns,
  Trash,
  Image as ImageIcon,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Highlighter,
  Quote,
  Minus,
} from "lucide-react";

const TEXT_COLORS = [
  "#111827", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff",
];
const HIGHLIGHT_COLORS = [
  "#fef08a", "#bbf7d0", "#bae6fd", "#fbcfe8", "#fecaca",
  "#e9d5ff", "#fed7aa", "#d1d5db",
];

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`h-7 min-w-7 px-1.5 inline-flex items-center justify-center rounded-sm text-xs border border-transparent hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent ${
        active ? "bg-primary/15 text-primary border-primary/30" : ""
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-panel-border mx-1" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  const imgInput = useRef<HTMLInputElement>(null);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please choose an image file");
        return;
      }
      const ext = file.name.split(".").pop() || "png";
      const path = `content/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("promo-banners")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (up.error) return toast.error(up.error.message);
      const signed = await supabase.storage
        .from("promo-banners")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) return toast.error(signed.error.message);
      editor.chain().focus().setImage({ src: signed.data.signedUrl }).run();
    },
    [editor],
  );

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-panel-border bg-muted/30">
      <Btn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="w-3.5 h-3.5" />
      </Btn>
      <Btn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="w-3.5 h-3.5" />
      </Btn>
      <Divider />
      <Btn
        title="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="w-3.5 h-3.5" />
      </Btn>
      <Divider />
      <Btn
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UIcon className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </Btn>
      <Divider />
      <div className="relative group">
        <Btn title="Text color" onClick={() => {}}>
          <span className="inline-flex flex-col items-center leading-none">
            <span className="text-[10px] font-bold">A</span>
            <span className="w-3 h-1 rounded-sm bg-red-500" />
          </span>
        </Btn>
        <div className="hidden group-hover:flex absolute top-full left-0 mt-1 z-10 bg-panel border border-panel-border rounded-sm p-1.5 gap-1 flex-wrap w-40 shadow-md">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => editor.chain().focus().setColor(c).run()}
              className="w-5 h-5 rounded-sm border border-panel-border"
              style={{ background: c }}
            />
          ))}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="text-[10px] px-1 py-0.5 rounded-sm border border-panel-border hover:bg-muted"
          >
            reset
          </button>
        </div>
      </div>
      <div className="relative group">
        <Btn title="Highlight" onClick={() => {}}>
          <Highlighter className="w-3.5 h-3.5" />
        </Btn>
        <div className="hidden group-hover:flex absolute top-full left-0 mt-1 z-10 bg-panel border border-panel-border rounded-sm p-1.5 gap-1 flex-wrap w-40 shadow-md">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
              className="w-5 h-5 rounded-sm border border-panel-border"
              style={{ background: c }}
            />
          ))}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            className="text-[10px] px-1 py-0.5 rounded-sm border border-panel-border hover:bg-muted"
          >
            reset
          </button>
        </div>
      </div>
      <Divider />
      <Btn
        title="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        title="Align center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        title="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="w-3.5 h-3.5" />
      </Btn>
      <Divider />
      <Btn
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        title="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        title="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="w-3.5 h-3.5" />
      </Btn>
      <Divider />
      <Btn title="Link" onClick={setLink} active={editor.isActive("link")}>
        <LinkIcon className="w-3.5 h-3.5" />
      </Btn>
      <Btn title="Insert image" onClick={() => imgInput.current?.click()}>
        <ImageIcon className="w-3.5 h-3.5" />
      </Btn>
      <input
        ref={imgInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadImage(f);
          e.target.value = "";
        }}
      />
      <Divider />
      <Btn
        title="Insert table"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <TableIcon className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        title="Add row"
        disabled={!editor.can().addRowAfter()}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        <Rows className="w-3.5 h-3.5" />+
      </Btn>
      <Btn
        title="Delete row"
        disabled={!editor.can().deleteRow()}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        <Rows className="w-3.5 h-3.5" />-
      </Btn>
      <Btn
        title="Add column"
        disabled={!editor.can().addColumnAfter()}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        <Columns className="w-3.5 h-3.5" />+
      </Btn>
      <Btn
        title="Delete column"
        disabled={!editor.can().deleteColumn()}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        <Columns className="w-3.5 h-3.5" />-
      </Btn>
      <Btn
        title="Toggle header row"
        disabled={!editor.can().toggleHeaderRow()}
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      >
        H
      </Btn>
      <Btn
        title="Delete table"
        disabled={!editor.can().deleteTable()}
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        <Trash className="w-3.5 h-3.5" />
      </Btn>
    </div>
  );
}

export function RichEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[280px] p-3 focus:outline-none dark:prose-invert",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-panel-border rounded-sm bg-background rich-editor">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}