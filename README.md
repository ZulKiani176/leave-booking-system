
# Leave Booking System API

This project is a RESTful API built with **TypeScript**, **Express.js**, and **TypeORM** for managing staff leave requests. The system includes role-based access control (Employee, Manager, Admin), JWT-based authentication, and full CRUD functionality for leave requests.

## Features

- 🔐 Secure login with JWT
- 📆 Staff can submit, cancel, and view leave requests
- ✅ Managers can approve/reject and track leave status
- 🛠️ Admins can manage users, roles, departments, and leave usage
- 📊 Reporting endpoints for managers and admins
- 📦 Unit and integration testing with Jest
- ⚠️ Rate limiting, logging, and error handling

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/leave-booking-system.git
cd leave-booking-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root with the following:

```env
PORT=3000
JWT_SECRET=yourSecretKey
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=yourPassword
DB_NAME=leave_db
```

### 4. Start MySQL Server

Ensure MySQL is running locally and a database named `leave_db` exists. You can create it with:

```sql
CREATE DATABASE leave_db;
```

### 5. Run the Application

```bash
npx ts-node src/index.ts
```

---

## Testing

This project uses [Jest](https://jestjs.io/) for testing.

### Run All Tests (Unit + Integration)

```bash
npx jest --runInBand
```

- `--runInBand` is used to ensure Jest runs tests serially (recommended with DB operations).
- Includes tests for leave requests, validation, authentication, and role-based access control.
- Automatically cleans up test users with global teardown script.

---

## Project Structure

```
├── src/
│   ├── controllers/        // Route logic (admin, auth, leave-request)
│   ├── entities/           // TypeORM models (User, Role, LeaveRequest)
│   ├── middleware/         // Auth and role protection
│   ├── utils/              // Logger and helpers
│   ├── validation/         // DTOs and input validation
│   ├── index.ts            // App entry point
├── tests/                  // All Jest tests
├── .env                    // Environment variables
├── tsconfig.json           // TypeScript config
└── README.md               // This file
```

---

## Notes

- Rate limiter and centralized error logger are implemented
- Role-based logic uses constants to lock role IDs (1 = employee, 2 = manager, 3 = admin)
- Test data is cleaned via `global-teardown.ts` after tests run

---

## Author

This project was created by Zul Kiani for COMP50051 as part of a university assignment.
