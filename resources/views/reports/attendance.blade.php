<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Attendance report</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1A1A1A; }
        h1 { font-size: 18px; color: #7A1210; margin: 0; }
        .rule { height: 2px; width: 60px; background: #D4AF37; margin: 6px 0 10px; }
        .muted { color: #57534E; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        th { text-align: left; border-bottom: 1px solid #1A1A1A; padding: 5px 4px; }
        td { border-bottom: 1px solid #E7E4DF; padding: 5px 4px; }
        .num { text-align: right; }
    </style>
</head>
<body>
    <h1>Attendance report</h1>
    <div class="rule"></div>
    <p class="muted">
        {{ $filters['from'] }} to {{ $filters['to'] }}
        @if ($filters['type']) · {{ ucfirst($filters['type']) }} services @endif
        @if ($filters['unit']) · {{ $filters['unit'] }} @endif
    </p>
    <p>
        Attendance rate: <strong>{{ $summary['rate'] === null ? 'n/a' : $summary['rate'].'%' }}</strong>
        · Services held: <strong>{{ $summary['services'] }}</strong>
        · Regular: <strong>{{ $summary['regular'] }}</strong>
        · Frequent absentees: <strong>{{ $summary['absentees'] }}</strong>
    </p>
    <table>
        <thead>
            <tr>
                <th>Member ID</th>
                <th>Name</th>
                <th>Unit</th>
                <th class="num">Attended</th>
                <th class="num">Services</th>
                <th class="num">Rate</th>
                <th>Group</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($members as $member)
                <tr>
                    <td>{{ $member['member_id'] }}</td>
                    <td>{{ $member['full_name'] }}</td>
                    <td>{{ $member['unit'] }}</td>
                    <td class="num">{{ $member['attended'] }}</td>
                    <td class="num">{{ $member['total'] }}</td>
                    <td class="num">{{ $member['rate'] === null ? '-' : $member['rate'].'%' }}</td>
                    <td>{{ $member['group'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
