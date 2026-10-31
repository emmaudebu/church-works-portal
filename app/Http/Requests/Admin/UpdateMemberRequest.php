<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\MemberRequest;
use App\Models\User;
use App\Support\MemberRules;
use Illuminate\Validation\Rule;

class UpdateMemberRequest extends MemberRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        /** @var User $member */
        $member = $this->route('member');

        return [
            ...MemberRules::personal($member, requireEmail: false),
            ...MemberRules::church($this->integer('department_id') ?: $member->department_id),
            ...MemberRules::certificates($member, required: false),
            ...MemberRules::emergencyAndExtra(),
            ...($this->user()->hasRole('super_admin') ? MemberRules::department($member->department_id) : []),
            'member_id' => ['required', 'string', 'max:30', Rule::unique(User::class)->ignore($member)],
            'photo' => ['nullable', ...MemberRules::photo()],
        ];
    }
}
