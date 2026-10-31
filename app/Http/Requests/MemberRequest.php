<?php

namespace App\Http\Requests;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;

abstract class MemberRequest extends FormRequest
{
    /**
     * Put phone numbers in international format before they are validated.
     */
    protected function prepareForValidation(): void
    {
        foreach (['phone', 'next_of_kin_phone'] as $field) {
            if ($this->filled($field)) {
                $this->merge([$field => Phone::normalize((string) $this->input($field))]);
            }
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.regex' => 'Enter a full phone number, for example 0801 234 5678.',
            'next_of_kin_phone.regex' => 'Enter a full phone number, for example 0801 234 5678.',
        ];
    }
}
