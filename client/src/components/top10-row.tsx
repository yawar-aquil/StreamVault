import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Show, Movie, Anime } from "@shared/schema";
import { ShowCard } from "./show-card";

interface Top10RowProps {
    title?: string;
    items: (Show | Movie | Anime)[];
}

export function Top10Row({ title = "Top 10 Today", items }: Top10RowProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const scrollAmount = scrollRef.current.clientWidth * 0.8;
            scrollRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
            setTimeout(checkScroll, 300);
        }
    };

    if (!items || items.length === 0) return null;

    const top10Items = items.slice(0, 10);

    return (
        <div className="space-y-4 py-8">
            <h2 className="text-2xl md:text-3xl font-bold px-4 md:px-6 flex items-center gap-2">
                {title}
            </h2>

            <div className="relative group">
                {/* Left Arrow */}
                {canScrollLeft && (
                    <button
                        onClick={() => scroll("left")}
                        className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-background to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-start pl-2"
                    >
                        <ChevronLeft className="w-10 h-10 text-white" />
                    </button>
                )}

                <div
                    ref={scrollRef}
                    onScroll={checkScroll}
                    className="flex gap-0 overflow-x-auto scrollbar-hide px-4 md:px-6 scroll-smooth items-center h-[300px]"
                    style={{ scrollbarWidth: "none" }}
                >
                    {top10Items.map((item, index) => (
                        <div key={item.id || index} className="flex-shrink-0 relative flex items-end w-[280px] group/item cursor-pointer">
                            {/* Big SVG Number */}
                            <div className="relative z-0 h-[220px] w-[140px] flex items-center justify-center -mr-8 translate-y-2 transition-transform duration-300 group-hover/item:scale-110 group-hover/item:-translate-x-2">
                                <svg viewBox="0 0 100 150" className="h-full w-full overflow-visible">
                                    <text
                                        x="50%"
                                        y="135"
                                        className="text-[140px] font-black transition-all duration-300 group-hover/item:fill-white"
                                        textAnchor="middle"
                                        fill="transparent"
                                        stroke="#E50914"
                                        strokeWidth="2"
                                        style={{
                                            fontFamily: "Impact, sans-serif",
                                            filter: "drop-shadow(2px 4px 6px black)"
                                        }}
                                    >
                                        {index + 1}
                                    </text>
                                </svg>
                            </div>

                            {/* Card */}
                            <div className="w-[160px] z-10 transition-transform duration-300 group-hover/item:scale-105 group-hover/item:z-20">
                                <ShowCard show={item} orientation="portrait" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Arrow */}
                {canScrollRight && (
                    <button
                        onClick={() => scroll("right")}
                        className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-background to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pr-2"
                    >
                        <ChevronRight className="w-10 h-10 text-white" />
                    </button>
                )}
            </div>
        </div>
    );
}

