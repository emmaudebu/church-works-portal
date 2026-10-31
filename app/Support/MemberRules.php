<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Bio data validation shared by registration, profile editing and the admin edit form.
 */
class MemberRules
{
    public const PHONE_FORMAT = 'regex:/^\+\d{10,15}$/';

    /**
     * @return array<string, array<mixed>>
     */
    public static function personal(?User $ignore = null): array
    {
        return [
            'full_name' => ['required', 'string', 'max:255'],
            'gender' => ['required', Rule::in(['male', 'female'])],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'phone' => ['required', 'string', self::PHONE_FORMAT, Rule::unique(User::class)->ignore($ignore)],
            'email' => ['nullable', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)->ignore($ignore)],
            'address' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function church(): array
    {
        return [
            'unit' => ['required', 'string', 'max:100'],
            'date_joined' => ['nullable', 'date', 'before_or_equal:today'],
            'foundation_class_done' => ['boolean'],
            'wofbi_done' => ['boolean'],
        ];
    }

    /**
     * Only active departments can be joined; coming soon ones are not open yet.
     * Someone already in a department that closed may stay in it.
     *
     * @return array<string, array<mixed>>
     */
    public static function department(?int $currentId = null): array
    {
        return [
            'department_id' => ['required', Rule::exists('departments', 'id')->where(
                fn ($query) => $query->where('status', 'active')->orWhere('id', $currentId),
            )],
        ];
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function emergencyAndExtra(): array
    {
        return [
            'next_of_kin_name' => ['required', 'string', 'max:255'],
            'next_of_kin_relationship' => ['required', 'string', 'max:100'],
            'next_of_kin_phone' => ['required', 'string', self::PHONE_FORMAT],
            'occupation' => ['nullable', 'string', 'max:255'],
            'technical_skills' => ['nullable', 'array', 'max:30'],
            'technical_skills.*' => ['string', 'max:60'],
            'marital_status' => ['nullable', Rule::in(['single', 'married', 'widowed', 'divorced'])],
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function photo(): array
    {
        return ['image', 'mimes:jpg,jpeg,png,webp', 'max:8192'];
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function password(): array
    {
        return ['password' => ['required', 'confirmed', Password::defaults()]];
    }
}
