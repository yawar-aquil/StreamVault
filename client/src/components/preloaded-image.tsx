import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface PreloadedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  containerClassName?: string;
}

export function PreloadedImage({
  src,
  alt,
  fallbackSrc,
  className,
  containerClassName,
  ...props
}: PreloadedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    setError(false);

    if (!src) return;

    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setError(true);
    img.src = src;

    // If already cached, mark as loaded immediately
    if (img.complete) {
      setLoaded(true);
    }

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  const displaySrc = error && fallbackSrc ? fallbackSrc : src;

  return (
    <div className={cn("relative", containerClassName)}>
      {/* Skeleton placeholder while loading */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted/50 animate-pulse rounded-inherit" />
      )}
      <img
        ref={imgRef}
        src={displaySrc}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          if (fallbackSrc && !error) {
            setError(true);
            (e.target as HTMLImageElement).src = fallbackSrc;
          }
        }}
        {...props}
      />
    </div>
  );
}
