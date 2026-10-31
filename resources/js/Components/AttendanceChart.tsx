import { TrendPoint } from '@/types';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    TooltipContentProps,
    XAxis,
    YAxis,
} from 'recharts';

const INK = '#57534E';
const GRID = '#E7E4DF';
const LINE = '#B81C19';

function ChartTooltip({ active, payload }: TooltipContentProps) {
    const point = payload?.[0]?.payload as TrendPoint | undefined;

    if (!active || !point) {
        return null;
    }

    return (
        <div className="card px-3 py-2 text-sm ring-1 ring-neutral-200">
            <p className="font-medium">{point.title}</p>
            <p className="text-neutral-600">{point.label}</p>
            <p className="tabular-nums">
                {point.rate}% ({point.present} present)
            </p>
        </div>
    );
}

export default function AttendanceChart({ data }: { data: TrendPoint[] }) {
    return (
        <>
            <div
                role="img"
                aria-label={`Attendance rate across ${data.length} services`}
            >
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                        data={data}
                        margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
                    >
                        <CartesianGrid vertical={false} stroke={GRID} />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: INK, fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: GRID }}
                            minTickGap={24}
                        />
                        <YAxis
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                            unit="%"
                            tick={{ fill: INK, fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            content={ChartTooltip}
                            cursor={{ stroke: INK, strokeDasharray: '4 4' }}
                        />
                        <Line
                            type="linear"
                            dataKey="rate"
                            stroke={LINE}
                            strokeWidth={2}
                            dot={{ r: 4, fill: LINE, stroke: '#FFFFFF', strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-neutral-600">
                    View as table
                </summary>
                <table className="mt-2 w-full text-left">
                    <thead>
                        <tr className="text-neutral-600">
                            <th scope="col" className="py-1 font-medium">
                                Service
                            </th>
                            <th scope="col" className="py-1 font-medium">
                                Date
                            </th>
                            <th scope="col" className="py-1 text-right font-medium">
                                Present
                            </th>
                            <th scope="col" className="py-1 text-right font-medium">
                                Rate
                            </th>
                        </tr>
                    </thead>
                    <tbody className="tabular-nums">
                        {data.map((point) => (
                            <tr
                                key={point.id}
                                className="border-t border-neutral-200"
                            >
                                <td className="py-1">{point.title}</td>
                                <td className="py-1">{point.label}</td>
                                <td className="py-1 text-right">
                                    {point.present}
                                </td>
                                <td className="py-1 text-right">
                                    {point.rate}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </>
    );
}
