# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mini Bus Management System (MBMS) - A Next.js application for managing mini bus fleet operations including cash collections, diesel consumption, driver/operator share computations, maintenance tracking, spare parts inventory, and accounts payable.

## Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
npx prisma generate  # Generate Prisma client (outputs to src/generated/prisma)
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open Prisma database GUI
npx shadcn@latest add <component>  # Add new Shadcn UI components
```

## Tech Stack

- **Framework**: Next.js 16 with App Router (React 19)
- **Database**: PostgreSQL via Supabase with Prisma ORM
- **UI**: Shadcn/ui (new-york style), Tailwind CSS v4, DevExtreme React DataGrid
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

## Architecture

### Path Aliases
- `@/*` maps to `./src/*`

### Database Layer
- Prisma schema: `prisma/schema.prisma`
- Generated client output: `src/generated/prisma`
- Singleton Prisma instance: `src/lib/prisma.ts`
- All monetary values use `Decimal(12, 2)` type

### API Structure
All APIs follow REST conventions in `src/app/api/`:
- Return `{ success: boolean, data?: T, error?: string }`
- Use soft deletes (set `isActive: false`) for main entities
- Include related entities via Prisma `include` when needed

### Key Business Logic
Located in `src/lib/types.ts`:
- `calculateShares()` - Computes operator/driver shares from collections
- `formatCurrency()` - PHP currency formatting
- `getReplacementStatus()` - Tracks spare part replacement cycles

### Share Computation Formula
```
netAfterExpenses = totalCollection - dieselCost - coopContribution - otherExpenses
assigneeShare = netAfterExpenses * (operator.sharePercent / 100)
driverShare = netAfterExpenses * (driver.sharePercent / 100)
```

### Data Relationships
- **Bus** → belongs to **Operator** (assignee)
- **DailyRecord** → links **Bus** + **Driver** for a specific date (unique constraint)
- **MaintenanceRecord** → has cost breakdown (sparePartsCost, laborCost, miscellaneousCost)
- **AccountsPayable** → optionally links to MaintenanceRecord or SparePart

### UI Patterns
- Dashboard pages use DevExtreme DataGrid for CRUD operations
- Forms use Shadcn Card + React Hook Form with real-time computation preview
- Sidebar navigation in `src/components/layout/app-sidebar.tsx`
- Toast notifications via Sonner

## Environment Variables

Required in `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=postgresql://...
```

## Domain Terms
- **Assignee**: The bus operator/owner who receives a share of collections
- **Coop Contribution**: Variable deduction amount per daily record
- **Minimum Collection**: Threshold amount (default 6500 PHP) for share calculations
