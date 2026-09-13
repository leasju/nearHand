1# Roles and Permissions

## Overview

NearHand has three distinct user roles, each with specific permissions and access levels. Authentication is JWT-based with role-scoped tokens that expire after 8 hours.

---

## 1. Admin

**Purpose**: Platform management, moderation, and oversight.

### Authentication
- **Login endpoint**: `POST /auth/login-admin`
- **Credentials**: Email + Password (stored as argon2 hash)
- **Token scope**: Role = "admin"
- **Token expiry**: 8 hours

### Permissions

#### Categories Management
- ✅ View all categories
- ✅ Create new categories
- ✅ Edit categories
- ✅ Delete categories
- ✅ Search categories by name

#### Services Management
- ✅ View all services (across all providers)
- ✅ Edit service details (title, category, description, price, type, negotiable status, service radius)
- ✅ Delete services (cascades: removes messages, evaluations, and requests linked to the service)
- ✅ Bulk delete services (checkbox-based selection)
- ✅ Search services by title or provider name
- ✅ Filter services by status

#### Accounts Management
- ✅ View all accounts (clients and providers combined)
- ✅ Create new accounts (client or provider)
- ✅ Edit account details (name, email, phone, address, CPF/CNPJ for providers)
- ✅ Delete accounts
- ✅ Bulk delete accounts (checkbox-based selection)
- ✅ Search accounts by name/email
- ✅ Filter accounts by type (client, provider)

#### Evaluation Moderation
- ✅ View flagged evaluations (reported by providers as abusive)
- ✅ Approve reports (evaluation becomes visible again)
- ✅ Reject reports (evaluation is permanently deleted)
- ✅ View evaluation details (rating, comment, provider's response)

#### Email Verification Management (v1.0+)
- ✅ View pending registrations awaiting email verification
- ✅ Manually verify pending accounts (if needed)
- ✅ See email verification status for all users

### Admin Dashboard
- Quick overview cards: total categories, services, accounts, flagged evaluations
- Ability to navigate between sections via navbar tabs
- Direct access to each management section

---

## 2. Cliente (Customer/Client)

**Purpose**: Discover services, hire providers, manage bookings, and communicate.

### Authentication
- **Login/Register endpoint**: `POST /auth/register` / `POST /auth/login`
- **Credentials**: Email or Phone + Password (argon2 hash)
- **Email verification**: Required before account activation
- **Token scope**: Role = "cliente"
- **Token expiry**: 8 hours

### Permissions

#### Profile & Settings
- ✅ View own profile (name, photo, address, phone, email)
- ✅ Edit own profile
- ✅ View own address (for proximity searches)
- ✅ Change password
- ✅ Add/edit service preferences (categories of interest)
- ✅ Delete account

#### Service Discovery
- ✅ View public service catalog (filtered by proximity, category, rating, price)
- ✅ Search services by keyword
- ✅ Filter by:
  - Service category
  - Minimum rating (4+, 4.5+)
  - Price range (via search API)
  - Proximity radius (1-30 km)
  - Sort by: closest, best rated, cheapest
- ✅ View service details (description, photos, provider profile, availability, evaluations)
- ✅ View map view of nearby services
- ✅ View provider's availability calendar
- ✅ Access provider's full evaluation history and ratings

#### Requests (Bookings/Quotations)
- ✅ Create a service request (solicitação) with:
  - Proposed date/time (optional)
  - Proposed value (optional)
- ✅ View request status history (requested → confirmed → in progress → completed / cancelled)
- ✅ Cancel confirmed or pending requests
- ✅ View all own requests and their history

#### Chat & Messaging
- ✅ Access chat view with all conversations
- ✅ Open chat from service detail page (initiates consultation without booking)
- ✅ Send messages to providers
- ✅ Receive messages from providers
- ✅ Send quick actions: own address, own phone number
- ✅ Search conversations by provider name or service title
- ✅ Filter conversations by request status (pending, in progress, completed, cancelled)
- ✅ View chat grouped by provider

#### Payments
- ✅ Add payment methods (credit/debit card, Pix)
- ✅ View saved payment methods (last 4 digits)
- ✅ Delete payment methods
- ✅ Select payment method at checkout (if implemented)

#### Favorites
- ✅ Favorite specific services (not the provider)
- ✅ Favorite providers (entire provider, not individual services)
- ✅ View favorites in dedicated section (grouped by provider)
- ✅ Unfavorite services or providers
- ✅ Quick access to provider's other services from favorites

#### Evaluations & Reviews
- ✅ View completed services
- ✅ Rate and review completed services (1-5 stars + comment)
- ✅ Edit own evaluation (if provider hasn't responded)
- ✅ View provider's responses to evaluations
- ✅ Report abusive evaluations (from other clients)

#### Notifications
- ✅ Receive notifications (new message, service confirmed, service started, service completed)
- ✅ View notification inbox
- ✅ Mark notifications as read
- ✅ Clear notification history
- ✅ Badge on Chat nav when unread messages exist

#### Location & Proximity
- ✅ Set default address (geocoded to lat/lng)
- ✅ Use proximity-based search (within X km radius)
- ✅ See distance to each provider in search results

### Restrictions
- ❌ Cannot view other clients' data
- ❌ Cannot message outside of a request context
- ❌ Cannot edit services or create services (provider-only)
- ❌ Cannot access admin panel
- ❌ Cannot see completed request details after 30 days (if implemented)

---

## 3. Prestador (Service Provider)

**Purpose**: Publish services, manage availability, fulfill requests, and communicate with clients.

### Authentication
- **Login/Register endpoint**: `POST /auth/register` / `POST /auth/login`
- **Credentials**: Email or CPF/CNPJ + Password (argon2 hash)
- **Email verification**: Required before account activation
- **Document verification**: CPF/CNPJ stored, validated for uniqueness
- **Token scope**: Role = "prestador"
- **Token expiry**: 8 hours

### Permissions

#### Profile & Settings
- ✅ View own profile (name, photo, address, phone, email)
- ✅ Edit own profile
- ✅ View own address (base location for service radius)
- ✅ Change password
- ✅ Upload/update company photo
- ✅ Delete account

#### Service Management
- ✅ Create services (anúncios) with:
  - Title, category (existing or create new)
  - Detailed description
  - Value (fixed or hourly)
  - Negotiable flag
  - Service radius (1-30 km from provider's address)
  - Carousel photos (2+ required to publish, up to 10)
  - Extended gallery (optional, separate from carousel)
- ✅ Edit services (all fields)
- ✅ Pause services temporarily
- ✅ Delete services
- ✅ Bulk delete services
- ✅ View published services count and details
- ✅ Create categories on-the-fly while publishing

#### Availability & Calendar
- ✅ Set weekly schedule per service (days + hours, e.g., Mon & Wed 9am–12pm)
- ✅ Block specific dates (holidays, vacations, etc.) — applies to all services
- ✅ View provider's calendar (booked dates)
- ✅ Cancel already-scheduled services
- ✅ Set service duration estimates (to prevent double-booking)

#### Requests Management
- ✅ Receive service requests from clients
- ✅ View request details (client info, proposed date, proposed value, service details)
- ✅ Accept requests (status → confirmed)
- ✅ Reject requests (with optional reason)
- ✅ Propose new date/value (negotiation)
- ✅ Mark request as in progress
- ✅ Mark request as completed
- ✅ Cancel confirmed or in-progress requests (with reason)
- ✅ View request history (all statuses)
- ✅ View metrics: total requests, acceptance rate, revenue, completed services

#### Chat & Messaging
- ✅ Access chat view with all conversations
- ✅ Send messages to clients
- ✅ Receive messages from clients
- ✅ Send quick actions: own address, own phone number
- ✅ Send quotations/proposals directly in chat
- ✅ Search conversations by client name or service title
- ✅ Filter conversations by request status (pending, in progress, completed, cancelled)
- ✅ View chat grouped by client

#### Revenue & Payments
- ✅ Add receiving methods (bank account, Pix key, debit card)
- ✅ View saved receiving methods
- ✅ Delete receiving methods
- ✅ View financial history by period (month, year)
- ✅ View total revenue
- ✅ View completed services count
- ✅ View service breakdown (top-selling, best-rated)

#### Evaluations & Reviews
- ✅ View evaluations received (rating, comment, date)
- ✅ Respond publicly to evaluations
- ✅ Report abusive evaluations (flag for admin review)
- ✅ View own rating (average stars)
- ✅ View evaluation trends over time

#### Analytics
- ✅ View provider dashboard with metrics:
  - Total requests (by month/year)
  - Acceptance rate (%)
  - Average rating (stars)
  - Total revenue
  - Services completed
  - Top 5 services by sales
  - Top 5 services by rating
  - Request breakdown by status (pie chart)
- ✅ Filter metrics by month/year

#### Managed Clients
- ✅ View "Clients Served" list (unique clients, grouped by service if multiple)
- ✅ See client contact info (name, phone, email) for follow-up
- ✅ View services provided to each client

### Restrictions
- ❌ Cannot view other providers' data
- ❌ Cannot message clients outside of a request context
- ❌ Cannot view other providers' services
- ❌ Cannot access admin panel
- ❌ Cannot delete their own account if active requests exist (enforced server-side)
- ❌ Cannot edit or cancel completed services (immutable history)
- ❌ Cannot post evaluations (clients only)

---

## 4. Unauthenticated User (Public)

### Permissions
- ✅ Access public home page
- ✅ View login/register forms
- ✅ View public service catalog (if no auth required, depends on implementation)
- ✅ Access admin login page

### Restrictions
- ❌ Cannot create accounts without completing email verification
- ❌ Cannot access any authenticated user features

---

## 5. Access Control Matrix

| Feature | Admin | Client | Provider | Public |
|---------|-------|--------|----------|--------|
| View own profile | ✅ | ✅ | ✅ | ❌ |
| Edit own profile | ✅ | ✅ | ✅ | ❌ |
| Manage categories | ✅ | ❌ | ❌ | ❌ |
| View all services | ✅ | ✅ | ❌ | ✅ |
| Create services | ❌ | ❌ | ✅ | ❌ |
| Edit own services | ❌ | ❌ | ✅ | ❌ |
| Delete services | ✅ (all) | ❌ | ✅ (own) | ❌ |
| View all accounts | ✅ | ❌ | ❌ | ❌ |
| Create accounts | ✅ | ❌ | ❌ | ✅ (via register) |
| Send requests | ❌ | ✅ | ❌ | ❌ |
| Receive requests | ❌ | ❌ | ✅ | ❌ |
| Chat with others | ❌ | ✅ (with providers) | ✅ (with clients) | ❌ |
| Post evaluations | ❌ | ✅ | ❌ | ❌ |
| Respond to reviews | ❌ | ❌ | ✅ | ❌ |
| View analytics | ❌ | ❌ | ✅ | ❌ |
| Moderate reviews | ✅ | ❌ | ❌ | ❌ |

---

## 6. Technical Details

### Authentication Flow
1. **Registration**: User creates account → email verification code sent → user verifies email → account activated
2. **Login**: User enters credentials → server validates → JWT token issued (role-scoped)
3. **API calls**: Client sends token in `Authorization: Bearer <token>` header
4. **Token validation**: FastAPI dependency `get_current_admin()`, `get_current_client_id()`, or `get_current_provider_id()` checks role and user existence

### Token Structure
```json
{
  "sub": "user_id",
  "role": "admin|cliente|prestador",
  "exp": "expiration_timestamp"
}
```

### Password Security
- Algorithm: Argon2 (via `pwdlib`)
- Verification: `verify_password(input, hash)` returns boolean
- Reset: Not yet implemented (roadmap feature)

### Session Management
- **No refresh tokens**: Users must re-login after 8 hours
- **Browser storage**: JWT stored in `localStorage` by frontend
- **CORS**: Configured to allow frontend origin
- **Rate limiting**: Login attempts limited (10 attempts per 5 minutes per IP)

---

## 7. Authorization Patterns in Code

All protected endpoints use dependency injection:

```python
# Admin-only
def admin_function(..., admin: dict = Depends(get_current_admin)):
    # Only admin role passes through
    
# Client-only
def client_function(..., client_id: int = Depends(get_current_client_id)):
    # Only cliente role passes through
    
# Provider-only
def provider_function(..., provider_id: int = Depends(get_current_provider_id)):
    # Only prestador role passes through
```

---

## 8. Roadmap: Permission Enhancements (Future)

- [ ] Password reset (via email link)
- [ ] Two-factor authentication (2FA)
- [ ] API keys for third-party integrations
- [ ] Granular service-level permissions (co-owners)
- [ ] Team/group accounts (for agencies)
- [ ] Audit log of admin actions
- [ ] Session management (revoke tokens, active sessions list)
- [ ] Role-based rate limiting (different quotas per role)
- [ ] Subscription tiers with feature gates (premium providers, enterprise admin)

---

## Questions?

For permission issues or feature requests, open an issue on GitHub or contact the development team.
