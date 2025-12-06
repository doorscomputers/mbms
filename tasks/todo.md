# Task: Associate Bus with Default Driver

## Goal
When selecting a Bus during Collection entry, automatically fill in the assigned driver (but allow changing if needed). This saves time since most buses have regular drivers.

## Plan

### Database Changes
- [ ] Add `defaultDriverId` optional field to Bus model in Prisma schema
- [ ] Run `npx prisma db push` to update database

### API Changes
- [ ] Update `/api/buses` GET to include default driver in response
- [ ] Update `/api/buses/[id]` PUT to handle defaultDriverId updates

### UI Changes
- [ ] Update Buses management page to allow assigning a default driver
- [ ] Update Daily Records form to auto-select driver when bus is selected

## Implementation Details

1. **Schema Change**: Add optional `defaultDriverId` field to Bus, with relation to Driver
2. **API Update**: Include `defaultDriver` in buses response when fetching
3. **Buses Page**: Add driver dropdown in the bus edit form
4. **Daily Records Form**: When bus changes, if it has a defaultDriver, set the driver field to that driver (user can still change it)

## Review
(To be filled after implementation)
