<?php

namespace App\Http\Requests;

use App\Support\MemberRules;

class RegisterMemberRequest extends MemberRequest
{
    /**
     * Get the validation rules for one wizard step, or every step on final submit.
     *
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        $steps = [
            1 => MemberRules::personal(),
            2 => [...MemberRules::department(), ...MemberRules::church(), ...MemberRules::certificates()],
            3 => MemberRules::emergencyAndExtra(),
        ];

        if ($this->routeIs('register.check')) {
            return $steps[$this->integer('step')] ?? [];
        }

        return [
            ...array_merge(...$steps),
            ...MemberRules::password(),
            'photo' => ['required', ...MemberRules::photo()],
        ];
    }
}
