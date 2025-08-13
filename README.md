# Auto Leads Directory

A comprehensive lead generation platform connecting subprime auto buyers with Buy Here Pay Here dealers in Memphis, TN.

## Features

- 🚗 **Vehicle Search & Filtering** - Advanced search with year, make, model, and down payment filters
- 🏪 **Dealer Directory** - Browse trusted Buy Here Pay Here dealers
- 📝 **Lead Capture** - Two-step pre-qualification form with ADF formatting
- 🔄 **Automated Scraping** - Daily inventory updates from dealer websites
- 📧 **CRM Integration** - GoHighLevel integration for lead management
- 🔒 **Security** - Enterprise-grade security with rate limiting, validation, and encryption

## Tech Stack

### Frontend
- **Next.js 14** - React framework with SSR/ISR
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **React Query** - Server state management
- **React Hook Form + Zod** - Form handling and validation

### Backend
- **Node.js + Express** - REST API server
- **PostgreSQL** - Primary database
- **Puppeteer** - Web scraping
- **Node-cron** - Job scheduling
- **Joi** - Input validation

## Getting Started

### Prerequisites
- Node.js v20.2.1+
- PostgreSQL 15+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/auto-leads-directory.git
cd auto-leads-directory
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

4. Set up PostgreSQL database:
```bash
psql -U postgres
CREATE DATABASE auto_leads_db;
\q
psql -U postgres -d auto_leads_db -f ../infra/schema.sql
```

5. Configure environment variables:

Frontend (.env.local):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Backend (.env):
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/auto_leads_db
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

### Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. In a new terminal, start the frontend:
```bash
cd frontend
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
auto-leads-directory/
├── frontend/                # Next.js frontend application
│   ├── app/                # App router pages
│   ├── components/         # Reusable React components
│   ├── contexts/          # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   └── providers/         # App-level providers
├── backend/                # Express.js backend API
│   └── src/
│       ├── config/        # Database and app config
│       ├── controllers/   # Route controllers
│       ├── middleware/    # Express middleware
│       ├── routes/        # API routes
│       ├── services/      # Business logic
│       └── utils/         # Helper functions
└── infra/                  # Infrastructure files
    └── schema.sql         # Database schema
```

## API Endpoints

### Vehicles
- `GET /api/v1/vehicles` - List vehicles with filters
- `GET /api/v1/vehicles/:vin` - Get vehicle details
- `GET /api/v1/vehicles/featured` - Get featured vehicles

### Dealers
- `GET /api/v1/dealers` - List all dealers
- `GET /api/v1/dealers/:id` - Get dealer details
- `GET /api/v1/dealers/region/:region` - Get dealers by region

### Leads
- `POST /api/v1/leads` - Submit a new lead

### Scraping
- `POST /api/v1/scraper/trigger` - Manually trigger scraping
- `GET /api/v1/scraper/status` - Get scraping status

## Deployment

### Frontend (Vercel)
```bash
vercel --prod
```

### Backend (AWS EC2/ECS)
See deployment guide in `/docs/deployment.md`

## Security Features

- ✅ HTTPS/TLS encryption
- ✅ Rate limiting
- ✅ Input validation & sanitization
- ✅ CORS configuration
- ✅ Helmet.js security headers
- ✅ SQL injection prevention
- ✅ XSS protection

## Testing

```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd backend
npm test

# Run E2E tests
npm run test:e2e
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Support

For support, email support@autoleadsdirectory.com