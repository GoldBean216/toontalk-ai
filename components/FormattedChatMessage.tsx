import React, { useState } from 'react';
import { Copy, Check, Image as ImageIcon, Loader2 } from 'lucide-react';

interface FormattedChatMessageProps {
    text: string;
    inlineLinksOnly?: boolean;
    onOpenArtifact?: (artifact: { id: string; title: string; type: 'code' | 'image' | 'document'; content: string; language?: string }) => void;
    msgId?: string;
    onLinkClick?: (type: string, data: any) => void;
    isTranslated?: boolean;
    forceMarkdown?: boolean;
}

// Retro-styled Code Block Component
export const RetroCodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code: ', err);
        }
    };

    const lines = code.split('\n');
    // Remove last empty line if it exists
    if (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
    }

    return (
        <div className="my-4 border-4 border-black rounded-xl overflow-hidden bg-gray-900 text-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] select-text">
            {/* Header bar */}
            <div className="bg-yellow-400 border-b-4 border-black px-4 py-2 flex items-center justify-between font-black text-black select-none">
                <span className="uppercase text-xs tracking-wider font-mono">⚡ {language || 'code'}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-gray-100 border-2 border-black rounded-md text-xs active:translate-y-0.5 active:shadow-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                    {copied ? (
                        <>
                            <Check className="w-3.5 h-3.5 text-green-600" />
                            <span>COPIED</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>COPY</span>
                        </>
                    )}
                </button>
            </div>
            {/* Content */}
            <div className="flex font-mono text-sm leading-relaxed overflow-x-auto max-h-[300px] p-3">
                {/* Line Numbers */}
                <div className="select-none text-right pr-3 border-r-2 border-gray-700 text-gray-505 min-w-[2.5rem] text-gray-500">
                    {lines.map((_, i) => (
                        <div key={i}>{i + 1}</div>
                    ))}
                </div>
                {/* Code body */}
                <pre className="pl-3 pr-2 select-text whitespace-pre text-left flex-1 font-mono">
                    <code>{code}</code>
                </pre>
            </div>
        </div>
    );
};

// Retro-styled Image Frame Component
export const RetroImageFrame: React.FC<{ alt: string; url: string }> = ({ alt, url }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    return (
        <div className="my-4 border-4 border-black rounded-2xl bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-sm mx-auto select-none">
            <div className="relative border-4 border-black bg-gray-100 rounded-xl overflow-hidden min-h-[200px] flex items-center justify-center">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-widest gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        <span>Rendering Art...</span>
                    </div>
                )}
                {error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-500 font-black text-xs uppercase tracking-wider p-4 text-center">
                        <span>Failed to Load Canvas</span>
                    </div>
                ) : null}
                <img
                    src={url}
                    alt={alt}
                    onLoad={() => setLoading(false)}
                    onError={() => {
                        setLoading(false);
                        setError(true);
                    }}
                    className={`w-full h-auto object-contain max-h-[350px] transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                />
            </div>
            <div className="mt-3 text-center border-t-2 border-dashed border-gray-300 pt-2 flex items-center justify-center gap-1.5 select-none">
                <ImageIcon className="w-4 h-4 text-gray-500" />
                <span className="font-extrabold text-xs text-gray-500 tracking-wide uppercase">{alt || 'Art Piece'}</span>
            </div>
        </div>
    );
};

// Inline parsing helper
const parseInlineMarkdown = (line: string): React.ReactNode[] => {
    // Regex for bold (**text**) and inline code (`code`)
    const inlineRegex = /(\*\*.*?\*\*|\`.*?\`)/g;
    const parts = line.split(inlineRegex);

    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-black text-black">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return (
                <code key={index} className="px-1.5 py-0.5 bg-yellow-100 border-2 border-black rounded text-xs font-mono mx-0.5 inline-block text-black select-text">
                    {part.slice(1, -1)}
                </code>
            );
        }
        return part;
    });
};

const RichTextLines: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;

    const flushList = (key: number) => {
        if (currentList) {
            if (currentList.type === 'ul') {
                elements.push(
                    <ul key={`ul-${key}`} className="list-disc list-inside pl-4 my-2 space-y-1 font-bold text-gray-800">
                        {currentList.items.map((item, idx) => (
                            <li key={idx} className="marker:text-yellow-500">{item}</li>
                        ))}
                    </ul>
                );
            } else {
                elements.push(
                    <ol key={`ol-${key}`} className="list-decimal list-inside pl-4 my-2 space-y-1 font-bold text-gray-800">
                        {currentList.items.map((item, idx) => (
                            <li key={idx} className="marker:text-blue-500">{item}</li>
                        ))}
                    </ol>
                );
            }
            currentList = null;
        }
    };

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        // 1. Heading H1 (# )
        if (trimmed.startsWith('# ')) {
            flushList(index);
            elements.push(
                <h1 key={index} className="text-2xl font-black mt-4 mb-2 border-b-4 border-black pb-1 tracking-wide uppercase text-black">
                    {parseInlineMarkdown(trimmed.slice(2))}
                </h1>
            );
            return;
        }

        // 2. Heading H2 (## )
        if (trimmed.startsWith('## ')) {
            flushList(index);
            elements.push(
                <h2 key={index} className="text-xl font-black mt-3 mb-2 tracking-wide uppercase text-black">
                    {parseInlineMarkdown(trimmed.slice(3))}
                </h2>
            );
            return;
        }

        // 3. Heading H3 (### )
        if (trimmed.startsWith('### ')) {
            flushList(index);
            elements.push(
                <h3 key={index} className="text-lg font-black mt-2 mb-1 tracking-wide uppercase text-gray-800">
                    {parseInlineMarkdown(trimmed.slice(4))}
                </h3>
            );
            return;
        }

        // 4. Unordered List Bullet (- or *)
        const ulMatch = trimmed.match(/^[-*]\s+(.*)/);
        if (ulMatch) {
            const content = parseInlineMarkdown(ulMatch[1]);
            if (currentList && currentList.type === 'ul') {
                currentList.items.push(content);
            } else {
                flushList(index);
                currentList = { type: 'ul', items: [content] };
            }
            return;
        }

        // 5. Ordered List Number (\d+.)
        const olMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (olMatch) {
            const content = parseInlineMarkdown(olMatch[2]);
            if (currentList && currentList.type === 'ol') {
                currentList.items.push(content);
            } else {
                flushList(index);
                currentList = { type: 'ol', items: [content] };
            }
            return;
        }

        // 6. Blank / Empty lines
        if (trimmed === '') {
            flushList(index);
            return;
        }

        // 7. Regular paragraph line
        flushList(index);
        elements.push(
            <p key={index} className="my-1 text-base font-bold text-gray-800 break-words leading-relaxed select-text">
                {parseInlineMarkdown(line)}
            </p>
        );
    });

    flushList(lines.length);

    return <>{elements}</>;
};

const TextBlock: React.FC<{
    text: string;
    inlineLinksOnly?: boolean;
    onOpenArtifact?: (artifact: { id: string; title: string; type: 'code' | 'image' | 'document'; content: string; language?: string }) => void;
    msgId?: string;
    partIndex: number;
}> = ({ text, inlineLinksOnly, onOpenArtifact, msgId, partIndex }) => {
    if (!text) return null;

    // Split by Markdown Images
    const imageRegex = /(!\[.*?\]\(.*?\))/g;
    const segments = text.split(imageRegex);

    return (
        <>
            {segments.map((segment, index) => {
                if (segment.startsWith('![') && segment.endsWith(')')) {
                    const altMatch = segment.match(/!\[(.*?)\]/);
                    const urlMatch = segment.match(/\((.*?)\)/);
                    const alt = altMatch ? altMatch[1] : 'Image';
                    const url = urlMatch ? urlMatch[1] : '';
                    if (url) {
                        if (inlineLinksOnly && onOpenArtifact) {
                            return (
                                <button
                                    key={index}
                                    onClick={() => onOpenArtifact({
                                        id: `${msgId || 'art'}-img-${partIndex}-${index}`,
                                        title: alt || 'Art Frame',
                                        type: 'image',
                                        content: url
                                    })}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-black text-blue-900 my-1 transition-all active:translate-y-0.5 active:shadow-none select-none"
                                >
                                    <span>🎨 IMAGE: {alt || 'Art Frame'} (Click to View)</span>
                                </button>
                            );
                        }
                        return <RetroImageFrame key={index} alt={alt} url={url} />;
                    }
                }

                // Line-based text structure parsing (Lists, headings, paragraphs)
                return <RichTextLines key={index} text={segment} />;
            })}
        </>
    );
};

// Main message parser component
export const FormattedChatMessage: React.FC<FormattedChatMessageProps> = ({
    text,
    inlineLinksOnly = false,
    onOpenArtifact,
    msgId,
    onLinkClick,
    isTranslated,
    forceMarkdown
}) => {
    if (!text) return null;

    // Check if the text is actually a special Task Result JSON
    if (text.startsWith('TASK_RESULT:')) {
        try {
            const data = JSON.parse(text.replace('TASK_RESULT:', ''));
            return (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-3 my-2 shadow-inner">
                    <p className="font-bold text-indigo-800 text-sm mb-2">{data.summary || 'Task result ready!'}</p>
                    <button 
                        onClick={() => onLinkClick?.('task_view', data)}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black py-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all text-xs flex items-center justify-center gap-2"
                    >
                        <span>📑</span> VIEW FULL REPORT
                    </button>
                </div>
            );
        } catch (e) {
            // Fallback to normal text if parsing fails
        }
    }

    // Split by Code Blocks
    const codeBlockRegex = /(\`\`\`[a-zA-Z0-9+#-]*\n[\s\S]*?\n\`\`\`)/g;
    const parts = text.split(codeBlockRegex);

    return (
        <div className="space-y-2 leading-relaxed">
            {parts.map((part, index) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    // It is a code block
                    const firstNewline = part.indexOf('\n');
                    const language = part.slice(3, firstNewline).trim();
                    const code = part.slice(firstNewline + 1, -3);

                    if (inlineLinksOnly && onOpenArtifact) {
                        return (
                            <button
                                key={index}
                                onClick={() => onOpenArtifact({
                                    id: `${msgId || 'art'}-code-${index}`,
                                    title: `${language.toUpperCase()} Code File`,
                                    type: 'code',
                                    content: code,
                                    language
                                })}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-black text-purple-900 my-1 transition-all active:translate-y-0.5 active:shadow-none select-none"
                            >
                                <span>⚡ {language.toUpperCase()} FILE (Click to Preview)</span>
                            </button>
                        );
                    }
                    return <RetroCodeBlock key={index} language={language} code={code} />;
                }

                // Parse Markdown Images and other block elements
                return (
                    <TextBlock
                        key={index}
                        text={part}
                        inlineLinksOnly={inlineLinksOnly}
                        onOpenArtifact={onOpenArtifact}
                        msgId={msgId}
                        partIndex={index}
                    />
                );
            })}
        </div>
    );
};
