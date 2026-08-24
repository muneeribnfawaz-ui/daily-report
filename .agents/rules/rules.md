# Standardized Rules & Guidelines

These rules apply to API endpoints, database queries, and frontend UI components across the application:

1. **CEO Account Access & Visibility**:
   - CEO profile and details (`/admin/users/[id]` and `/api/users/[id]`) can ONLY be accessed, viewed, or edited by Administrators (`admin`) and that specific CEO user themselves (`user.id === targetUser.id`).
   - All other user roles attempting to access a CEO profile must be denied access (`ApiResponse.forbidden()`).

2. **Role-Based API Authorization Guard**:
   - All API endpoints (except public auth routes `/api/auth/login` and `/api/auth/register`) MUST enforce strict role-based authorization using `authorizeApi(request, allowedRoles)`.
   - If a request is unauthenticated, the API MUST return `ApiResponse.unauthorized()` (`statusCode: 4003`, `httpStatus: 401`).
   - If an authenticated user's role is not included in `allowedRoles`, the API MUST return `ApiResponse.forbidden()` (`statusCode: 4003`, `httpStatus: 403`).

3. **Standardized API Response Structure**:
   - Every API response must return a standardized JSON structure containing:
     - `success`: Boolean (`true` for success, `false` for failure).
     - `status`: String indicator / Status text (e.g. `"SUCCESS"`, `"ERROR"`, `"VALIDATION_ERROR"`, `"UNAUTHORIZED"`).
     - `statusCode`: Number representing a **Custom Application Numeric Status Code** (e.g., `1001` for Login Success, `1002` for Login Error, `2001` for User Created, `4001` for Validation Error, `4003` for Unauthorized Access).
     - `message`: String human-readable description/feedback (e.g. `"User created successfully"`).
     - `data`: Response payload (Object or Array).
     - `pagination`: Pagination metadata object (e.g. `{ page, limit, total, totalPages }` or `null` if unpaginated).

4. **Company Directory Filtering (`type !== 'ceo'`)**:
   - Company Directory endpoints (`/api/admin/companies` and `/api/companies`) must ONLY return workspaces of type `company` (or `type: { $ne: "ceo" }`).
   - Workspaces with `type === "ceo"` are internal executive oversight workspaces and must NEVER be returned in the company directory list.

5. **Name Fields (`firstName`, `lastName`)**:
   - Must not contain numeric digits or special symbols.
   - Allowed characters: Letters, spaces, hyphens, and apostrophes (`/^[a-zA-Z\s'-]+$/`).
   - `firstName` is mandatory; `lastName` is optional.

6. **Indian Phone Number (`phone`)**:
   - Must be a valid 10-digit Indian mobile number.
   - Must start with digits `6`, `7`, `8`, or `9` (`/^(?:\+91|91|0)?[6-9]\d{9}$/`).
   - Optional prefixes (`+91`, `91`, `0`), spaces, or hyphens are automatically sanitized/trimmed.
   - Repetitive or sequential dummy numbers (e.g., `9999999999`, `0000000000`, `1234567890`) are rejected.

7. **Email Address (`email`)**:
   - Must be a valid email format (e.g. `user@example.com`).

8. **Password (`password`)**:
   - Must be at least 8 characters long.
   - Must contain at least one uppercase letter (`[A-Z]`).
   - Must contain at least one lowercase letter (`[a-z]`).
   - Must contain at least one numeric digit (`[0-9]`).
   - Must contain at least one special character (`[^A-Za-z0-9]`).
