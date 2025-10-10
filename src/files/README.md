# Files Module - User/Guest Tracking

## Overview

The files module now supports tracking which user or guest uploaded each attachment. This is useful for audit trails, access control, and user-specific file management.

## Changes Made

### Database Schema

- Added `userId` and `guestId` nullable fields to the `Attachment` model
- Both fields are indexed for efficient queries
- Migration: `20251010092058_add_user_guest_to_attachments`

### API Changes

#### Generate Upload Token with User/Guest Context

```typescript
POST /files/token
{
  "targetId": "uuid-of-target-entity",
  "userId": "uuid-of-user", // optional
  "guestId": "uuid-of-guest" // optional
}
```

#### Upload Files

The upload process now automatically tracks the user/guest information from the token:

- Single file: `POST /files/single`
- Multiple files: `POST /files/multiple`

### Usage Examples

#### For Authenticated Users

```typescript
// Generate token with user context
const tokenResponse = await fetch('/files/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetId: 'task-uuid',
    userId: 'user-uuid',
  }),
});

const { token } = await tokenResponse.json();

// Upload file using the token
const formData = new FormData();
formData.append('file', file);
formData.append('expirationDate', '2024-12-31');

await fetch('/files/single', {
  method: 'POST',
  headers: { 'x-upload-key': token },
  body: formData,
});
```

#### For Guests

```typescript
// Generate token with guest context
const tokenResponse = await fetch('/files/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetId: 'support-ticket-uuid',
    guestId: 'guest-uuid',
  }),
});

const { token } = await tokenResponse.json();

// Upload file using the token
const formData = new FormData();
formData.append('file', file);

await fetch('/files/single', {
  method: 'POST',
  headers: { 'x-upload-key': token },
  body: formData,
});
```

### Backward Compatibility

- Existing `genUploadKey()` calls without user/guest context continue to work
- Uploads without user/guest context will have `userId` and `guestId` as `null`
- All existing functionality remains unchanged

### Database Queries

You can now query attachments by user or guest:

```sql
-- Find all attachments uploaded by a specific user
SELECT * FROM attachments WHERE user_id = 'user-uuid';

-- Find all attachments uploaded by a specific guest
SELECT * FROM attachments WHERE guest_id = 'guest-uuid';

-- Find attachments for a target uploaded by a specific user
SELECT * FROM attachments
WHERE target_id = 'target-uuid' AND user_id = 'user-uuid';
```

### Security Considerations

- Upload tokens are single-use and expire after use
- User/guest information is validated against the token data
- Only one of `userId` or `guestId` should be provided, not both
- The system maintains backward compatibility for existing integrations
