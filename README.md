# Daily Report Management System

Next.js 15 + TypeScript scaffold for employee daily reports, manager review workflows, consolidated reporting, PDF export, and audit logging.

## Included

- App Router structure for employee, report manager, and admin routes
- JWT auth helpers and middleware guards
- MongoDB/Mongoose models
- API route scaffolding
- Shared UI primitives and responsive dashboard shells
- React Hook Form + Zod login and daily report forms
- PDF generation utility

## Setup

1. Copy `.env.example` to `.env.local`
2. Install dependencies
3. Run `npm run dev`

## Seed Default Admin & Initial Login

Run `npm run seed:admin` to create the initial MongoDB database and the default admin account. 

### Fresh Project Login Credentials
Once the database is seeded and the server is running (`npm run dev`), you can log into the system with the following default administrator credentials:

- **Email**: `admin@gmail.com`
- **Password**: `Admin@123@`

*(It is highly recommended to change this password or add your own admin account once you log in).*

## Notes

- The project currently ships as a working scaffold with role-based route structure and core APIs.
- Connect UI pages to live database data and expand the forms/UI as needed for your deployment environment.
