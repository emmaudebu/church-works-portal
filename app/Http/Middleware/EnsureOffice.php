<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOffice
{
    /**
     * Admit super admins and department officers, optionally needing a permission.
     */
    public function handle(Request $request, Closure $next, ?string $permission = null): Response
    {
        $user = $request->user();

        abort_unless($user?->isAdmin() && (! $permission || $user->canDo($permission)), 403);

        return $next($request);
    }
}
