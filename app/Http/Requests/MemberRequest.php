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
            'email.required' => 'Your email is needed so you can reset a forgotten password.',
            'phone.regex' => 'Enter a full phone number, for example 0801 234 5678.',
            'next_of_kin_phone.regex' => 'Enter a full phone number, for example 0801 234 5678.',
            'socials.whatsapp.regex' => 'Enter a full phone number, for example 0801 234 5678.',
            'socials.*.regex' => 'Enter your username or a link to your page on this site.',
            'foundation_certificate.required_if_accepted' => 'Please upload your Foundation class certificate.',
            'wofbi_certificate.required_if_accepted' => 'Please upload your WOFBI certificate.',
            'foundation_certificate.mimes' => 'Upload a PDF or a photo (JPG, PNG or WebP).',
            'wofbi_certificate.mimes' => 'Upload a PDF or a photo (JPG, PNG or WebP).',
            'foundation_certificate.uploaded' => 'That file could not be uploaded. Please use a smaller one, up to 8 MB.',
            'wofbi_certificate.uploaded' => 'That file could not be uploaded. Please use a smaller one, up to 8 MB.',
        ];
    }
}
