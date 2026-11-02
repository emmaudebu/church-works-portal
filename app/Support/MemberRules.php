<?php

namespace App\Support;

use App\Models\Unit;
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
    public static function personal(?User $ignore = null, bool $requireEmail = true): array
    {
        return [
            'full_name' => ['required', 'string', 'max:255'],
            'gender' => ['required', Rule::in(['male', 'female'])],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'phone' => ['required', 'string', self::PHONE_FORMAT, Rule::unique(User::class)->ignore($ignore)],
            'email' => [$requireEmail ? 'required' : 'nullable', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)->ignore($ignore)],
            'address' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function church(?int $departmentId = null): array
    {
        $units = Unit::where('department_id', $departmentId)->pluck('name');

        return [
            'unit' => ['required', 'string', 'max:100', ...($units->isNotEmpty() ? [Rule::in($units->all())] : [])],
            'date_joined' => ['nullable', 'date', 'before_or_equal:today'],
            'foundation_class_done' => ['boolean'],
            'wofbi_done' => ['boolean'],
        ];
    }

    /**
     * A certificate must back up a "yes", unless one was accepted earlier.
     *
     * @return array<string, array<mixed>>
     */
    public static function certificates(?User $user = null, bool $required = true): array
    {
        $rules = [];

        foreach (Certificates::FIELDS as $field => $answer) {
            $alreadyAnswered = $user?->{$answer} || $user?->{$field};

            $rules[$field] = [
                $required && ! $alreadyAnswered ? "required_if_accepted:{$answer}" : 'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp',
                'max:8192',
            ];
        }

        return $rules;
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
     * @return array<string, array<int, string>>
     */
    public static function socials(): array
    {
        $rules = [
            'socials' => ['nullable', 'array'],
            'socials.whatsapp' => ['nullable', 'string', self::PHONE_FORMAT],
        ];

        foreach (array_keys(Socials::NETWORKS) as $network) {
            $rules["socials.$network"] = ['nullable', 'string', 'max:255', 'regex:'.Socials::linkFormat($network)];
        }

        return $rules;
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
