<?php

namespace App\Exports;

use App\Models\User;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadings;
use PhpOffice\PhpSpreadsheet\Cell\StringValueBinder;

/**
 * Every value is bound as a string so a self-registered name like "=HYPERLINK(...)"
 * can never run as a formula on an admin's computer.
 */
class MembersExport extends StringValueBinder implements FromCollection, ShouldAutoSize, WithCustomValueBinder, WithHeadings
{
    /**
     * @param  Collection<int, User>  $members
     */
    public function __construct(private Collection $members) {}

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['Member ID', 'Full name', 'Phone', 'Email', 'Department', 'Unit', 'Status', 'Date joined'];
    }

    /**
     * @return Collection<int, array<int, string|null>>
     */
    public function collection(): Collection
    {
        return $this->members->map(fn (User $member) => [
            $member->member_id,
            $member->full_name,
            $member->phone,
            $member->email,
            $member->department?->name,
            $member->unit,
            $member->status,
            $member->date_joined?->toDateString(),
        ]);
    }
}
