<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Support\MemberRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends MemberRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->user();

        if ($user->hasRole('super_admin')) {
            return [
                'full_name' => ['required', 'string', 'max:255'],
                'email' => ['nullable', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)->ignore($user->id)],
            ];
        }

        return [
            ...MemberRules::personal($user),
            ...MemberRules::church($user->department_id),
            ...MemberRules::certificates($user),
            ...MemberRules::emergencyAndExtra(),
            'photo' => ['nullable', ...MemberRules::photo()],
            'show_on_site' => ['boolean'],
        ];
    }
}
