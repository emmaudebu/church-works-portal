<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Post;
use App\Models\Service;
use App\Models\User;
use App\Support\ServiceGenerator;
use App\Support\Settings;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class SiteController extends Controller
{
    private const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    /**
     * Display the public homepage. Everything shown comes from live records.
     */
    public function home(): Response
    {
        ServiceGenerator::generate();

        return Inertia::render('Welcome', [
            'home' => Settings::presentHome(),
            'departments' => Department::forDisplay()->get()->map->toCard(),
            'posts' => Post::publicFacing()->latest('published_at')->limit(3)->get()->map->toCard(),
            'nextService' => $this->nextService(),
            'nextEvent' => Post::publicFacing()
                ->where('type', 'event')
                ->where('event_date', '>=', now())
                ->orderBy('event_date')
                ->first()
                ?->toCard(),
            'latestNews' => Post::publicFacing()->where('type', 'news')->latest('published_at')->first()?->toCard(),
            'serviceTimes' => collect(Settings::services())
                ->sortBy([['day', 'asc'], ['opens', 'asc']])
                ->map(fn (array $service) => [
                    'key' => $service['key'],
                    'title' => $service['title'],
                    'day' => self::DAYS[$service['day']],
                    'time' => Carbon::parse($service['opens'])->format('g:i A'),
                ])
                ->values(),
            'stats' => [
                'members' => User::where('status', 'active')
                    ->whereDoesntHave('roles', fn ($roles) => $roles->where('name', 'super_admin'))
                    ->count(),
                'departments' => Department::where('status', 'active')->count(),
                'services' => count(Settings::services()),
            ],
        ]);
    }

    /**
     * List every department.
     */
    public function departments(): Response
    {
        return Inertia::render('Site/Departments', [
            'departments' => Department::forDisplay()->get()->map->toCard(),
        ]);
    }

    /**
     * Display a department's own page.
     */
    public function department(Department $department): Response
    {
        $department->loadCount(['users as members_count' => fn ($users) => $users->where('status', 'active')]);

        $posts = Post::publicFacing()->where('department_id', $department->id);

        return Inertia::render('Site/Department', [
            'department' => $department->toCard(),
            'units' => $department->units->pluck('name'),
            'gallery' => $department->images->map->toCard(),
            'events' => (clone $posts)->where('type', 'event')->where('event_date', '>=', now())
                ->orderBy('event_date')->limit(3)->get()->map->toCard(),
            'news' => (clone $posts)->where('type', 'news')->latest('published_at')->limit(3)->get()->map->toCard(),
            'others' => Department::forDisplay()->whereKeyNot($department->id)->limit(3)->get()->map->toCard(),
        ]);
    }

    /**
     * List news and events, and announcements for people who are logged in.
     */
    public function news(Request $request): mixed
    {
        $validated = $request->validate(['type' => ['nullable', 'in:news,event,announcement']]);

        $user = $request->user();
        $type = $validated['type'] ?? null;

        if ($type === 'announcement' && ! $user) {
            return to_route('login');
        }

        $visible = fn () => $user?->department_id ? Post::visibleTo($user) : Post::publicFacing();

        return Inertia::render('Site/News', [
            'type' => $type,
            'posts' => $visible()
                ->when($type, fn ($query) => $query->where('type', $type))
                ->latest('published_at')
                ->paginate(9)
                ->withQueryString()
                ->through(fn (Post $post) => $post->toCard()),
            'calendar' => $type === 'event'
                ? $visible()->where('type', 'event')->where('event_date', '>=', now()->subMonths(6))
                    ->orderBy('event_date')->get()->map(fn (Post $post) => [
                        'id' => $post->id,
                        'title' => $post->title,
                        'date' => $post->event_date->toDateString(),
                    ])
                : [],
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function nextService(): ?array
    {
        $service = Service::whereDate('date', '>=', today())
            ->where('closes_at', '>=', now())
            ->orderBy('opens_at')
            ->first();

        return $service ? [
            'title' => $service->title,
            'date_label' => $service->date->format('l, j F'),
            'time' => $service->opens_at->format('g:i A'),
            'opens_at' => $service->opens_at->toIso8601String(),
        ] : null;
    }
}
