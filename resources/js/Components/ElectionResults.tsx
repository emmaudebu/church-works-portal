import { PositionResult, Turnout } from '@/types';
import {
    Bar,
    BarChart,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    TooltipContentProps,
    XAxis,
    YAxis,
} from 'recharts';

const INK = '#1A1A1A';
const BAR = '#B81C19';

function ChartTooltip({ active, payload }: TooltipContentProps) {
    const row = payload?.[0]?.payload as
        | { full_name: string; votes: number; share: number }
        | undefined;

    if (!active || !row) {
        return null;
    }

    return (
        <div className="card px-3 py-2 text-sm ring-1 ring-neutral-200">
            <p className="font-medium">{row.full_name}</p>
            <p className="tabular-nums">
                {row.votes} {row.votes === 1 ? 'vote' : 'votes'} ({row.share}%)
            </p>
        </div>
    );
}

export function TurnoutBar({ turnout }: { turnout: Turnout }) {
    return (
        <div>
            <div className="flex justify-between text-sm">
                <span className="font-medium">Turnout</span>
                <span className="tabular-nums text-neutral-600">
                    {turnout.voted} of {turnout.eligible} ({turnout.percent}%)
                </span>
            </div>
            <div
                role="progressbar"
                aria-label="Turnout"
                aria-valuenow={turnout.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-200"
            >
                <div
                    className="h-full rounded-full bg-gold-500"
                    style={{ width: `${turnout.percent}%` }}
                />
            </div>
        </div>
    );
}

export default function ElectionResults({
    results,
}: {
    results: PositionResult[];
}) {
    return (
        <div className="space-y-6">
            {results.map((position) => {
                const data = position.candidates.map((candidate) => ({
                    ...candidate,
                    share: position.total
                        ? Math.round((candidate.votes / position.total) * 100)
                        : 0,
                }));

                return (
                    <section key={position.id}>
                        <h3 className="text-lg">{position.title}</h3>
                        <div
                            role="img"
                            aria-label={`${position.title}: ${data
                                .map((row) => `${row.full_name} ${row.votes}`)
                                .join(', ')}`}
                        >
                            <ResponsiveContainer
                                width="100%"
                                height={data.length * 40 + 8}
                            >
                                <BarChart
                                    data={data}
                                    layout="vertical"
                                    margin={{ top: 4, right: 32, bottom: 4, left: 0 }}
                                >
                                    <XAxis type="number" hide allowDecimals={false} />
                                    <YAxis
                                        type="category"
                                        dataKey="full_name"
                                        width={130}
                                        tick={{ fill: INK, fontSize: 13 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        content={ChartTooltip}
                                        cursor={{ fill: '#F8F7F5' }}
                                    />
                                    <Bar
                                        dataKey="votes"
                                        fill={BAR}
                                        barSize={20}
                                        minPointSize={2}
                                        radius={[0, 4, 4, 0]}
                                        isAnimationActive={false}
                                    >
                                        <LabelList
                                            dataKey="votes"
                                            content={({ x, y, width, value }) => (
                                                <text
                                                    x={Number(x) + Number(width) + 6}
                                                    y={Number(y) + 15}
                                                    fill={INK}
                                                    fontSize={13}
                                                >
                                                    {value}
                                                </text>
                                            )}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
