import { ReactNode } from 'react';

export default function SectionHeading({
    eyebrow,
    title,
    accent,
    action,
}: {
    eyebrow: string;
    title: string;
    accent?: string;
    action?: ReactNode;
}) {
    return (
        <div className="reveal mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
                <p className="eyebrow">{eyebrow}</p>
                <h2 className="mt-2 text-3xl leading-tight md:text-4xl">
                    {title}{' '}
                    {accent && (
                        <em className="font-medium text-primary-700">
                            {accent}
                        </em>
                    )}
                </h2>
            </div>
            {action}
        </div>
    );
}
