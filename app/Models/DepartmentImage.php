<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

#[Fillable(['department_id', 'image', 'caption'])]
class DepartmentImage extends Model
{
    /**
     * @return array<string, mixed>
     */
    public function toCard(): array
    {
        return [
            'id' => $this->id,
            'caption' => $this->caption,
            'url' => Storage::disk('public')->url($this->image),
        ];
    }
}
