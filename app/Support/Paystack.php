<?php

namespace App\Support;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class Paystack
{
    private const BASE_URL = 'https://api.paystack.co';

    public static function secretKey(): ?string
    {
        $stored = Settings::get('paystack_secret');

        return $stored ? Crypt::decryptString($stored) : null;
    }

    public static function isConfigured(): bool
    {
        return self::secretKey() !== null;
    }

    /**
     * Start a payment and return the page to send the member to.
     *
     * @param  array<string, mixed>  $metadata
     *
     * @throws RuntimeException
     */
    public static function initialize(string $email, int $amount, string $reference, string $callbackUrl, array $metadata = []): string
    {
        $response = self::client()->post('/transaction/initialize', [
            'email' => $email,
            'amount' => $amount,
            'reference' => $reference,
            'currency' => 'NGN',
            'callback_url' => $callbackUrl,
            'metadata' => $metadata,
        ]);

        $url = $response->json('data.authorization_url');

        if (! $response->successful() || ! $url) {
            throw new RuntimeException('Paystack could not start this payment.');
        }

        return $url;
    }

    /**
     * Ask Paystack directly what happened to a payment.
     *
     * @return array<string, mixed>
     *
     * @throws RuntimeException
     */
    public static function verify(string $reference): array
    {
        $response = self::client()->get('/transaction/verify/'.rawurlencode($reference));

        if (! $response->successful()) {
            throw new RuntimeException('Paystack could not confirm this payment.');
        }

        return $response->json('data') ?? [];
    }

    public static function validSignature(string $payload, ?string $signature): bool
    {
        $secret = self::secretKey();

        return $secret !== null
            && $signature !== null
            && hash_equals(hash_hmac('sha512', $payload, $secret), $signature);
    }

    private static function client(): PendingRequest
    {
        return Http::baseUrl(self::BASE_URL)->withToken((string) self::secretKey())->acceptJson()->timeout(20);
    }
}
