<?php

namespace App\Support;

class Phone
{
    /**
     * Normalize a phone number to international format, defaulting to Nigeria (+234).
     */
    public static function normalize(string $phone): string
    {
        $digits = self::digits($phone);

        if ($digits === '') {
            return '';
        }

        if (str_starts_with($phone, '+') || str_starts_with($digits, '234')) {
            return '+'.preg_replace('/^2340/', '234', $digits);
        }

        return '+234'.ltrim($digits, '0');
    }

    public static function digits(string $phone): string
    {
        return preg_replace('/\D/', '', $phone);
    }
}
