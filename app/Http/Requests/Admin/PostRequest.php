<?php

namespace App\Http\Requests\Admin;

use App\Support\RichText;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PostRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['news', 'event', 'announcement'])],
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:'.RichText::MAX_LENGTH, function (string $attribute, mixed $value, Closure $fail) {
                if (trim(strip_tags((string) $value)) === '') {
                    $fail('Please write something in the post.');
                }
            }],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'event_date' => ['nullable', 'required_if:type,event', 'date'],
            'venue' => ['nullable', 'string', 'max:255'],
            'publish' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['event_date.required_if' => 'An event needs a date and time.'];
    }
}
