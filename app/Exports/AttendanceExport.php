<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadings;
use PhpOffice\PhpSpreadsheet\Cell\StringValueBinder;

class AttendanceExport extends StringValueBinder implements FromCollection, ShouldAutoSize, WithCustomValueBinder, WithHeadings
{
    /**
     * @param  Collection<int, array<string, mixed>>  $members
     */
    public function __construct(private Collection $members) {}

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['Member ID', 'Full name', 'Unit', 'Days attended', 'Service days', 'Rate %', 'Group'];
    }

    /**
     * @return Collection<int, array<int, mixed>>
     */
    public function collection(): Collection
    {
        return $this->members->map(fn (array $row) => [
            $row['member_id'], $row['full_name'], $row['unit'],
            $row['attended'], $row['total'], $row['rate'], $row['group'],
        ]);
    }
}
