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

Sunday and Wednesday services are created automatically for active departments. Set their attendance windows with `SUNDAY_OPENS`, `SUNDAY_CLOSES`, `WEDNESDAY_OPENS` and `WEDNESDAY_CLOSES` in `.env`. In production, run `php artisan schedule:run` every minute from cron.

The QR scanner needs camera access, which browsers only allow on `https` or `localhost`.

## Tests

```sh
php artisan test
```

Tests run against the `covenant_workforce_test` MySQL database.
