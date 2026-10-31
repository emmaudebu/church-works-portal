<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordIsChanged
{
    /**
     * Hold anyone on a temporary password on the profile page until they change it.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->must_change_password
            && ! $request->routeIs('profile.edit', 'password.update', 'logout')) {
            return redirect()->route('profile.edit')
                ->with('status', 'Please choose a new password to continue.');
        }

        return $next($request);
    }
}
