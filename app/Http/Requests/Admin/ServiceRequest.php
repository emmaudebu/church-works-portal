<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ServiceRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'opens_at' => ['required', 'date_format:H:i'],
            'closes_at' => ['required', 'date_format:H:i', 'after:opens_at'],
            'ends_at' => ['nullable', 'date_format:H:i', 'after:opens_at'],
        ];
    }

    /**
     * The validated fields with the times placed on the service date.
     *
     * @return array<string, mixed>
     */
    public function serviceData(): array
    {
        $data = $this->validated();

        return [
            'title' => $data['title'],
            'date' => $data['date'],
            'opens_at' => "{$data['date']} {$data['opens_at']}",
            'closes_at' => "{$data['date']} {$data['closes_at']}",
            'ends_at' => "{$data['date']} ".($data['ends_at'] ?? $data['closes_at']),
        ];
    }
}
