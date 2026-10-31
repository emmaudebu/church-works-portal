import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Heading2,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    LucideIcon,
    Quote,
} from 'lucide-react';

export default function RichTextEditor({
    id,
    value,
    onChange,
}: {
    id: string;
    value: string;
    onChange: (html: string) => void;
}) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                link: { openOnClick: false },
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                id,
                role: 'textbox',
                'aria-multiline': 'true',
                'aria-labelledby': `${id}-label`,
                class: 'rich min-h-48 p-3 focus:outline-none',
            },
        },
        onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    });

    const active = useEditorState({
        editor,
        selector: ({ editor }) => ({
            bold: editor?.isActive('bold'),
            italic: editor?.isActive('italic'),
            heading: editor?.isActive('heading', { level: 2 }),
            bullet: editor?.isActive('bulletList'),
            ordered: editor?.isActive('orderedList'),
            quote: editor?.isActive('blockquote'),
            link: editor?.isActive('link'),
        }),
    });

    const toggleLink = () => {
        if (editor?.isActive('link')) {
            editor.chain().focus().unsetLink().run();

            return;
        }

        const href = window.prompt('Link address');

        if (href) {
            editor?.chain().focus().setLink({ href }).run();
        }
    };

    const tools: {
        label: string;
        icon: LucideIcon;
        pressed?: boolean;
        run: () => void;
    }[] = [
        {
            label: 'Bold',
            icon: Bold,
            pressed: active?.bold,
            run: () => editor?.chain().focus().toggleBold().run(),
        },
        {
            label: 'Italic',
            icon: Italic,
            pressed: active?.italic,
            run: () => editor?.chain().focus().toggleItalic().run(),
        },
        {
            label: 'Heading',
            icon: Heading2,
            pressed: active?.heading,
            run: () =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
            label: 'Bullet list',
            icon: List,
            pressed: active?.bullet,
            run: () => editor?.chain().focus().toggleBulletList().run(),
        },
        {
            label: 'Numbered list',
            icon: ListOrdered,
            pressed: active?.ordered,
            run: () => editor?.chain().focus().toggleOrderedList().run(),
        },
        {
            label: 'Quote',
            icon: Quote,
            pressed: active?.quote,
            run: () => editor?.chain().focus().toggleBlockquote().run(),
        },
        { label: 'Link', icon: LinkIcon, pressed: active?.link, run: toggleLink },
    ];

    return (
        <div className="mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white focus-within:border-primary-700 focus-within:ring-1 focus-within:ring-primary-700">
            <div
                role="toolbar"
                aria-label="Formatting"
                className="flex flex-wrap gap-1 border-b border-neutral-200 p-1"
            >
                {tools.map((tool) => (
                    <button
                        key={tool.label}
                        type="button"
                        aria-label={tool.label}
                        aria-pressed={!!tool.pressed}
                        title={tool.label}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={tool.run}
                        className={`rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${
                            tool.pressed
                                ? 'bg-primary-700 text-white'
                                : 'text-neutral-600 hover:bg-primary-50'
                        }`}
                    >
                        <tool.icon
                            size={20}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                    </button>
                ))}
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}
