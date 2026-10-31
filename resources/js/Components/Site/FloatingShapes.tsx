const SHAPES = [
    '-left-6 top-[6%] h-14 w-14 rounded-full border-2 border-gold-500/40 animate-float',
    'right-[6%] top-[18%] h-6 w-6 rotate-45 bg-primary-700/15 animate-float-slow',
    'left-[42%] top-[5%] h-3 w-3 rounded-full bg-gold-500/50 animate-float-slow',
    '-bottom-6 right-[6%] h-20 w-20 rounded-full border border-primary-700/20 animate-float',
    'bottom-[4%] left-[3%] h-4 w-4 rotate-45 border-2 border-gold-500/50 animate-float-slow',
];

/** Soft shapes drifting behind a section. Purely decorative. */
export default function FloatingShapes() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
        >
            {SHAPES.map((shape, index) => (
                <span
                    key={shape}
                    className={`absolute ${shape}`}
                    style={{ animationDelay: `${index * -1.3}s` }}
                />
            ))}
        </div>
    );
}
