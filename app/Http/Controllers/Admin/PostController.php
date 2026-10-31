<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PostRequest;
use App\Models\Department;
use App\Models\Post;
use App\Support\CurrentDepartment;
use App\Support\PostImage;
use App\Support\PostNotifier;
use App\Support\RichText;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    /**
     * List posts, drafts included.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Posts/Index', [
            'posts' => Post::managedBy($request->user())
                ->with(['department:id,name', 'author:id,full_name'])
                ->when($request->query('type'), fn ($query, $type) => $query->where('type', $type))
                ->latest()
                ->latest('id')
                ->paginate(15)
                ->withQueryString()
                ->through(fn (Post $post) => [
                    ...$post->only(['id', 'type', 'title']),
                    'published' => $post->isPublished(),
                    'audience' => $post->department?->name ?? 'Whole church',
                    'author' => $post->author?->full_name,
                    'date_label' => $post->created_at->format('j M Y'),
                ]),
            'filters' => $request->only('type'),
        ]);
    }

    /**
     * Show the editor for a new post.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Admin/Posts/Edit', [
            'post' => null,
            'audience' => $this->audience($request),
        ]);
    }

    /**
     * Store a new post.
     */
    public function store(PostRequest $request): RedirectResponse
    {
        $admin = $request->user();
        $departmentId = CurrentDepartment::idFor($admin);

        abort_unless($departmentId || $admin->hasRole('super_admin'), 422, 'You are not assigned to a department.');

        $data = $this->attributes($request);

        if ($request->hasFile('image')) {
            $data['image'] = PostImage::store($request->file('image'));
        }

        $post = Post::create([
            ...$data,
            'department_id' => $departmentId,
            'author_id' => $admin->id,
            'published_at' => $request->boolean('publish') ? now() : null,
        ]);

        $this->notify($request, $post, wasPublished: false);

        return to_route('admin.posts')->with('success', $request->boolean('publish') ? 'Post published.' : 'Draft saved.');
    }

    /**
     * Show the editor for an existing post.
     */
    public function edit(Request $request, Post $post): Response
    {
        $this->authorizeFor($request, $post);

        $post->load('department:id,name');

        return Inertia::render('Admin/Posts/Edit', [
            'post' => [
                ...$post->only(['id', 'type', 'title', 'body', 'venue']),
                'event_date' => $post->event_date?->format('Y-m-d\TH:i'),
                'image_url' => $post->image ? $post->imageUrl() : null,
                'published' => $post->isPublished(),
            ],
            'audience' => $post->department?->name ?? 'Whole church',
        ]);
    }

    /**
     * Update a post.
     */
    public function update(PostRequest $request, Post $post): RedirectResponse
    {
        $this->authorizeFor($request, $post);

        $data = $this->attributes($request);

        if ($request->hasFile('image')) {
            $data['image'] = PostImage::store($request->file('image'), $post->image);
        }

        $wasPublished = $post->isPublished();

        $post->update([
            ...$data,
            'published_at' => $request->boolean('publish') ? ($post->published_at ?? now()) : null,
        ]);

        $this->notify($request, $post, $wasPublished);

        return to_route('admin.posts')->with('success', 'Post saved.');
    }

    /**
     * Delete a post and its cover image.
     */
    public function destroy(Request $request, Post $post): RedirectResponse
    {
        $this->authorizeFor($request, $post);

        if ($post->image) {
            Storage::disk('public')->delete($post->image);
        }

        $post->delete();

        return back()->with('success', 'Post deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function attributes(PostRequest $request): array
    {
        $data = Arr::except($request->validated(), ['image', 'publish', 'notify']);

        return [
            ...$data,
            'body' => RichText::sanitize($data['body']),
            'event_date' => $data['type'] === 'event' ? $data['event_date'] : null,
            'venue' => $data['type'] === 'event' ? ($data['venue'] ?? null) : null,
        ];
    }

    /**
     * Only the moment a post goes live is news; later edits send nothing.
     */
    private function notify(PostRequest $request, Post $post, bool $wasPublished): void
    {
        if (! $wasPublished && $post->isPublished() && $request->boolean('notify')) {
            PostNotifier::send($post);
        }
    }

    private function audience(Request $request): string
    {
        $departmentId = CurrentDepartment::idFor($request->user());

        return $departmentId ? Department::find($departmentId)->name : 'Whole church';
    }

    /**
     * Department admins can only touch their own department's posts, never
     * a church-wide one.
     */
    private function authorizeFor(Request $request, Post $post): void
    {
        $admin = $request->user();

        abort_unless(
            $admin->hasRole('super_admin') || ($post->department_id !== null && $admin->canAccessDepartment($post->department_id)),
            404,
        );
    }
}
