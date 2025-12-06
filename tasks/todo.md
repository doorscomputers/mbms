# Task: Associate Bus with Default Driver

## Goal
When selecting a Bus during Collection entry, automatically fill in the assigned driver (but allow changing if needed). This saves time since most buses have regular drivers.

## Plan

### Database Changes
- [x] Add `defaultDriverId` optional field to Bus model in Prisma schema
- [x] Run `npx prisma db push` to update database

### API Changes
- [x] Update `/api/buses` GET to include default driver in response
- [x] Update `/api/buses/[id]` PUT to handle defaultDriverId updates
- [x] Update `/api/buses` POST to handle defaultDriverId on creation

### UI Changes
- [x] Update Buses management page to show default driver column
- [x] Update Bus edit page to allow assigning a default driver
- [x] Update Bus new page to allow assigning a default driver
- [x] Update Daily Records form to auto-select driver when bus is selected
- [x] Add "Set as default driver" quick action on Daily Records form

## Review

### Changes Made

1. **Schema Change** (`prisma/schema.prisma`)
   - Added `defaultDriverId` optional field to Bus model
   - Added `defaultDriver` relation to Driver model
   - Added reverse `defaultForBuses` relation on Driver model

2. **API Updates**
   - `/api/buses/route.ts`:
     - GET: Added `defaultDriver: true` to include in response
     - POST: Added `defaultDriverId` to create data
   - `/api/buses/[id]/route.ts`:
     - GET: Added `defaultDriver: true` to include
     - PUT: Added `defaultDriverId` to update data

3. **Buses Management Page** (`src/app/dashboard/buses/page.tsx`)
   - Added "Default Driver" column to desktop table
   - Added "Default Driver" field to mobile card view

4. **Bus Edit Page** (`src/app/dashboard/buses/[id]/edit/page.tsx`)
   - Added Driver interface and drivers state
   - Fetches drivers list on load
   - Added "Default Driver" dropdown with "No default driver" option
   - Shows helper text explaining the feature

5. **Bus New Page** (`src/app/dashboard/buses/new/page.tsx`)
   - Added Driver interface and drivers state
   - Fetches drivers list on load
   - Added "Default Driver" dropdown with "No default driver" option
   - Shows helper text explaining the feature

6. **Daily Records Form** (`src/app/dashboard/daily-records/new/page.tsx`)
   - Updated Bus interface to include `defaultDriver`
   - Added useEffect to auto-select driver when bus changes
   - Added "Set as default driver for this bus" link that appears when:
     - A bus is selected
     - A driver is selected
     - The driver is NOT already the default for that bus
   - Shows "Default driver for this bus" text when selected driver matches default

### Files Modified
- `prisma/schema.prisma`
- `src/app/api/buses/route.ts`
- `src/app/api/buses/[id]/route.ts`
- `src/app/dashboard/buses/page.tsx`
- `src/app/dashboard/buses/[id]/edit/page.tsx`
- `src/app/dashboard/buses/new/page.tsx`
- `src/app/dashboard/daily-records/new/page.tsx`

### Build Status
Build successful with no errors.

### How It Works

**Option 1: Set default driver from Bus Management**
1. Go to **Buses** page and click **Edit** on a bus
2. Select a **Default Driver** from the dropdown
3. Save

**Option 2: Set default driver directly from Collection Entry (NEW)**
1. Go to **Daily Records > New**
2. Select a **Bus**
3. Select a **Driver**
4. Click **"Set as default driver for this bus"** link that appears below the driver dropdown
5. The driver is now saved as the default for that bus

**Using the feature:**
- When creating a new Daily Record, selecting a bus will automatically fill in its default driver
- You can still change the driver if needed (e.g., substitute driver)
- If no default driver is set, the driver field stays empty
