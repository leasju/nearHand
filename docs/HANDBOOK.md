# NearHand Handbook

A complete guide to understanding, using, administering, and developing the NearHand platform.

---

## Table of Contents

### Part 1: For Users
1. [Chapter 1: What is NearHand?](#chapter-1-what-is-nearhand)
2. [Chapter 2: Getting Started](#chapter-2-getting-started)
3. [Chapter 3: Roles and Permissions](#chapter-3-roles-and-permissions)
4. [Chapter 4: User Tour - Clients](#chapter-4-user-tour---clients)
5. [Chapter 5: User Tour - Providers](#chapter-5-user-tour---providers)
6. [Chapter 6: FAQ](#chapter-6-faq)

### Part 2: For Administrators
7. [Chapter 7: Admin Dashboard](#chapter-7-admin-dashboard)
8. [Chapter 8: Managing Content](#chapter-8-managing-content)
9. [Chapter 9: Moderation & Safety](#chapter-9-moderation--safety)

### Part 3: For Developers
10. [Chapter 10: Project Structure](#chapter-10-project-structure)
11. [Chapter 11: Local Development Setup](#chapter-11-local-development-setup)
12. [Chapter 12: API Overview](#chapter-12-api-overview)
13. [Chapter 13: Database Schema](#chapter-13-database-schema)
14. [Chapter 14: Authentication & Security](#chapter-14-authentication--security)

### Part 4: Production & Deployment
15. [Chapter 15: Deployment](#chapter-15-deployment)
16. [Chapter 16: Glossary](#chapter-16-glossary)

---

# PART 1: FOR USERS

## Chapter 1: What is NearHand?

### The Problem

Finding reliable local service providers is hard. You search Google, scroll through endless reviews, make phone calls, and still don't know if they're available, trustworthy, or actually good. On the flip side, service providers (plumbers, electricians, cleaners, etc.) struggle to reach customers in their area without spending big on advertising.

### The Solution

NearHand is a **proximity-based platform** that connects clients with service providers in their local area. Think of it as a search engine for local services — but with integrated chat, scheduling, and reviews to complete the entire transaction in one place.

### Key Features

**For Clients (those who need services):**
- Search for services near you (within 1-30 km)
- Filter by category, price, or provider rating
- Chat with providers before hiring
- Manage bookings and track status in real time
- Pay securely via Pix or card
- Leave reviews and ratings

**For Providers (those who offer services):**
- Publish services with photos, price, and availability
- Receive requests from nearby clients
- Communicate via integrated chat
- Track revenue and metrics on your dashboard
- Build reputation through client reviews

**For Admins:**
- Moderate categories and services
- Review and approve/reject flagged content
- Manage user accounts
- Monitor platform health

### Current Status

**Version**: 1.0 (public beta)
**Technology Stack**:
- Frontend: HTML5, CSS3, JavaScript (vanilla)
- Backend: FastAPI (Python 3.14)
- Database: MySQL 8.x
- Email: Resend (for verification emails)
- Maps: Leaflet.js (for proximity visualization)

---

## Chapter 2: Getting Started

### 1. Creating an Account

#### For Clients

1. Visit https://yoursite.com/auth
2. Click **"Criar cadastro"** (Create Account)
3. Select **"Cliente"** (Customer) tab
4. Fill in:
   - Full name
   - Profile photo (upload via drag-drop or click)
   - Default address (street, number, neighborhood, city, state)
   - ZIP code (auto-fills some address fields)
   - Phone number (validated as valid Brazilian mobile)
   - Email
   - Password (8+ characters)
5. Accept Terms & Conditions
6. Click **"Criar conta"** (Create Account)
7. Check your email for a verification code
8. Enter the 6-digit code in the modal
9. ✅ Your account is active!

**Phone Validation**: The system validates your phone in real-time. You'll see:
- 🟢 Green checkmark: valid Brazilian mobile (11 digits, starts with 9, valid area code)
- 🔴 Red error: invalid format or area code
- The placeholder shows format: `(00) 00000-0000`

#### For Providers (Service Providers)

1. Visit https://yoursite.com/auth
2. Click **"Criar cadastro"** (Create Account)
3. Select **"Prestador"** (Provider) tab
4. Fill in:
   - Business/provider name
   - Company photo (upload via drag-drop or click)
   - Default address (used to calculate service radius)
   - ZIP code (auto-fills some address fields)
   - Phone number (validated as valid Brazilian mobile)
   - Email
   - CPF or CNPJ (business ID, must be unique)
   - Password (8+ characters)
5. Accept Terms & Conditions
6. Click **"Criar conta"** (Create Account)
7. Check your email for a verification code
8. Enter the 6-digit code in the modal
9. ✅ Your account is active!

#### Login

1. Go to https://yoursite.com/auth
2. Select your role (Client or Provider)
3. Enter email **or** phone number
4. Enter password
5. Check **"Remember me"** if on a personal device
6. Click **"Entrar"** (Log In)
7. ✅ Redirected to your dashboard

### 2. Your First Search (for Clients)

1. After logging in, you'll see the **Explore** page
2. By default, your location is set to the address you registered
3. Search radius defaults to 10 km (adjust via the slider)
4. To find a service:
   - **Type in the search box**: "electrician", "house cleaning", etc.
   - **Filter by category**: Use the dropdown (Electrical, Cleaning, etc.)
   - **Filter by rating**: 4+ or 4.5+ stars only
   - **Sort results**: Closest, Best Rated, Cheapest
5. Click any service card to view details
6. On the detail page, click **"Consultar"** (Chat) to start a conversation
   - No booking needed yet — just ask questions
7. When ready, click **"Solicitar serviço"** (Request Service) to formally book

---

## Chapter 3: Roles and Permissions

NearHand has three user types. Here's what each can do:

### Client (Cliente)

**You can:**
- Search nearby services (by category, price, rating, distance)
- View provider profiles and past reviews
- Chat with providers (before and after booking)
- Request services and track status
- Make payments via Pix or card
- Leave ratings and reviews
- Favorite providers and services
- View your booking history

**You cannot:**
- Publish services
- See other clients' information
- Access the admin panel

### Provider (Prestador)

**You can:**
- Publish services (with photos, price, availability)
- Receive requests from clients
- Set your availability (weekly schedule + block specific dates)
- Chat with clients
- Track revenue and metrics
- Respond to client reviews
- View clients' contact info for follow-up

**You cannot:**
- See other providers' data
- Access the admin panel
- Post reviews (only clients can)

### Admin

**You can:**
- Manage categories (create, edit, delete)
- Manage all services (view, edit, delete across the platform)
- Manage all accounts (view, create, edit, delete)
- Moderate flagged reviews (approve or delete)
- Email verification status

**You cannot:**
- Post as a user (separate admin identity)

---

## Chapter 4: User Tour - Clients

### 4.1 Home & Search

**Explore Tab**

The default landing page shows:
- **Hero section**: tagline and benefits ("Find who solves it near you")
- **Search bar**: free-text search
- **Location input**: shows your registered address
- **Filters panel**:
  - Category dropdown (All Services, Electrician, Cleaning, etc.)
  - Rating filter (Any, 4+, 4.5+)
  - Sort options (Closest, Best Rated, Cheapest)
  - Distance slider (1–30 km)
  - View toggle: **Cards** (grid) or **Map** (Leaflet)

**Service Cards** show:
- Provider photo
- Service title
- Rating (stars) and distance
- Price (fixed or hourly)
- Quick "Like" button (favorite without clicking through)
- "View" button → detail page

### 4.2 Service Detail Page

Click any service card to open the **detail page**:

**Top section:**
- Carousel of 2–10 photos (drag or click arrows to browse)
- Provider name and rating
- Distance from you
- Negotiable badge (if applicable)

**Middle section:**
- **Service title** (big, bold)
- **Price**: `R$ 120/hora` or `R$ 500 fixo`
- **Description**: full details
- **Provider profile card**:
  - Profile photo
  - Name, location
  - Average rating and review count
  - "Favorite provider" button (heart icon)

**Availability section:**
- Calendar showing next 7 days with available time slots
- Click a date → select time → confirm

**Reviews section:**
- Paginated list of ratings + comments
- Each shows client name (truncated), date, stars, text
- Provider's response (if given)

**Action buttons (at bottom):**
- **"Consultar"** (Chat): Open conversation to ask questions — no booking yet
- **"Solicitar serviço"** (Request Service): Formal booking request

### 4.3 Chat

**Chat Tab** in navbar (includes badge count of unread messages)

**Sidebar (left):**
- **Search**: Filter conversations by provider name or service title
- **Status legend**: Color-coded dots (Pending, In Progress, Done, Cancelled)
- **Conversation list**: grouped by provider name
- Click any to open the thread

**Main area (right):**
- **Conversation header**: provider name, "Last seen 1 hour ago"
- **Message thread**: messages from you and provider, timestamped
- **Input field** (bottom):
  - Type your message
  - Quick actions: **Send Address**, **Send Phone** (pre-filled from your profile)
  - **Send button** (blue)

**Key behaviors:**
- Conversations created when you click "Consultar" on a service
- Same conversation thread if you later book the same service
- Providers can message first (after you start a conversation)
- All messages tied to the service request (solicitação)

### 4.4 Bookings & Requests

**Requests Tab** (also called "Pedidos" / Orders)

Shows all your service requests, grouped by status:

- **Pending** (solicitado): waiting for provider to accept/reject
- **In Progress** (confirmado, em andamento): booked and happening soon
- **Completed** (concluído): finished and eligible for review
- **Cancelled** (cancelado): you or provider cancelled

**Each request card shows:**
- Service photo
- Provider name
- Scheduled date/time
- Agreed price
- Status badge
- **View detail** button

**Clicking a request opens:**
- Full request details (date, price, notes)
- Link to the conversation
- **Cancel request** button (if not completed)
- **Leave review** button (if completed)

### 4.5 Payments

**Settings → Payment Methods**

**To add a payment method:**
1. Click **"+ Add Method"**
2. Choose type: **Pix**, **Credit Card**, or **Debit Card**
3. Enter details (safely — stored on Stripe/server, not browser)
4. Click **Save**

**Your saved methods** are listed with:
- Type (Pix/Card)
- Last 4 digits (for cards)
- Delete option

**At checkout** (future feature):
- Select which payment method to use
- Amount is charged upon service completion

### 4.6 Favorites

**Favorites Tab**

Two sections:

**1. Favorite Services**
- All services you've starred
- Grouped by provider
- Click **"See all services from this provider"** to view their other offerings

**2. Favorite Providers**
- All providers you've starred
- Click **"See services"** to expand and view all their services
- Collapse/expand inline (no navigation away)

### 4.7 Reviews & Ratings

**Reviews Tab** (also "Avaliacoes")

Shows all services you've completed and can review:

**Completed services (eligible for review):**
- Service photo
- Provider name
- Completion date
- **"Review"** button

**Clicking "Review":**
1. Modal opens
2. Select 1–5 stars
3. Add optional comment
4. Click **"Post Review"**

**After posting:**
- Your review shows as "Reviewed" in the list
- Click **"View Review"** to expand and see your stars + text
- Provider can respond (visible to you)

---

## Chapter 5: User Tour - Providers

### 5.1 Dashboard

After logging in, you see the **Provider Dashboard** (Painel):

**Top section: Key Metrics**
- Total requests (this month)
- Acceptance rate (%)
- Average rating (stars)
- Total revenue (this month)

**Middle section: Charts**
- **Top-selling services**: bar chart of your services by sales count
- **Best-rated services**: bar chart of your services by average rating
- **Request breakdown**: pie chart (Pending, Confirmed, In Progress, Completed, Cancelled)

**Bottom section: Upcoming Services**
- Next 5 scheduled services
- Date, time, client, service
- Quick link to the request

**Date filter:** Switch between current month, previous months, or year view

### 5.2 Services Management

**Services Tab** (Meus Anúncios / My Services)

**To publish a new service:**

1. Click **"+ New Service"**
2. Fill form:
   - **Title**: "Residential electrical installation"
   - **Category**: Existing dropdown OR type new name to create
   - **Description**: Full details
   - **Price**: R$ 120 (amount)
   - **Type**: Fixed or Hourly
   - **Negotiable?**: Check if client can negotiate price
   - **Service radius**: 5–30 km from your address
   - **Photos**: 
     - At least 2 required to publish
     - Up to 10 for carousel
     - Click/drag to upload
     - Optional extended gallery (separate from carousel)

3. **Availability (weekly schedule):**
   - For each service, set which days + hours you work
   - Example: Monday & Wednesday, 9am–12pm
   - This is per-service (different services can have different hours)

4. Click **"Publish"**

**Your service list:**

Each service card shows:
- Thumbnail
- Title
- Category
- Price + type
- Service radius
- Current status (Active, Paused, Removed)
- **Edit** button
- **Pause** button (temporarily hide)
- **Delete** button

**Editing a service:**
- Click **Edit**
- Change any field (title, description, price, photos, availability)
- Click **Save**

### 5.3 Availability & Blocking Dates

**Calendar Tab** (Agenda)

**Weekly schedule (per service):**
- Each service has its own schedule
- Example: Service A: Mon & Wed 9am–5pm; Service B: Tue & Thu 2pm–8pm
- Set in the service creation form

**Block specific dates:**
- Click any date to block it (e.g., holiday, vacation)
- Blocked dates apply to ALL services
- Shows as red/unavailable on client's calendar

**Booked dates:**
- Automatically marked when client books you
- Cannot book on those times unless cancelled

### 5.4 Requests & Bookings

**Requests Tab** (Solicitações / Service Requests)

**Incoming requests** show:
- Client name
- Service they want
- Proposed date/time (if provided)
- Proposed price (if different from your listing)
- **Accept**, **Decline**, or **Propose new date/price** buttons

**After accepting:**
- Status changes to "Confirmed"
- Button changes to **"Mark as In Progress"**
- You and client can chat
- After completion, click **"Mark as Completed"** to close

**Request history:**
- View all past requests
- Filter by status (Pending, Confirmed, In Progress, Completed, Cancelled)
- See revenue per request

**Cancellation:**
- You can cancel confirmed requests (must provide reason)
- Client can also cancel pending requests

### 5.5 Chat

**Chat Tab** (same layout as clients)

**Sidebar:**
- Search conversations by client name or service title
- List of conversations (grouped by client)

**Main thread:**
- Messages with client
- Quick actions: **Send Address**, **Send Phone**
- You can propose new price/date directly in chat

### 5.6 Revenue & Payments

**Settings → Payment Methods**

**To add a receiving method:**
1. Click **"+ Add Method"**
2. Choose type: **Pix**, **Bank Account**, or **Card**
3. Enter details:
   - **Pix**: key (email, phone, or random key)
   - **Bank**: bank name, agency, account number
   - **Card**: last 4 digits
4. Click **Save**

**Financial tab** (if available):
- View revenue by month/year
- See per-service breakdown
- Track pending vs. received payments

### 5.7 Reviews & Reputation

**Reviews Tab** (Avaliações)

Shows all reviews left by clients:
- Star rating
- Client comment
- Date

**Your response:**
- Click to add a public response (visible to all)
- Once responded, clients can see your reply

**Report abusive reviews:**
- Flag button to report to admin (if truly offensive)

---

## Chapter 6: FAQ

### "Why isn't my phone accepted during signup?"

Your phone must be a **valid Brazilian mobile number**:
- Exactly 11 digits
- Starts with 9 (in the middle, after area code)
- Valid area code (e.g., 11 for São Paulo, 21 for Rio)

Example: `(11) 98765-4321` → valid ✅

### "How long does email verification take?"

Verification email arrives within **1-2 minutes**. If you don't see it:
1. Check spam folder
2. Click "Resend code" in the modal
3. Try a different email address

### "Can I change my registered address later?"

**Clients**: Yes, anytime in Settings → Edit Profile. Your address is used for proximity searches.

**Providers**: Yes, but it affects your service radius for all published services. Update carefully.

### "How do I cancel a booking?"

1. Go to Requests tab
2. Click the request
3. Click **"Cancel Request"**
4. Optionally provide a reason

**If provider already started**: Contact them via chat first to negotiate cancellation.

### "When do I get paid?"

**Depends on your receiving method:**
- **Pix**: Usually within 1–2 business days
- **Bank transfer**: 3–5 business days
- **Card**: 5–7 business days

Check your **Financial** tab for pending vs. received amounts.

### "Can I favorite a service without viewing it?"

Yes, click the **heart icon** on any service card in search results.

### "How do reviews affect my rating?"

Your rating is an **average of all 5-star reviews** you've received:
- 3 ⭐, 5 ⭐, 4 ⭐ → average = 4.0 ⭐
- Displayed on your profile and service cards
- Updated in real-time

### "What happens if I don't respond to a request?"

The request stays **pending**. Client sees you haven't responded and may contact you via chat. If left too long (72 hours), they may cancel or contact another provider.

### "Can I work part-time?"

Absolutely! Use the **weekly schedule** to set your availability hours per service. You control when you work.

### "What if the client doesn't pay?"

Payment is tied to request completion. If you mark it complete, the client is charged. Disputes go through customer support.

### "How do I report a problematic client?"

1. In the conversation or request, click the **...** (three dots) menu
2. Select **"Report"**
3. Admin will review and take action if needed

---

# PART 2: FOR ADMINISTRATORS

## Chapter 7: Admin Dashboard

### 7.1 Accessing Admin

1. Go to https://yoursite.com/admin/login
2. Enter **admin email** + **password**
3. ✅ Logged into **Admin Dashboard**

### 7.2 The Admin Dashboard

After login, you see **4 quick-access cards**:

- **Categories**: Total count + link to manage
- **Services**: Total count + link to manage
- **Accounts**: Total count + link to manage
- **Flagged Reviews**: Total pending + link to moderate

Each card is clickable and takes you to that management section.

---

## Chapter 8: Managing Content

### 8.1 Categories Management

**Path**: Admin Dashboard → Categories (or left navbar)

**View all categories:**
- Table shows: Name, actions
- Search by name
- Sorted alphabetically

**To create a category:**
1. Click **"+ New Category"**
2. Enter name (e.g., "House Cleaning", "Electrical")
3. Click **Create**
4. ✅ Category live immediately

**To edit a category:**
1. Click category name in the table
2. Edit the name field
3. Click **Save**

**To delete a category:**
1. Click the **X** or **Delete** button next to the category
2. Confirm
3. ⚠️ **Warning**: Services with this category will be unaffected, but new services can't use the deleted category

**Bulk delete:**
- Checkbox next to each category
- **Select all** checkbox at the top
- **Delete selected** button
- Confirm

### 8.2 Services Management

**Path**: Admin Dashboard → Services (or left navbar)

**View all services:**
- Table shows: Service title, provider, category, price, status
- Search by title or provider name
- Filter by status (Active, Paused, Removed)

**To edit a service:**
1. Click service title or **Edit** button
2. Change any field (title, description, price, category, service radius, negotiable flag, status)
3. Click **Save**

**To delete a service:**
1. Click **Delete** button
2. Confirm
3. ⚠️ **Warning**: This cascades!
   - Deletes all linked requests
   - Deletes all linked messages
   - Deletes all linked reviews
   - **This is not reversible!**

**Bulk delete:**
- Checkbox next to each service
- **Select all** checkbox at the top
- **Delete selected** button
- Confirm (will cascade for all selected)

### 8.3 Accounts Management

**Path**: Admin Dashboard → Accounts (or left navbar)

**View all accounts:**
- Table shows: Name, email, type (Client or Provider), created date
- Search by name or email
- Filter by type (Client, Provider)

**To create an account:**
1. Click **"+ New Account"**
2. Choose type: Client or Provider
3. Fill in:
   - Name
   - Email
   - Phone
   - Default address (for clients & providers)
   - CPF/CNPJ (for providers only)
   - Password
4. Click **Create**
5. ✅ Account created and email verification skipped (admin-created accounts are verified)

**To edit an account:**
1. Click account name or **Edit** button
2. Change: name, email, phone, address, CPF/CNPJ
3. ⚠️ **Cannot change password** from admin panel (users reset via email)
4. Click **Save**

**To delete an account:**
1. Click **Delete** button
2. Confirm
3. ⚠️ **Warning**: This cascades!
   - Deletes all their services (if provider)
   - Deletes all their requests
   - Deletes all their messages
   - **This is not reversible!**

**Bulk delete:**
- Checkbox next to each account
- **Select all** checkbox at the top
- **Delete selected** button
- Confirm (will cascade for all selected)

---

## Chapter 9: Moderation & Safety

### 9.1 Flagged Reviews

**Path**: Admin Dashboard → Flagged Reviews (or left navbar)

**Overview:**
- Providers can report reviews they think are abusive
- You review and decide: **Approve** (undo flag) or **Delete** (remove review permanently)

**To moderate a flagged review:**

1. Click the flagged review in the list
2. See:
   - Stars & comment
   - Client name (optional privacy note)
   - Provider's report reason
   - Timestamp
3. Decide:
   - **Approve**: Review was fine, undo the flag → goes live again
   - **Delete**: Review was abusive, remove it → provider's rating improves
4. ✅ Action recorded in audit log (future version)

### 9.2 Email Verification Status

**Path**: Settings (admin) → Email Verification tab (if available)

**Overview:**
- View pending registrations (accounts created but not yet email-verified)
- Manually verify if needed (e.g., user lost verification email and can't resend)

**To manually verify:**
1. Find the pending account
2. Click **Mark Verified**
3. ✅ Account is now active

---

# PART 3: FOR DEVELOPERS

## Chapter 10: Project Structure

```
nearHand/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, all endpoints
│   │   ├── auth.py              # Authentication & JWT logic
│   │   └── database.py          # SQLAlchemy setup
│   ├── venv/                    # Virtual environment
│   ├── .env                     # Environment variables
│   ├── requirements.txt         # Python dependencies
│   ├── create_admin.py          # Script to create first admin
│   ├── seed_demo_listings.py    # Script to populate demo data
│   └── test_*.py                # Test files
├── frontend/
│   ├── *.html                   # Page templates (auth, index, admin)
│   ├── js/
│   │   ├── script.js            # Main app logic (search, chat, requests)
│   │   ├── auth.js              # Login/register logic
│   │   ├── admin.js             # Admin panel logic
│   │   ├── theme.js             # Dark/light mode toggle
│   │   └── ripple.js            # UI ripple effect
│   ├── css/
│   │   ├── styles.css           # Main stylesheet
│   │   └── auth.css             # Auth page styles
│   └── img/                     # Icons, logos, images
├── database/
│   ├── nearhand.sql             # MySQL schema + initial data
│   ├── mer-plataforma-prestadores.png  # ER diagram
├── docs/
│   ├── prd.md                   # Product Requirements Doc
│   ├── ROLES_AND_PERMISSIONS.md # This file
│   ├── HANDBOOK.md              # This comprehensive guide
│   └── mer.html                 # ER diagram viewer
├── README.md                    # Quick start
└── requirements.txt             # Python deps
```

### Key Files at a Glance

| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI application, 2900+ lines, all routes & logic |
| `backend/app/auth.py` | JWT token creation/validation, password hashing |
| `backend/app/database.py` | SQLAlchemy session management, DB connection |
| `frontend/index.html` | Main app (search, chat, requests, settings) |
| `frontend/auth.html` | Login & registration page |
| `frontend/js/script.js` | Core business logic (3280 lines) |
| `database/nearhand.sql` | Schema: 13 tables, 47 columns, cascades |

---

## Chapter 11: Local Development Setup

### 11.1 Prerequisites

- **Python 3.10+**
- **MySQL 8.0+** (or compatible)
- **Node.js 16+** (optional, for build tools)
- **Git**

### 11.2 Clone & Initial Setup

```bash
git clone https://github.com/leasju/nearHand.git
cd nearHand
```

### 11.3 Database Setup

```bash
# Create MySQL database
mysql -u root -p << EOF
CREATE DATABASE nearhand CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nearhand_app'@'localhost' IDENTIFIED BY 'Juli@2007';
GRANT ALL PRIVILEGES ON nearhand.* TO 'nearhand_app'@'localhost';
FLUSH PRIVILEGES;
EOF

# Load schema
mysql -u nearhand_app -p nearhand < database/nearhand.sql
```

### 11.4 Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r ../requirements.txt

# Create .env file (copy from .env.example or use provided defaults)
cp .env.example .env
# Edit .env with your MySQL credentials

# Create first admin user
python create_admin.py
# Follow prompts to set admin name, email, password

# (Optional) Seed demo data
python seed_demo_listings.py

# Start backend server
uvicorn app.main:app --reload
# Server runs on http://localhost:8000
```

### 11.5 Frontend Setup

```bash
# Open frontend/index.html in a browser
# OR serve locally:
cd frontend
python -m http.server 8080
# Visit http://localhost:8080
```

### 11.6 Verify Setup

- **Backend API**: Visit http://localhost:8000/docs (Swagger UI)
- **Frontend**: Visit http://localhost:8080 (or file://path/to/frontend/index.html)
- **Login**:
  - Admin: Use credentials from `create_admin.py`
  - Client/Provider: Sign up in the app (email verification skipped in dev mode)

---

## Chapter 12: API Overview

### 12.1 Base URL & Authentication

```
Base: http://localhost:8000
Auth: Authorization: Bearer <jwt_token>
```

### 12.2 Core Endpoints

#### Authentication

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/auth/register` | Register new client/provider + send verification email |
| `POST` | `/auth/login` | Login, return JWT token |
| `POST` | `/auth/verify-email` | Verify email with 6-digit code |
| `POST` | `/auth/resend-verification-code` | Resend code to email |
| `POST` | `/auth/validate-phone` | Validate phone number in real-time |

#### Services

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/prestadores/{id}/servicos` | Create service (provider-only) |
| `GET` | `/servicos?category=1&raio=10&latitude=...` | Search services (public) |
| `GET` | `/servicos/{id}` | Get service details |
| `PUT` | `/servicos/{id}` | Update service (own only) |
| `DELETE` | `/servicos/{id}` | Delete service (own only / admin) |

#### Requests (Solicitações)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/solicitacoes` | Create booking request |
| `GET` | `/solicitacoes/{id}` | Get request details |
| `PATCH` | `/solicitacoes/{id}/status` | Update status (accept, confirm, complete, cancel) |
| `GET` | `/prestadores/me/solicitacoes` | List my requests (provider) |
| `GET` | `/clientes/me/solicitacoes` | List my requests (client) |

#### Messages (Chat)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/solicitacoes/{id}/mensagens` | Send message |
| `GET` | `/solicitacoes/{id}/mensagens` | Get conversation history |

#### Favorites

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/favoritos` | Favorite a service |
| `DELETE` | `/favoritos/{service_id}` | Unfavorite a service |
| `GET` | `/clientes/me/favoritos` | List my favorite services |
| `POST` | `/favoritos/prestadores` | Favorite a provider |
| `DELETE` | `/favoritos/prestadores/{provider_id}` | Unfavorite provider |

#### Payments

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/clientes/me/metodos-pagamento` | Add payment method |
| `GET` | `/clientes/me/metodos-pagamento` | List client's payment methods |
| `DELETE` | `/clientes/me/metodos-pagamento/{id}` | Delete payment method |

### 12.3 Common Request/Response

**Register:**

```json
POST /auth/register
{
  "tipo": "cliente",
  "nome": "João Silva",
  "email": "joao@example.com",
  "telefone": "11987654321",
  "cep": "01310100",
  "rua": "Avenida Paulista",
  "numero": "1000",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "estado": "SP",
  "foto": "data:image/jpeg;base64,...",
  "senha": "SecurePassword123"
}

Response:
{
  "message": "Verification code sent to email",
  "email": "joao@example.com"
}
```

**Search Services:**

```
GET /servicos?
  category=1&
  latitude=-23.5505&
  longitude=-46.6333&
  raio=10&
  minimo_avaliacao=4&
  tipo_ordenacao=distancia

Response:
{
  "servicos": [
    {
      "id": 42,
      "titulo": "Limpeza Residencial",
      "prestador": {
        "id": 5,
        "nome_empresa": "Limpeza Express",
        "avaliacao_media": 4.8,
        "distancia_km": 2.3
      },
      "valor": 150.00,
      "tipo_valor": "fixo",
      "fotos": ["url1", "url2"],
      "negociavel": true
    }
  ]
}
```

---

## Chapter 13: Database Schema

### 13.1 Core Tables

#### `cliente` — Customer accounts
```sql
id (PK), nome_completo, foto, email, telefone, senha_hash,
endereco_id (FK), preferencias, criado_em
```

#### `prestador` — Service provider accounts
```sql
id (PK), nome_empresa, foto, email, telefone, cpf_cnpj (UNIQUE),
senha_hash, endereco_id (FK), criado_em
```

#### `servico` — Service listings
```sql
id (PK), prestador_id (FK), categoria_id (FK), titulo, descricao,
valor, tipo_valor ('fixo'|'por_hora'), negociavel, raio_atendimento_km,
status ('ativo'|'pausado'|'removido'), criado_em
```

#### `solicitacao` — Booking requests
```sql
id (PK), cliente_id (FK), servico_id (FK), data_hora_agendada,
valor_proposto, status ('solicitado'|'confirmado'|'em_andamento'|'concluido'|'cancelado'),
criado_em
```

#### `mensagem` — Chat messages
```sql
id (PK), solicitacao_id (FK), remetente_id, remetente_tipo ('cliente'|'prestador'),
texto, data_hora
```

#### `avaliacao` — Reviews & ratings
```sql
id (PK), solicitacao_id (FK UNIQUE), nota (1-5), comentario,
resposta_prestador, denunciada, criado_em
```

#### `endereco` — Addresses
```sql
id (PK), cep, rua, numero, complemento, bairro, cidade, estado,
latitude, longitude
```

**Other tables**: categoria, foto_servico, disponibilidade, horario_semanal, favorito, favorito_prestador, metodo_pagamento, metodo_recebimento, notificacao

### 13.2 Key Relationships

- **Cliente/Prestador** → **Endereco** (1:1)
- **Prestador** → **Servico** (1:Many)
- **Servico** → **Solicitacao** (1:Many)
- **Solicitacao** → **Mensagem** (1:Many) & **Avaliacao** (1:1)
- **Solicitacao** → **Cascades on delete** (messages, evaluations, requests)

---

## Chapter 14: Authentication & Security

### 14.1 Token Structure

```python
{
  "sub": "123",           # user_id
  "role": "cliente",      # "admin", "cliente", or "prestador"
  "exp": 1694000000       # expires in 8 hours
}
```

**Algorithm**: HS256 with `SECRET_KEY` from .env

### 14.2 Password Security

- **Hash**: Argon2 (via `pwdlib`)
- **Verification**: `verify_password(input, hash)` → boolean
- **Never stored plain-text**

### 14.3 Rate Limiting

- **Login**: 10 attempts per 5 minutes per IP
- **After 10 failures**: Account temporarily locked, try again later

### 14.4 CORS

- **Allowed origins**: Frontend URL (configured in `main.py`)
- **Allowed methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed headers**: Authorization, Content-Type

### 14.5 Email Verification

- **Code generation**: 6-digit random number
- **Expiry**: 15 minutes
- **Sender**: Resend API (configured in .env)
- **Resend limit**: Once per minute (to prevent spam)

### 14.6 Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nearhand
DB_USER=nearhand_app
DB_PASSWORD=...

# Security
SECRET_KEY=ce84d0fde40...  # Generate with secrets.token_urlsafe(32)
RESEND_API_KEY=re_...

# Email
SENDER_EMAIL=noreply@nearhand.com
```

---

## Chapter 15: Deployment

### 15.1 Deployment Checklist

Before pushing to production:

- [ ] Update `.env` with production database credentials
- [ ] Set `SECRET_KEY` to a strong, random 32-byte string
- [ ] Configure `RESEND_API_KEY` for production email
- [ ] Enable HTTPS (SSL/TLS certificate)
- [ ] Set `CORS_ORIGINS` to production frontend URL only
- [ ] Set `APP_ENV=production` (enables strict security checks)
- [ ] Run database migrations (if any)
- [ ] Set up automated backups for MySQL database
- [ ] Monitor error logs (consider integrating Sentry or similar)

### 15.2 Hosting Options

**Backend (FastAPI):**
- **Heroku**: `pip install -r requirements.txt` → `gunicorn app.main:app`
- **AWS Lambda** (with Mangum adapter)
- **Docker** + Kubernetes
- **Railway**, **Fly.io**, or other Python PaaS

**Frontend (Static HTML/JS):**
- **Vercel**, **Netlify** (free tier available)
- **GitHub Pages**
- **AWS S3 + CloudFront**
- **Any static file host**

**Database (MySQL):**
- **AWS RDS**
- **Google Cloud SQL**
- **DigitalOcean Managed Database**
- **Self-hosted (not recommended for production)**

### 15.3 Example: Heroku Deployment

```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login
heroku login

# Create app
heroku create nearhand-api

# Set environment variables
heroku config:set SECRET_KEY=... DB_HOST=... (from production database)

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

### 15.4 Monitoring & Maintenance

- **Health check endpoint**: `GET /` (returns 200 OK if alive)
- **Error tracking**: Integrate Sentry or similar for error monitoring
- **Database backups**: Daily automated backups to S3 or equivalent
- **Log aggregation**: Ship logs to CloudWatch, DataDog, or ELK stack
- **Uptime monitoring**: Use Pingdom, UptimeRobot, or similar

---

## Chapter 16: Glossary

| Term | Definition |
|------|------------|
| **Solicitação** | A booking request from client to provider (status: pending → confirmed → in progress → completed / cancelled) |
| **Prestador** | Service provider (individual or business offering services) |
| **Cliente** | Customer seeking services |
| **Raio de atendimento** | Service radius in kilometers (how far provider will travel) |
| **Horário semanal** | Weekly schedule per service (e.g., Mon & Wed 9am–5pm) |
| **Negociável** | Price can be negotiated (client can propose different amount) |
| **Avaliação** | Review/rating left by client after service completion (1-5 stars) |
| **Denunciada** | Flagged review (provider reported it as abusive) |
| **Favorito** | Bookmarked service (for quick access later) |
| **Preferências** | Service categories client is interested in (stored on profile) |
| **Email verificado** | Account has completed email verification (required to book/receive requests) |
| **Status da solicitação** | Where a booking stands: solicitado (pending), confirmado (accepted), em_andamento (started), concluido (done), cancelado (cancelled) |
| **Método de pagamento** | How client pays (Pix, credit card, debit card) |
| **Método de recebimento** | How provider receives money (Pix, bank transfer, card) |
| **Geocodificação** | Converting address (text) to latitude/longitude for proximity search |
| **Token JWT** | JSON Web Token used to authenticate API requests (8-hour expiry) |
| **Argon2** | Password hashing algorithm (secure, resistant to brute-force) |
| **Cascata (DELETE)** | When a record is deleted, all linked child records are also deleted |

---

## Quick Links

- **Live app**: https://yoursite.com
- **API docs**: https://api.yoursite.com/docs (Swagger)
- **Bug reports**: https://github.com/leasju/nearHand/issues
- **GitHub repo**: https://github.com/leasju/nearHand
- **Roles & Permissions**: See ROLES_AND_PERMISSIONS.md

---

**Last updated**: 2026-09-13  
**Version**: 1.0  
**Maintained by**: nearHand development team
