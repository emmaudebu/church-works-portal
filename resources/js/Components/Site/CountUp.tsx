import { useCountUp } from '@/lib/motion';
import { useRef } from 'react';

export default function CountUp({ value }: { value: number }) {
    const element = useRef<HTMLSpanElement>(null);
    const shown = useCountUp(value, element);

    return (
        <>
            <span ref={element} aria-hidden="true">
                {shown}
            </span>
            <span className="sr-only">{value}</span>
        </>
    );
}
