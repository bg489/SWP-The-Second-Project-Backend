# AGENTS.md

## Project Context

This is a Node.js Express + MySQL backend for the SU26SWP08 Parking Building Management System.

Business MVP is fixed as:
- One parking building only.
- Parking Manager can configure floors.
- Motorbikes are managed by floor capacity/count, not individual slots.
- Cars are managed by concrete slots.
- QR digital pass replaces physical monthly cards.
- Temporary QR/session cards replace physical guest parking cards.
- Parking Staff handles gate operations, checks violations, and collects fees.

Do not expand the MVP into multi-branch parking, apartment/resident management, camera AI, sensor simulator, fuel/electric vehicle classification, or detailed motorbike slots unless the user explicitly asks.

## Current Backend

Current stack:
- CommonJS modules
- Express 5
- MySQL via `mysql2/promise`
- JWT auth via `jsonwebtoken`
- Password hashing via `bcryptjs`
- Swagger via `swagger-jsdoc` and `swagger-ui-express`

Current database scope in `db/schema.sql`:
- `buildings`
- `users`
- `vehicles`

Current implemented modules:
- Auth: register, login, current user.
- Users: current user profile only.
- Buildings: create/list/detail building.
- Vehicles: user vehicle registration, user vehicle CRUD while pending, admin list/approve/reject.

Key files:
- `src/server.js`: app setup, Swagger, route mounting, errors.
- `src/routes/*.routes.js`: Express routes and Swagger annotations.
- `src/controllers/*.controller.js`: validation, business decisions, responses.
- `src/services/*.service.js`: direct MySQL queries.
- `src/middlewares/auth.middleware.js`: JWT auth, sets `req.user`.
- `src/middlewares/role.middleware.js`: admin authorization.
- `src/utils/response.js`: standard JSON response helpers.
- `src/seed/*.js`: demo users, building, and vehicles.

## Business Roles

MVP roles from the business document:
- Admin: approves accounts/vehicles and handles special account cases.
- Parking Manager: configures building, floors, capacities, car slots, pricing, monthly plans, violation policies, and reports.
- Parking Staff: scans QR, enters plate numbers, issues temporary QR cards, confirms entry/exit, checks violations, and collects fees.
- Registered User: registers vehicles, waits for approval, buys monthly plans or parks by session, uses QR to enter/exit.
- Walk-in Guest: no account; receives temporary QR/session card from staff.

Current code only has `USER` and `ADMIN`. If implementing these roles, add schema/API changes deliberately and keep backward compatibility in mind.

## Core MVP Rules

Building and floors:
- The product manages one parking building, not multiple branches.
- Floors have name/code, vehicle type, capacity or slot count, operational status, and notes.
- Floor status should support active, temporarily locked, maintenance, and not accepting vehicles.

Motorbikes:
- Do not create individual motorbike slots.
- Track total capacity and current parked count per motorbike floor.
- On entry, check remaining capacity.
- On exit, decrease current parked count.

Cars:
- Cars require specific slots.
- Slot statuses should support available, reserved, occupied, maintenance/locked, and conflict.
- Only assign valid available slots.
- Staff confirms the final slot before the car enters.

Vehicles:
- Users can register multiple vehicles.
- Each vehicle is managed independently by plate number, vehicle type, approval status, and active package/session.
- A QR for one vehicle must not be valid for another vehicle.

Monthly plans and fees:
- Monthly plans are purchased per vehicle, not per account.
- Motorbike plans do not apply to cars, and car plans do not apply to motorbikes.
- Expired QR, wrong vehicle, or unapproved vehicle should be handled as no valid package.
- Motorbike walk-in/session parking is charged by turn.
- Car walk-in/session parking is charged by actual parking time.
- Violation fees may be added to the parking session and collected on exit.

QR:
- Monthly QR digital pass validates approved vehicle + active package.
- Temporary QR/session card is used for walk-in guests or users parking by session.
- Temporary QR statuses should support ready, in use, completed/returned, lost/damaged/locked.

Parking sessions:
- Entry flow: scan QR or assign temporary QR, check vehicle/package, check capacity or slot, create session, confirm position.
- Exit flow: scan QR, find active session, calculate fee if needed, include violations, close session.
- Walk-in guests do not need accounts; their info belongs to the temporary QR/session.

Violations:
- Staff records violations manually.
- No camera AI or sensor simulator in MVP.
- Track plate number, vehicle type, violation type, detected time, staff, note/evidence if needed, fee, and status.

Reports:
- Vehicle entry/exit count by date/time/type.
- Motorbike current count, remaining capacity, and full-time events.
- Car slot status summary.
- Revenue by monthly plan, motorbike turn parking, car hourly parking, and violation fees.
- Valid/expiring/expired QR passes.
- Staff-recorded violations.

## Coding Conventions

- Keep the current route -> controller -> service pattern.
- Use `successResponse` and `errorResponse` for all API responses.
- Keep SQL parameterized with `?` placeholders.
- Keep DB column names snake_case and API response fields camelCase.
- Keep enum values uppercase.
- Add Swagger annotations when adding or changing routes.
- Add shared Swagger schemas in `src/config/swagger.js` when reused across endpoints.
- Protect admin/manager/staff operations with auth and role middleware.
- Avoid unrelated refactors.
- Do not commit secrets or expose `.env` values.

## Recommended Implementation Order

1. Role model update
   - Add or map `ADMIN`, `PARKING_MANAGER`, `PARKING_STAFF`, and `USER`.
   - Decide whether existing `ADMIN` also covers manager permissions.

2. One-building and floor management
   - Enforce one active building for MVP.
   - Add floors with type `MOTORBIKE` or `CAR`, capacity/slot count, status, and notes.

3. Motorbike capacity
   - Track current count per motorbike floor.
   - Block entry when capacity is full.

4. Car slots
   - Add car slot table linked to floor.
   - Implement slot status and slot assignment.

5. Pricing and monthly plans
   - Add pricing policies.
   - Add per-vehicle monthly packages with start/end dates and status.

6. QR passes and temporary QR cards
   - Generate/track monthly QR pass per vehicle/package.
   - Prepare reusable or lockable temporary QR/session cards for guests.

7. Parking sessions
   - Implement check-in/check-out for registered users and walk-in guests.
   - Link sessions to vehicle, temporary QR, floor, slot if car, staff, fees, and status.

8. Violations and fines
   - Let staff create violations for a session or vehicle.
   - Add violation fees to exit payment when applicable.

9. Reports
   - Add MVP reports for occupancy, slot status, sessions, revenue, QR status, and violations.

## Implementation Checklist

When adding a module:
- Update `db/schema.sql`.
- Add service, controller, and route files under `src`.
- Mount the route in `src/server.js`.
- Add Swagger docs and shared schemas.
- Add seed data if useful for manual testing.
- Reuse existing response helpers and middleware.
- Validate required fields in controllers.
- Keep service functions focused on database access.
- Keep behavior aligned with the fixed MVP scope above.

## Verification

Useful commands:
- `npm run dev`
- `npm start`
- `npm run seed:users`
- `npm run seed:vehicles`

Manual checks:
- `GET /api/health`
- `GET /api-docs`
- Register/login and use bearer token.
- Register a vehicle as user.
- Approve/reject vehicle as admin.
- For future modules: check motorbike capacity, car slot assignment, QR check-in, QR check-out, fee calculation, and violation fee handling.
