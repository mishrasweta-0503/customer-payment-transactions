
## Getting Started

A full-stack payment transaction management system built with Next.js (App Router), TypeScript, PostgreSQL, Redis and Prisma ORM. The application handles financial transaction workflows, multi-currency conversions, distributed rate limiting, concurrent execution locks, and mock integrations with external risk assessment and payment processing services.

## Create a local environment file before running the application:
    cp .env.example .env

## Your .env file should contain the following environment settings:
    # Application Setup
    NODE_ENV=development
    PORT=3000
    NEXT_PUBLIC_APP_URL="http://localhost:3000"/"http://localhost:3001"

    # Database Configuration (PostgreSQL)
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/customer_payment?schema=public"

    # Cache & Distributed Lock (Redis)
    REDIS_URL="redis://127.0.0.1:6379"

## Installation
    git clone [https://github.com/mishrasweta-0503/customer-payment-transactions.git]
    cd customer_payment
    npm install

## Database Setup & Seeding
    # Apply database migrations
    npx prisma migrate dev

    # Seed database with initial records
    npm run seed

## Run Development Server
    npm run dev (The application will be accessible at http://localhost:3000 or http://localhost:3001)

## To spin up the application along with PostgreSQL and Redis containers in an isolated environment:
    # Build and start all services in detached mode
    docker-compose up -d --build

    # Inspect container status
    docker-compose ps

## API Documentation & Usage
    Endpoint: GET /api/transactions (Retrieves a paginated list of transactions with optional search and filtering.)

    Endpoint: POST /api/transactions (Creates a new transaction record in DRAFT status)
        {
            "idempotencyKey": "KEY-8832-100",
            "customerId": "CUST-100",
            "beneficiaryName": "John Doe",
            "beneficiaryAccount": "ACC-99887766",
            "sourceCurrency": "AED",
            "destinationCurrency": "USD",
            "sourceAmount": "3500"
        }

    Endpoint: POST /api/transactions/:id/submit (Executes the submission workflow for a DRAFT transaction by performing a risk assessment check and triggering payment processing.)
        {
            "sourceAmount": 3500,
            "sourceCurrency": "AED",
            "destinationCurrency": "USD"
        }

    Endpoint: `POST /external/risk-assessment`
        * **Headers:** `Content-Type: application/json`
        * **Rules:**
        * **Low Risk (`< 5000` AED/source amount):** Assigns a low risk score (`LOW`). Transaction status updates to **`COMPLETED`**.
        * **High Risk (`>= 5000` AED/source amount): Assigns a high risk score (`HIGH`, score >= 85). Transaction status updates to `PENDING_REVIEW`.

    Endpoint: POST /external/payments (Payment Gateway Mock Service)

## How to Test Rate Limiting Section
    The API endpoints are protected by Redis-backed rate limiting (`20 requests per 10-second window` per client IP).
    Endpoint: http://localhost:3001/api/transactions (Method: GET, click send 20 times in less than 10 seconds in postman)
        Response Payload on Rate Limit Exceeded (HTTP 429):
            {
                "error": "Too Many Requests",
                "message": "Rate limit exceeded. Please try again later.",
                "retryAfter": 10
            }