<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\User;
use App\Support\PostImage;
use App\Support\ServiceGenerator;
use App\Support\Settings;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class SettingsController extends Controller
{
    private const MINIMUM_TEXT_CONTRAST = 4.5;

    private const MINIMUM_HOVER_CONTRAST = 3.0;

    /**
     * Display the settings screen.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Settings', [
            'colors' => Settings::colors(),
            'defaultColors' => Settings::DEFAULT_COLORS,
            'services' => Settings::services(),
            'whatsapp' => Settings::whatsapp(),
            'popup' => Settings::presentPopup(Settings::popup()),
            'home' => Settings::presentHome(),
            'superAdmins' => User::role('super_admin')->orderBy('full_name')->get(['id', 'full_name', 'email']),
            'candidates' => User::where('status', 'active')
                ->withoutRole('super_admin')
                ->orderBy('full_name')
                ->get(['id', 'full_name']),
            'currentUserId' => $request->user()->id,
        ]);
    }

    /**
     * Save the church name and logos.
     */
    public function updateBranding(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'church_name' => ['required', 'string', 'max:100'],
            'logo_light' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:4096'],
            'logo_dark' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:4096'],
            'reset_logos' => ['boolean'],
        ]);

        Settings::set('church_name', $validated['church_name']);

        foreach (['light', 'dark'] as $variant) {
            $key = "logo_{$variant}";

            if ($request->hasFile($key)) {
                $this->replaceLogo($key, $this->storeLogo($request->file($key)));
            } elseif ($request->boolean('reset_logos')) {
                $this->replaceLogo($key, null);
            }
        }

        return back()->with('success', 'Church details saved.');
    }

    /**
     * Save the theme colours, refusing any that would make text unreadable.
     */
    public function updateColors(Request $request): RedirectResponse
    {
        $hex = ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'];

        $readableOn = fn (string $text, float $minimum, string $message) => function (string $attribute, mixed $value, Closure $fail) use ($text, $minimum, $message) {
            if (preg_match('/^#[0-9a-fA-F]{6}$/', (string) $value) && Settings::contrast($value, $text) < $minimum) {
                $fail($message);
            }
        };

        $tooLight = 'This colour is too light for white text to be readable.';

        Settings::set('colors', $request->validate([
            'primary_900' => [...$hex, $readableOn('#FFFFFF', self::MINIMUM_TEXT_CONTRAST, $tooLight)],
            'primary_700' => [...$hex, $readableOn('#FFFFFF', self::MINIMUM_TEXT_CONTRAST, $tooLight)],
            'primary_500' => [...$hex, $readableOn('#FFFFFF', self::MINIMUM_HOVER_CONTRAST, $tooLight)],
            'gold_500' => [...$hex, $readableOn('#1A1A1A', self::MINIMUM_TEXT_CONTRAST, 'This colour is too dark for dark text to be readable.')],
        ]));

        return back()->with('success', 'Colours saved.');
    }

    /**
     * Save the recurring services and rebuild the upcoming ones nobody has used.
     */
    public function updateServices(Request $request): RedirectResponse
    {
        $rules = [
            'services' => ['present', 'array', 'max:30'],
            'services.*.key' => ['nullable', 'string', 'max:40'],
            'services.*.title' => ['required', 'string', 'max:100'],
            'services.*.day' => ['required', 'integer', 'between:0,6'],
            'services.*.opens' => ['required', 'date_format:H:i'],
            'services.*.closes' => ['required', 'date_format:H:i'],
        ];

        foreach (array_keys((array) $request->input('services')) as $index) {
            $rules["services.{$index}.closes"][] = "after:services.{$index}.opens";
        }

        $validated = $request->validate($rules);

        $known = collect(Settings::services())->pluck('key');
        $used = collect();

        $services = collect($validated['services'])->map(function (array $service) use ($known, $used) {
            $key = $service['key'] ?? null;

            if (! $known->contains($key) || $used->contains($key)) {
                $key = Str::random(12);
            }

            $used->push($key);

            return [...$service, 'key' => $key, 'day' => (int) $service['day']];
        })->values()->all();

        Settings::set('services', $services);

        Service::whereNotNull('recurring_key')
            ->where('opens_at', '>', now())
            ->whereDoesntHave('attendance')
            ->delete();

        ServiceGenerator::generate();

        return back()->with('success', 'Services saved.');
    }

    /**
     * Save the homepage slider and welcome section. Uploaded pictures replace
     * the old ones, which are removed once nothing uses them.
     */
    public function updateHome(Request $request): RedirectResponse
    {
        $picture = ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'];

        $validated = $request->validate([
            'slides' => ['required', 'array', 'min:1', 'max:6'],
            'slides.*.id' => ['nullable', 'string', 'max:40'],
            'slides.*.label' => ['required', 'string', 'max:30'],
            'slides.*.title' => ['required', 'string', 'max:60'],
            'slides.*.accent' => ['nullable', 'string', 'max:60'],
            'slides.*.text' => ['nullable', 'string', 'max:200'],
            'slides.*.image' => $picture,
            'welcome.eyebrow' => ['nullable', 'string', 'max:50'],
            'welcome.title' => ['required', 'string', 'max:100'],
            'welcome.accent' => ['nullable', 'string', 'max:60'],
            'welcome.text' => ['required', 'string', 'max:800'],
            'welcome.button_label' => ['required', 'string', 'max:40'],
            'welcome.button_link' => ['required', 'string', 'max:500', $this->safeLink()],
            'welcome.image' => $picture,
            'welcome.small_image' => $picture,
        ]);

        $current = Settings::home();
        $existing = collect($current['slides'])->keyBy('id');

        foreach ($validated['slides'] as $index => $slide) {
            if (! $request->hasFile("slides.{$index}.image") && ! $existing->has($slide['id'] ?? '')) {
                throw ValidationException::withMessages(["slides.{$index}.image" => 'Please choose a picture for this slide.']);
            }
        }

        $slides = collect($validated['slides'])->map(function (array $slide, int $index) use ($request, $existing) {
            $old = $existing->get($slide['id'] ?? '');

            return [
                'id' => $old['id'] ?? Str::random(12),
                'image' => $request->hasFile("slides.{$index}.image")
                    ? PostImage::store($request->file("slides.{$index}.image"))
                    : $old['image'],
                ...collect($slide)->only(['label', 'title', 'accent', 'text'])->map(fn ($value) => $value ?? '')->all(),
            ];
        })->values()->all();

        $welcome = [
            ...collect($validated['welcome'])->except(['image', 'small_image'])->map(fn ($value) => $value ?? '')->all(),
            'image' => $request->hasFile('welcome.image') ? PostImage::store($request->file('welcome.image')) : $current['welcome']['image'],
            'small_image' => $request->hasFile('welcome.small_image') ? PostImage::store($request->file('welcome.small_image')) : $current['welcome']['small_image'],
        ];

        Settings::set('home', ['slides' => $slides, 'welcome' => $welcome]);

        $this->deleteUnusedHomeImages($current, ['slides' => $slides, 'welcome' => $welcome]);

        return back()->with('success', 'Homepage saved.');
    }

    /**
     * Save the visitor pop-up. Changing the picture or asking to show it again
     * starts every visitor's count from zero.
     */
    public function updatePopup(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:10240'],
            'link' => ['nullable', 'string', 'max:500', $this->safeLink()],
            'alt' => ['required', 'string', 'max:200'],
            'frequency' => ['required', Rule::in(Settings::POPUP_FREQUENCIES)],
            'max_views' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'transition' => ['required', Rule::in(Settings::POPUP_TRANSITIONS)],
            'delay' => ['required', 'integer', 'min:0', 'max:60'],
            'reset_views' => ['boolean'],
            'reset_image' => ['boolean'],
        ]);

        $popup = Settings::popup();
        $restart = $request->boolean('reset_views');

        if ($request->hasFile('image') || $request->boolean('reset_image')) {
            if ($popup['image']) {
                Storage::disk('public')->delete($popup['image']);
            }

            $popup['image'] = $request->hasFile('image') ? $this->storePopupImage($request->file('image')) : null;
            $restart = true;
        }

        Settings::set('popup', [
            ...$popup,
            ...collect($validated)->except(['image', 'reset_views', 'reset_image'])->all(),
            'version' => $popup['version'] + ($restart ? 1 : 0),
        ]);

        return back()->with('success', 'Pop-up saved.');
    }

    /**
     * Save the WhatsApp message templates.
     */
    public function updateWhatsapp(Request $request): RedirectResponse
    {
        Settings::set('whatsapp', $request->validate([
            'greeting' => ['required', 'string', 'max:500'],
            'temp_password' => ['required', 'string', 'max:500', function (string $attribute, mixed $value, Closure $fail) {
                if (! str_contains((string) $value, '{password}')) {
                    $fail('This message must include {password}.');
                }
            }],
        ]));

        return back()->with('success', 'Message templates saved.');
    }

    /**
     * Give someone full control of the system. The admin's password is required
     * because this is the most powerful change in the app.
     */
    public function storeSuperAdmin(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'password' => ['required', 'current_password'],
        ]);

        $user = User::findOrFail($validated['user_id']);

        if (! $user->isActive()) {
            throw ValidationException::withMessages(['user_id' => 'Only an active member can be a super admin.']);
        }

        $user->syncRoles(['super_admin']);

        return back()->with('success', "{$user->full_name} is now a super admin.");
    }

    /**
     * Return a super admin to being a member. You can't remove yourself, which
     * also means there is always at least one left.
     */
    public function destroySuperAdmin(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->hasRole('super_admin'), 404);
        abort_if($request->user()->is($user), 422, 'You can not remove your own super admin role.');

        $user->syncRoles(['member']);

        return back()->with('success', "{$user->full_name} is no longer a super admin.");
    }

    /**
     * Only web addresses and pages on this site, never script links.
     */
    private function safeLink(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) {
            if (! preg_match('#^(https?://|/(?!/))#i', (string) $value)) {
                $fail('Enter a full web address starting with https://, or a page on this site starting with /.');
            }
        };
    }

    /**
     * @param  array<string, mixed>  $old
     * @param  array<string, mixed>  $new
     */
    private function deleteUnusedHomeImages(array $old, array $new): void
    {
        $paths = fn (array $home) => collect($home['slides'])->pluck('image')
            ->push($home['welcome']['image'], $home['welcome']['small_image']);

        $paths($old)->diff($paths($new))
            ->reject(fn (string $path) => str_starts_with($path, '/'))
            ->each(fn (string $path) => Storage::disk('public')->delete($path));
    }

    /**
     * WebP keeps transparent edges at a fraction of a PNG's size.
     */
    private function storePopupImage(UploadedFile $file): string
    {
        $encoded = ImageManager::usingDriver(Driver::class)
            ->decodePath($file->getRealPath())
            ->scaleDown(width: 1500)
            ->encodeUsingMediaType('image/webp', quality: 86);

        $path = 'popups/'.Str::uuid().'.webp';

        Storage::disk('public')->put($path, (string) $encoded);

        return $path;
    }

    private function storeLogo(UploadedFile $file): string
    {
        $encoded = ImageManager::usingDriver(Driver::class)
            ->decodePath($file->getRealPath())
            ->scaleDown(width: 640)
            ->encodeUsingMediaType('image/png');

        $path = 'branding/'.Str::uuid().'.png';

        Storage::disk('public')->put($path, (string) $encoded);

        return $path;
    }

    private function replaceLogo(string $key, ?string $path): void
    {
        if ($old = Settings::get($key)) {
            Storage::disk('public')->delete($old);
        }

        Settings::set($key, $path);
    }
}
