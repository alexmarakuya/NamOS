import React, { useState, useRef } from 'react';

interface NotionStyleEditorProps {
  content: string;
  onChange: (content: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}

interface SlashCommand {
  label: string;
  description: string;
  action: () => void;
  icon: string;
}

const NotionStyleEditor: React.FC<NotionStyleEditorProps> = ({
  content,
  onChange,
  onBlur,
  placeholder = "Write something..."
}) => {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  // const [cursorPosition, setCursorPosition] = useState(0);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const slashCommands: SlashCommand[] = [
    {
      label: 'Heading 1',
      description: 'Big section heading',
      icon: 'H1',
      action: () => insertFormatting('# ', '')
    },
    {
      label: 'Heading 2',
      description: 'Medium section heading',
      icon: 'H2',
      action: () => insertFormatting('## ', '')
    },
    {
      label: 'Heading 3',
      description: 'Small section heading',
      icon: 'H3',
      action: () => insertFormatting('### ', '')
    },
    {
      label: 'Bold',
      description: 'Make text bold',
      icon: 'B',
      action: () => insertFormatting('**', '**')
    },
    {
      label: 'Italic',
      description: 'Make text italic',
      icon: 'I',
      action: () => insertFormatting('*', '*')
    },
    {
      label: 'Bullet List',
      description: 'Create a bulleted list',
      icon: '•',
      action: () => insertFormatting('- ', '')
    },
    {
      label: 'Numbered List',
      description: 'Create a numbered list',
      icon: '1.',
      action: () => insertFormatting('1. ', '')
    },
    {
      label: 'Quote',
      description: 'Create a quote block',
      icon: '"',
      action: () => insertFormatting('> ', '')
    },
    {
      label: 'Code',
      description: 'Inline code',
      icon: '</>',
      action: () => insertFormatting('`', '`')
    },
    {
      label: 'Divider',
      description: 'Add a horizontal line',
      icon: '—',
      action: () => insertFormatting('\n---\n', '')
    }
  ];

  const filteredCommands = slashCommands.filter(cmd =>
    cmd.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const insertFormatting = (before: string, after: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    // Find the slash position
    const textBeforeSelection = content.substring(0, start);
    const slashIndex = textBeforeSelection.lastIndexOf('/' + searchTerm);
    
    let newContent: string;
    let newCursorPos: number;
    
    if (slashIndex !== -1) {
      // Replace the slash command with formatting
      const beforeSlash = content.substring(0, slashIndex);
      const afterSlash = content.substring(start);
      newContent = beforeSlash + before + selectedText + after + afterSlash;
      newCursorPos = slashIndex + before.length + selectedText.length;
    } else {
      // Insert at current position
      const beforeCursor = content.substring(0, start);
      const afterCursor = content.substring(end);
      newContent = beforeCursor + before + selectedText + after + afterCursor;
      newCursorPos = start + before.length + selectedText.length;
    }
    
    onChange(newContent);
    setShowSlashMenu(false);
    setSearchTerm('');
    
    // Set cursor position after state update
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        setSearchTerm('');
        return;
      }
      if (e.key === 'Enter' && filteredCommands.length > 0) {
        e.preventDefault();
        filteredCommands[0].action();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        return;
      }
    }

    if (e.key === '/') {
      // Show slash menu
      setTimeout(() => {
        const textarea = e.target as HTMLTextAreaElement;
        const rect = textarea.getBoundingClientRect();
        const cursorPos = textarea.selectionStart;
        
        // Calculate approximate position based on cursor
        const lineHeight = 24; // Approximate line height
        const lines = textarea.value.substring(0, cursorPos).split('\n').length;
        const yOffset = (lines - 1) * lineHeight;
        
        setSlashMenuPosition({ 
          x: rect.left + 20, 
          y: rect.top + yOffset + 30 
        });
        setShowSlashMenu(true);
        setSearchTerm('');
      }, 0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newContent);

    // Check if we're typing after a slash
    if (showSlashMenu) {
      const textBeforeCursor = newContent.substring(0, cursorPos);
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
      
      if (lastSlashIndex !== -1) {
        const searchText = textBeforeCursor.substring(lastSlashIndex + 1);
        setSearchTerm(searchText);
      } else {
        setShowSlashMenu(false);
        setSearchTerm('');
      }
    }
  };

  const renderFormattedContent = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Handle headings
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-semibold text-gray-900 font-dm-sans mt-4 mb-2">{line.substring(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-gray-900 font-dm-sans mt-4 mb-2">{line.substring(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold text-gray-900 font-dm-sans mt-4 mb-3">{line.substring(2)}</h1>;
      }
      
      // Handle lists
      if (line.startsWith('- ')) {
        return <li key={index} className="text-gray-700 font-dm-sans ml-4 list-disc">{line.substring(2)}</li>;
      }
      if (line.match(/^\d+\. /)) {
        return <li key={index} className="text-gray-700 font-dm-sans ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
      }
      
      // Handle quotes
      if (line.startsWith('> ')) {
        return <blockquote key={index} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 font-dm-sans my-2">{line.substring(2)}</blockquote>;
      }
      
      // Handle dividers
      if (line.trim() === '---') {
        return <hr key={index} className="border-gray-300 my-4" />;
      }
      
      // Handle regular text with inline formatting
      let formattedLine = line;
      
      // Bold text
      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      
      // Italic text
      formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
      
      // Inline code
      formattedLine = formattedLine.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
      
      if (line.trim() === '') {
        return <br key={index} />;
      }
      
      return (
        <p 
          key={index} 
          className="text-gray-700 font-dm-sans leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  return (
    <div className="relative">
      {/* Editor */}
      {isEditing ? (
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setIsEditing(false);
            onBlur?.();
          }}
          className="min-h-[200px] w-full p-4 border-0 focus:outline-none bg-transparent text-gray-700 font-dm-sans text-base leading-relaxed resize-none"
          placeholder={placeholder}
          autoFocus
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="min-h-[200px] w-full p-4 cursor-text"
        >
          {content ? (
            <div>{renderFormattedContent(content)}</div>
          ) : (
            <div className="text-gray-400 font-dm-sans">{placeholder}</div>
          )}
        </div>
      )}

      {/* Slash Command Menu */}
      {showSlashMenu && (
        <div
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[280px] max-h-[300px] overflow-y-auto"
          style={{ left: slashMenuPosition.x, top: slashMenuPosition.y }}
        >
          {filteredCommands.length > 0 ? (
            filteredCommands.map((command, index) => (
              <button
                key={command.label}
                onClick={() => command.action()}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                  index === 0 ? 'bg-gray-50' : ''
                }`}
              >
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs font-bold text-gray-600">
                  {command.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 font-dm-sans">{command.label}</div>
                  <div className="text-xs text-gray-500 font-dm-sans">{command.description}</div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 font-dm-sans">No commands found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotionStyleEditor;
