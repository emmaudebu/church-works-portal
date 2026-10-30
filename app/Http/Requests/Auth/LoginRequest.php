<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Support\Phone;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        if (! Auth::validate($this->credentials())) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'login' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());

        /** @var User $user */
        $user = Auth::getLastAttempted();

        // Status is only revealed once the password has been proven correct.
        if (! $user->isActive()) {
            throw ValidationException::withMessages([
                'login' => $user->status === 'suspended'
                    ? 'Your account has been suspended. Please speak to your department admin.'
                    : 'Your account is awaiting admin approval.',
            ]);
        }

        Auth::login($user, $this->boolean('remember'));
    }

    /**
     * Build the credentials, treating the login as an email if it contains an @.
     *
     * @return array<string, string>
     */
    protected function credentials(): array
    {
        $login = trim($this->string('login'));

        return [
            ...str_contains($login, '@')
                ? ['email' => Str::lower($login)]
                : ['phone' => Phone::normalize($login)],
            'password' => $this->string('password')->toString(),
        ];
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'login' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('login')).'|'.$this->ip());
    }
}
