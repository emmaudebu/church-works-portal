export default function Avatar({
    name,
    src,
    className = 'h-9 w-9 text-sm',
}: {
    name: string;
    src?: string | null;
    className?: string;
}) {
    const initials = name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    const shared = `rounded-full ring-2 ring-gold-500 ${className}`;

    if (src) {
        return <img src={src} alt="" className={`object-cover ${shared}`} />;
    }

    return (
        <span
            aria-hidden="true"
            className={`inline-flex items-center justify-center bg-primary-700 font-semibold text-white ${shared}`}
        >
            {initials}
        </span>
    );
}
