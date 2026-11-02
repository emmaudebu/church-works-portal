<?php

namespace App\Http\Middleware;

use App\Support\ServiceGenerator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUpcomingServices
{
    /**
     * Keep the coming services in place even where the daily scheduler is not running.
     */
    public function handle(Request $request, Closure $next): Response
    {
        ServiceGenerator::generateDaily();

        return $next($request);
    }
}
