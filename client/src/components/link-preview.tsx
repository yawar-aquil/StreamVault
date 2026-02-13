
import { useState, useEffect } from 'react';
import { Loader2, Link as LinkIcon } from 'lucide-react';

interface LinkPreviewProps {
    url: string;
}

interface PreviewData {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchPreview = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/preview-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                });

                if (!response.ok) throw new Error('Failed to fetch preview');

                const data = await response.json();
                if (isMounted) {
                    if (data.title || data.image) {
                        setPreview(data);
                    } else {
                        // If no meaningful data, treat as error to fallback
                        setError(true);
                    }
                }
            } catch (err) {
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchPreview();

        return () => { isMounted = false; };
    }, [url]);

    if (error || (!loading && !preview)) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
            >
                {url}
            </a>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground text-sm my-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="truncate max-w-[200px]">{url}</span>
            </div>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 mb-1 max-w-[300px] bg-background/50 border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors group"
        >
            {preview?.image && (
                <div className="relative aspect-video w-full bg-muted">
                    <img
                        src={preview.image}
                        alt={preview.title || "Link preview"}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>
            )}
            <div className="p-3">
                {preview?.siteName && (
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                        <LinkIcon className="h-2.5 w-2.5" />
                        {preview.siteName}
                    </div>
                )}
                <div className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {preview?.title || url}
                </div>
                {preview?.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                        {preview.description}
                    </div>
                )}
            </div>
        </a>
    );
}
