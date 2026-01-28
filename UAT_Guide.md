# User Testing Guide: Holy Redeemer Library Management System

---

## 1. Introduction

The goal of this session is to test the Holy Redeemer Library Management System for usability and functionality. We want to ensure that the system works as intended in a real-world scenario. Your honest feedback is crucial for our final software engineering project.

---

## 2. System Access

**URL/App Link:** http://localhost:4127

### Understanding Your Role in Testing

During this UAT session, you will test features relevant to your assigned role. Each role has different permissions and capabilities:

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Student** | Browse catalog, view borrowed books, check fines, renew books | Admin functions, manage other users, modify library settings |
| **Librarian** | Check out/return books, manage books, view student history, calculate fines | Admin functions, manage other librarians or admins, modify system settings |
| **Admin** | All librarian functions + manage users, view system reports, configure settings | — (Full access) |

**Testing Credentials:**

| Role      | Username    | Password |
|-----------|-------------|----------|
| Admin     | admin       | admin123 |
| Librarian | librarian   | lib123   |
| Student   | student001  | student123 |

**Environment:** Please use Chrome (desktop) for the best experience.

---

## 3. Core Features to Test

### Role-Based Testing Objectives

| Role | Primary Focus | Key Concerns |
|------|---------------|--------------|
| **Student** | Self-service discovery, personal account management | Can I find books easily? Can I see what I've borrowed? |
| **Admin** | System administration, data management, reporting | Can I manage users and books efficiently? Are reports accurate? |
| **Librarian** | Daily operations, circulation management | Is checkout/return smooth? Are fines calculated correctly? |

---

Please try to complete the following "User Stories" during your session based on your assigned role:

---

### 👨‍🎓 Student Testers

#### Account Management
- Log in as a student
- Verify your dashboard displays borrowed books and due dates
- Test logout functionality

#### The Primary Task (Student)
1. **Browse Catalog:** Search for books by title, author, or subject
2. **View Book Details:** Click on a book to see description, availability, and location
3. **Check Your Books:** View your currently borrowed books on the dashboard
4. **View History:** Access your borrowing history to see past transactions
5. **Check Fines:** Verify if you have any outstanding fines

#### Edge Case Testing (Student)
1. Try to access Admin or Librarian pages (should be blocked)
2. Search for a book that doesn't exist
3. View your profile when you have no borrowed books

---

### 👨‍💼 Admin Testers

#### Account Management
- Log in as an admin
- Verify the admin dashboard displays system overview statistics
- Test logout functionality

#### The Primary Task (Admin)
1. **User Management:**
   - Create a new student account
   - Update existing user information
   - View list of all users in the system
2. **Book Management:**
   - Add a new book with multiple copies
   - Update book details (title, author, category)
   - Remove a book from the catalog
3. **System Overview:** View borrowing statistics and most popular books
4. **Reports:** Generate or view reports on library usage

#### Data Retrieval (Admin)
1. Search for a book by title, author, or ISBN
2. Search for a student by name or ID number
3. View detailed borrowing history for any student
4. View system-wide circulation statistics

#### Edge Case Testing (Admin)
1. Create a user with duplicate username (should fail with error)
2. Delete a book that is currently borrowed (should be blocked)
3. Submit user form with missing required fields
4. Try to create a book with invalid data (negative copies, empty title)

---

### 📚 Librarian Testers

#### Account Management
- Log in as a librarian
- Verify the librarian dashboard shows recent activity
- Test logout functionality

#### The Primary Task (Librarian)
1. **Check Out Workflow:**
   - Navigate to Circulation page
   - Enter or scan student ID
   - Enter or scan book ID/QR code
   - Confirm checkout and verify transaction appears in history
2. **Return Workflow:**
   - Select a borrowed book from student's account
   - Process return
   - Confirm return is recorded and any fines are calculated
3. **Renew Book:**
   - Renew an eligible book for a student
   - Verify new due date is assigned
4. **Book Inventory:**
   - Add a new book to the catalog
   - Update book availability status

#### Data Retrieval (Librarian)
1. Search for books by various criteria (title, author, ISBN, category)
2. Search for students by name or ID
3. View student borrowing history and current fines
4. Check availability of specific books

#### Edge Case Testing (Librarian)
1. Try to check out a book with no available copies
2. Attempt to check out a book to a student with unpaid fines
3. Try to check out beyond the borrowing limit
4. Renew a book that is already overdue
5. Submit a form with missing required information
6. Process a return for a book not borrowed by that student

---

### General Edge Case Testing (All Roles)

1. **Permission Testing:** Try to access pages outside your role (should be blocked)
2. **Form Validation:** Submit forms with missing or invalid data
3. **Logout Behavior:** Verify logging out clears session and requires re-login
4. **Refresh Behavior:** Refresh pages to ensure data persists correctly

---

## 4. How to Report Issues

If you encounter a bug or a confusing interface, please note it in your questionnaire.

For critical errors (like a system crash), please:

1. **Take a screenshot** (Cmd+Shift+4 on Mac or PrtSc on Windows)
2. **Note the steps** you took right before the error happened
3. **Describe** the "Expected" vs. "Actual" result

---

## 5. Testing "Do's and Don'ts"

**DO:**
- ✅ Explore features that aren't on the list if you're curious
- ✅ Speak out loud if you find a specific step confusing
- ✅ Take notes on what feels intuitive vs. difficult
- ✅ Test on different screen sizes if possible (responsive design)
- ✅ Try to complete your assigned user stories from start to finish
- ✅ Document any "workarounds" you discover

**DON'T:**
- ❌ Worry about "breaking" the system—that is exactly what we want to find out now!
- ❌ Feel pressured to give a "good" rating; we need the truth to improve the software
- ❌ Skip features just because they "seem to work"—test the full flow
- ❌ Assume something works without actually testing it
- ❌ Let frustration stop you—note the frustration point and continue
- ❌ Share your login credentials with other testers

---

## UAT Phase: Weekly Testing Schedule

**Project Name:** Holy Redeemer Library Management System

**Lead QA Student:** __________________________

**Testing Period:** ___________________________

---

### Phase 1: Setup & Internal Alpha (Day 1)

**Goal:** Ensure the system is "test-ready."

**Tasks:**
- [ ] Deploy the latest stable build to the testing environment
- [ ] Populate the database with dummy "seed" data
- [ ] Internal Dry Run: The dev team runs through the User Guide once to ensure no "show-stopper" bugs exist
- [ ] Distribute the User Guide and Credentials to invited testers

---

### Phase 2: Managed Testing Sessions (Day 2 – Day 4)

**Goal:** Collect raw data from diverse users.

**Format:** 30-minute slots per tester.

| Time Slot       | Day 2 (Student Testers) | Day 3 (Admin/Librarian Testers) | Day 4 (External/Other) |
|-----------------|-------------------------|-------------------------------|------------------------|
| 09:00 - 09:30   | Tester A (Student)      | Tester E (Admin)              | Tester I (Student)     |
| 10:00 - 10:30   | Tester B (Student)      | Tester F (Librarian)          | Tester J (Admin)       |
| 13:00 - 13:30   | Tester C (Student)      | Tester G (Admin)              | Tester K (Librarian)   |
| 14:00 - 14:30   | Tester D (Student)      | Tester H (Librarian)          | Tester L (Student)     |

**Note:** Each tester should only test the role(s) assigned to them in parentheses. Testing multiple roles allows us to verify proper access controls and role-based permissions.

---

### Phase 3: Data Consolidation (Day 5 Morning)

**Goal:** Analyze the results.

**Tasks:**
- [ ] Collect all UAT Questionnaires
- [ ] Categorize bugs into Critical, Major, and Minor
- [ ] Calculate the average Usability Scores
- [ ] Identify top 3 most common issues

---

### Phase 4: Reporting & Sign-off (Day 5 Afternoon)

**Goal:** Formalize the outcome.

**Tasks:**
- [ ] Complete the UAT Summary Report
- [ ] Create bug priority matrix for fixes
- [ ] Present findings to the "Client" (or Faculty Lead) for final approval
- [ ] Document approved changes and go/no-go decision

---

## Project Management Tips for CCIS Students

### Buffer Time
Advise students to leave **15 minutes** between sessions. This allows them to "reset" the database if a tester changed data that might affect the next person.

**Reset command:**
```bash
cd backend
make reset-db
```

### Onsite vs. Remote
Since module assessments are onsite, encourage teams to hold at least **50% of these sessions** in the computer labs to observe user behavior (where users hesitate, look confused, etc.).

### The "Stop" Rule
If a **Critical** bug is found on Day 2 that prevents further testing, they should:
1. Stop testing immediately
2. Fix it overnight
3. Resume on Day 3 with a fresh build

### Test Coverage Tracking

#### Student Testers Checklist

| Feature                        | Tester A | Tester B | Tester C | ... |
|--------------------------------|----------|----------|----------|-----|
| Login as student               |          |          |          |     |
| Browse/Search catalog          |          |          |          |     |
| View book details              |          |          |          |     |
| View borrowed books            |          |          |          |     |
| View borrowing history         |          |          |          |     |
| Check fines                    |          |          |          |     |
| Access denied for admin pages  |          |          |          |     |

#### Admin Testers Checklist

| Feature                        | Tester A | Tester B | Tester C | ... |
|--------------------------------|----------|----------|----------|-----|
| Login as admin                 |          |          |          |     |
| Create new user                |          |          |          |     |
| Update user information        |          |          |          |     |
| View all users                 |          |          |          |     |
| Add new book                   |          |          |          |     |
| Update book details            |          |          |          |     |
| Remove book                    |          |          |          |     |
| View system statistics         |          |          |          |     |
| Generate reports               |          |          |          |     |

#### Librarian Testers Checklist

| Feature                        | Tester A | Tester B | Tester C | ... |
|--------------------------------|----------|----------|----------|-----|
| Login as librarian             |          |          |          |     |
| Check out book                 |          |          |          |     |
| Return book                    |          |          |          |     |
| Renew book                     |          |          |          |     |
| View circulation history       |          |          |          |     |
| Calculate fines                |          |          |          |     |
| Search books                   |          |          |          |     |
| Search students                |          |          |          |     |
| Add book to catalog            |          |          |          |     |

---

## UAT Questionnaire Template

### Tester Information
- **Name:** __________________
- **Role in Organization:** (Student / Faculty / Admin / Other): ______
- **Technical Proficiency:** (Low / Medium / High): ______
- **Date of Testing:** __________________

### Usability Rating (1-5 Scale, 5 = Excellent)

#### Student Testers

| Aspect                      | Rating | Comments |
|-----------------------------|--------|----------|
| Ease of login               | 1 2 3 4 5 |          |
| Catalog browsing experience  | 1 2 3 4 5 |          |
| Search functionality        | 1 2 3 4 5 |          |
| Viewing borrowed books      | 1 2 3 4 5 |          |
| Understanding due dates/fines| 1 2 3 4 5 |          |
| Overall experience          | 1 2 3 4 5 |          |

#### Admin Testers

| Aspect                      | Rating | Comments |
|-----------------------------|--------|----------|
| Ease of login               | 1 2 3 4 5 |          |
| User management interface    | 1 2 3 4 5 |          |
| Book management interface   | 1 2 3 4 5 |          |
| System reports clarity      | 1 2 3 4 5 |          |
| Navigation between modules  | 1 2 3 4 5 |          |
| Overall experience          | 1 2 3 4 5 |          |

#### Librarian Testers

| Aspect                      | Rating | Comments |
|-----------------------------|--------|----------|
| Ease of login               | 1 2 3 4 5 |          |
| Checkout process            | 1 2 3 4 5 |          |
| Return process              | 1 2 3 4 5 |          |
| Fine calculation clarity    | 1 2 3 4 5 |          |
| Student/book search         | 1 2 3 4 5 |          |
| Overall experience          | 1 2 3 4 5 |          |

#### Common Aspects (All Roles)

| Aspect                | Rating | Comments |
|-----------------------|--------|----------|
| Navigation clarity    | 1 2 3 4 5 |          |
| Error messages        | 1 2 3 4 5 |          |
| Page load speed       | 1 2 3 4 5 |          |
| Visual design         | 1 2 3 4 5 |          |

### Bugs / Issues Found

| # | Description | Steps to Reproduce | Severity (Critical/Major/Minor) | Screenshot Attached? |
|---|-------------|-------------------|--------------------------------|---------------------|
| 1 |             |                   |                                |                     |
| 2 |             |                   |                                |                     |
| 3 |             |                   |                                |                     |

### What Went Well?
(What features or workflows worked smoothly for you?)
- _________________________________________________
- _________________________________________________

### What Needs Improvement?
(What was confusing, difficult, or frustrating?)
- _________________________________________________
- _________________________________________________

### Most Confusing Moment
Describe the point where you felt most lost or unsure what to do:
- _________________________________________________
- _________________________________________________

### Feature Suggestions
If you could add, change, or remove one thing, what would it be?
- _________________________________________________
- _________________________________________________

### Additional Comments
- _________________________________________________
- _________________________________________________

---

## Appendix: Quick Reference for Testers

### Common Workflows

#### 👨‍💼 Admin Workflow
1. **Login** as admin
2. **Dashboard** → View system-wide statistics and overview
3. **Users** → Manage student, librarian, and admin accounts
   - Create new accounts
   - Update existing user details
   - Deactivate accounts
4. **Books** → Full catalog management
   - Add new books with multiple copies
   - Edit book metadata
   - Remove books from system
5. **Reports** → Generate usage and circulation reports
6. **Settings** → Configure system rules (borrowing limits, fine rates)

#### 👨‍🎓 Student Workflow
1. **Login** as student
2. **Dashboard** → View currently borrowed books and due dates
3. **Catalog** → Search and browse available books
   - Filter by category, author, title
   - View book details and availability
4. **My Books** → View borrowing history and fines
5. **Profile** → Update personal information

#### 📚 Librarian Workflow
1. **Login** as librarian
2. **Dashboard** → View recent circulation activity
3. **Circulation** → Check out and return books
   - Enter student ID and book ID/scan QR
   - Process returns and calculate fines
   - Renew books for students
4. **Books** → Add new books and update inventory
5. **Students** → Search students and view borrowing history
6. **Transactions** → View recent checkouts and returns

### Troubleshooting

#### Common Issues (All Roles)

| Issue | Possible Solution |
|-------|-------------------|
| Can't login | Check username/password, try clearing browser cache |
| Page not loading | Check internet connection, refresh the page |
| Session timeout | Log in again after 15 minutes of inactivity |
| Permission denied | Verify you're logged in with the correct role |

#### Student-Specific Issues

| Issue | Possible Solution |
|-------|-------------------|
| Can't find a book | Try different search terms (title, author, ISBN) |
| Book shows unavailable | It may be checked out by another student |
| Wrong due date shown | Check if you renewed the book recently |
| Can't access admin pages | Expected - students don't have admin access |

#### Admin-Specific Issues

| Issue | Possible Solution |
|-------|-------------------|
| Can't create user | Username may already exist or fields are missing |
| Can't delete book | Book may be currently borrowed |
| Reports not loading | Try refreshing or check database connection |
| User update fails | Verify all required fields are filled |

#### Librarian-Specific Issues

| Issue | Possible Solution |
|-------|-------------------|
| Checkout fails | Student may have reached borrowing limit or has unpaid fines |
| Return not processing | Verify book ID is correct and book exists |
| Fine calculation wrong | Check if fine rates are configured correctly |
| QR code not scanning | Ensure proper lighting, hold steady, clean the code |
| Renew fails | Book may be overdue or at max renewals |

---

## Pre-UAT Checklist for QA Team

Before starting Day 1 testing, verify:

### System Readiness
- [ ] Backend server running on port 8080
- [ ] Frontend running on port 4127
- [ ] Database populated with seed data (test books, students, etc.)
- [ ] All demo accounts working (admin, librarian, student001)

### Test Environment
- [ ] Testing URL accessible to all testers
- [ ] Credentials distributed securely
- [ ] Browser compatibility verified (Chrome recommended)
- [ ] Network connectivity stable

### Test Data
- [ ] At least 10+ books in catalog with varying availability
- [ ] 5+ student accounts created
- [ ] Some students have borrowed books
- [ ] Some students have outstanding fines
- [ ] Mix of available and unavailable books

### Documentation
- [ ] UAT Guide distributed to all testers
- [ ] Questionnaire forms ready (digital or printed)
- [ ] Bug tracking template prepared
- [ ] Contact info for QA team shared

---

**Document Version:** 1.1
**Last Updated:** January 23, 2026
**Prepared by:** Holy Redeemer LMS Development Team

**Changes in v1.1:**
- Added dedicated testing scenarios for Student role
- Added dedicated testing scenarios for Admin role
- Enhanced Librarian testing scenarios
- Added role-specific troubleshooting guides
- Expanded test coverage checklists for all roles
- Added role-based testing objectives table
- Enhanced usability rating sections by role
- Added role understanding section
- Added Pre-UAT checklist for QA team
