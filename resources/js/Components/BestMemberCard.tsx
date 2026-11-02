import Avatar from '@/Components/Avatar';
import { Award } from 'lucide-react';

export type BestMember = {
    id: number;
    user_id: number;
    full_name: string;
    unit: string | null;
    department: string;
    photo_url: string | null;
    month: string;
    score: number;
    attendance_rate: number;
    punctuality: number;
    days_attended: number;
    days_held: number;
};

export default function BestMemberCard({
    winner,
    isYou = false,
}: {
    winner: BestMember;
    isYou?: boolean;
}) {
    return (
        <article className="flex items-center gap-4 rounded-xl border border-gold-500/50 bg-gold-50 p-4">
            <Avatar
                name={winner.full_name}
                src={winner.photo_url}
                className="h-16 w-16 shrink-0 text-xl"
            />
            <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700">
                    <Award size={14} strokeWidth={1.75} aria-hidden="true" />
                    Best member, {winner.month}
                </p>
                <p className="truncate font-serif text-lg font-semibold">
                    {isYou ? 'Congratulations, it is you!' : winner.full_name}
                </p>
                <p className="text-sm text-neutral-600">
                    {[winner.unit, winner.department]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
                <p className="text-sm tabular-nums text-neutral-600">
                    {winner.attendance_rate}% attendance · {winner.punctuality}%
                    on time
                </p>
            </div>
        </article>
    );
}
