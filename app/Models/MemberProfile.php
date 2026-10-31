<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id', 'next_of_kin_name', 'next_of_kin_relationship', 'next_of_kin_phone',
    'occupation', 'technical_skills', 'marital_status', 'admin_notes',
])]
#[Hidden(['admin_notes'])]
class MemberProfile extends Model
{
    /**
     * Fields a member or admin fills in on the bio data forms.
     */
    public const BIO_FIELDS = [
        'next_of_kin_name', 'next_of_kin_relationship', 'next_of_kin_phone',
        'occupation', 'technical_skills', 'marital_status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['technical_skills' => 'array'];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
