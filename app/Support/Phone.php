<?php

namespace App\Support;

class Phone
{
    /**
     * Normalize a phone number to international format, defaulting to Nigeria (+234).
     */
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        if ($digits === '') {
            return '';
        }

        if (str_starts_with($phone, '+') || str_starts_with($digits, '234')) {
            return '+'.$digits;
        }

        return '+234'.ltrim($digits, '0');
    }
}
