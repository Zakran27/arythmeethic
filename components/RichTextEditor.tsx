'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import { useEffect } from 'react';
import { Box, Button, HStack } from '@chakra-ui/react';
import { FiBold, FiItalic, FiList, FiLink } from 'react-icons/fi';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener' } }),
    ],
    content: value,
    immediatelyRender: false, // évite les soucis d'hydratation SSR (Next.js)
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Synchronise une modification externe de `value` (ex. « charger le modèle par
  // défaut » / « réinitialiser ») vers l'éditeur, sans boucle de mise à jour.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const Btn = ({
    onClick,
    active,
    children,
    label,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    label: string;
  }) => (
    <Button
      size="sm"
      variant={active ? 'solid' : 'ghost'}
      colorScheme={active ? 'brand' : 'gray'}
      onClick={onClick}
      aria-label={label}
      minW="32px"
      px={2}
    >
      {children}
    </Button>
  );

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Adresse du lien (laisser vide pour retirer le lien) :', previous || '');
    if (url === null) return; // annulé
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <Box border="1px solid" borderColor="gray.200" borderRadius="md" bg="white">
      <HStack spacing={1} p={2} borderBottom="1px solid" borderColor="gray.100" flexWrap="wrap">
        <Btn label="Gras" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <FiBold />
        </Btn>
        <Btn label="Italique" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <FiItalic />
        </Btn>
        <Btn
          label="Titre"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          Titre
        </Btn>
        <Btn label="Liste à puces" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <FiList />
        </Btn>
        <Btn label="Liste numérotée" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1.
        </Btn>
        <Btn label="Lien" active={editor.isActive('link')} onClick={setLink}>
          <FiLink />
        </Btn>
      </HStack>
      <Box
        sx={{
          '.ProseMirror': { minHeight: '280px', padding: '12px 16px', outline: 'none', fontSize: '15px', color: '#2d2d2d' },
          '.ProseMirror p': { margin: '0 0 12px 0' },
          '.ProseMirror h2': { fontSize: '20px', fontWeight: 700, margin: '8px 0 12px' },
          '.ProseMirror ul': { listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '12px' },
          '.ProseMirror ol': { listStyleType: 'decimal', paddingLeft: '1.5rem', marginBottom: '12px' },
          '.ProseMirror a': { color: '#2ba1bd', textDecoration: 'underline' },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
