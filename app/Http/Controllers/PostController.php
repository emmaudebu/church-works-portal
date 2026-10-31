<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    /**
     * Display the member feed.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate(['type' => ['nullable', 'in:news,event,announcement']]);

        $user = $request->user();
        $type = $validated['type'] ?? null;

        return Inertia::render('Member/Feed', [
            'type' => $type,
            'posts' => Post::visibleTo($user)
                ->when($type, fn ($query) => $query->where('type', $type))
                ->latest('published_at')
                ->paginate(12)
                ->withQueryString()
                ->through(fn (Post $post) => $post->toCard()),
            'calendar' => $type === 'event'
                ? Post::visibleTo($user)
                    ->where('type', 'event')
                    ->where('event_date', '>=', now()->subMonths(6))
                    ->orderBy('event_date')
                    ->get()
                    ->map(fn (Post $post) => [
                        'id' => $post->id,
                        'title' => $post->title,
                        'date' => $post->event_date->toDateString(),
                    ])
                : [],
        ]);
    }

    /**
     * Display one post. News and events are public; announcements need a login.
     */
    public function show(Request $request, Post $post): mixed
    {
        if (! $request->user() && $post->isPublished() && $post->type === 'announcement') {
            return to_route('login');
        }

        abort_unless($post->isVisibleTo($request->user()), 404);

        return Inertia::render('Posts/Show', [
            'post' => [...$post->toCard(), 'body' => $post->body],
            'related' => ($request->user()?->department_id ? Post::visibleTo($request->user()) : Post::publicFacing())
                ->whereKeyNot($post->id)
                ->latest('published_at')
                ->limit(3)
                ->get()
                ->map->toCard(),
        ]);
    }

    /**
     * Download an event as a calendar file.
     */
    public function calendar(Request $request, Post $post): HttpResponse
    {
        abort_unless($post->type === 'event' && $post->event_date && $post->isVisibleTo($request->user()), 404);

        $format = 'Ymd\THis\Z';

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Covenant Workforce//Events//EN',
            'BEGIN:VEVENT',
            "UID:post-{$post->id}@covenant-workforce",
            'DTSTAMP:'.now()->utc()->format($format),
            'DTSTART:'.$post->event_date->copy()->utc()->format($format),
            'DTEND:'.$post->event_date->copy()->utc()->addHours(2)->format($format),
            'SUMMARY:'.$this->escape($post->title),
            'LOCATION:'.$this->escape((string) $post->venue),
            'URL:'.route('posts.show', $post),
            'END:VEVENT',
            'END:VCALENDAR',
        ];

        return response(implode("\r\n", $lines)."\r\n", headers: [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="event-'.$post->id.'.ics"',
        ]);
    }

    private function escape(string $text): string
    {
        return str_replace(['\\', ';', ',', "\r", "\n"], ['\\\\', '\;', '\\,', '', '\\n'], $text);
    }
}
