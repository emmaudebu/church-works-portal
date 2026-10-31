# Covenant Workforce

Church workforce portal: members, QR attendance, news and events, and elections. The Technical Unit launches first.

Built with Laravel 13, Inertia.js, React, TypeScript, Tailwind CSS and MySQL 8.

## Requirements

PHP 8.3+, Composer, Node 20+, MySQL 8.

## Setup

```sh
composer install
npm install
cp .env.example .env
php artisan key:generate
mysql -uroot -e "CREATE DATABASE covenant_workforce; CREATE DATABASE covenant_workforce_test;"
php artisan migrate --seed
php artisan storage:link
composer run dev
```

The app runs at http://localhost:8000.

## Seeded accounts (not created in production, except the super admin)

| Role | Login | Password |
| --- | --- | --- |
| Super admin | admin@covenantworkforce.test | password |
| Department admin | 08000000001 | password |
| Member | 08000000002 | password |

In production, set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` before seeding. Seeding fails without a password.

## Services

Recurring services are created automatically for active departments. Super admins add as many as they need, on any day, in Settings; `SUNDAY_OPENS`, `SUNDAY_CLOSES`, `WEDNESDAY_OPENS` and `WEDNESDAY_CLOSES` in `.env` are only the starting values. In production, run `php artisan schedule:run` every minute from cron.

The QR scanner needs camera access, which browsers only allow on `https` or `localhost`.

## Installable app

`npm run build` creates the service worker in `public/` and the manifest in `public/build/`. The service worker only stores the app's code, icons and the offline page, never member data. Serve `sw.js` with `Cache-Control: no-cache` so updates reach phones. Installing and offline support need `https`.

## Push notifications

Run `php artisan webpush:vapid` once to create the keys, and keep them: changing them signs every device out of notifications. Set `VAPID_SUBJECT` to a real `mailto:` address. Messages are queued, and `php artisan schedule:run` from cron sends them.

## Elections

Votes are stored with a hash of the voter and position, keyed with `APP_KEY`. Do not change `APP_KEY` while an election is open: the app would no longer recognise who has voted.

## Tests

```sh
php artisan test
```

Tests run against the `covenant_workforce_test` MySQL database.
