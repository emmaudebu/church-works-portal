<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadings;
use PhpOffice\PhpSpreadsheet\Cell\StringValueBinder;

class AttendanceLogExport extends StringValueBinder implements FromCollection, ShouldAutoSize, WithCustomValueBinder, WithHeadings
{
    /**
     * @param  list<array<string, mixed>>  $entries
     */
    public function __construct(private array $entries) {}

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['#', 'Member ID', 'Full name', 'Unit', 'Phone', 'Time in', 'Method', 'Recorded by'];
    }

    /**
     * @return Collection<int, array<int, mixed>>
     */
    public function collection(): Collection
    {
        return collect($this->entries)->map(fn (array $entry) => [
            $entry['position'], $entry['member_id'], $entry['full_name'], $entry['unit'],
            $entry['phone'], $entry['time'], $entry['method'], $entry['recorded_by'],
        ]);
    }
}
