# Files Module - User/Guest Tracking

## Overview

The files module now supports tracking which user or guest uploaded each attachment. This is useful for audit trails, access control, and user-specific file management.

## Changes Made

### Database Schema

- Added `userId` and `guestId` nullable fields to the `Attachment` model
- Added `isGlobal` boolean field to the `Attachment` model (defaults to false)
- All fields are indexed for efficient queries
- Migrations: `20251010092058_add_user_guest_to_attachments`, `20251010095301_add_isglobal_to_attachments`

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

#### Get My Attachments

Retrieve attachments for the authenticated user along with global attachments:

- Endpoint: `GET /files/my-attachments`
- Authentication: Required (JWT token)
- Query parameters:
  - `limit` (optional): Number of attachments per page (default: 50)
  - `offset` (optional): Number of attachments to skip (default: 0)

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
formData.append('isGlobal', 'true'); // Optional: mark as global attachment

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
formData.append('isGlobal', 'false'); // Optional: explicitly mark as non-global

await fetch('/files/single', {
  method: 'POST',
  headers: { 'x-upload-key': token },
  body: formData,
});
```

#### Get My Attachments

```typescript
// Get user's attachments with pagination
const response = await fetch('/files/my-attachments?limit=20&offset=0', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
console.log('My attachments:', data.attachments);
console.log('Total count:', data.totalCount);
console.log('Has more:', data.hasMore);
console.log('Pagination:', data.pagination);
```

**Response Format:**

```json
{
  "attachments": [
    {
      "id": "attachment-uuid",
      "type": "pdf",
      "filename": "document.pdf",
      "originalName": "My Document.pdf",
      "expirationDate": "2024-12-31T00:00:00.000Z",
      "userId": "user-uuid",
      "guestId": null,
      "isGlobal": false,
      "targetId": "target-uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "fileType": "document",
      "contentType": "application/pdf",
      "accessToken": "attachment-uuid"
    }
  ],
  "totalCount": 25,
  "hasMore": true,
  "pagination": {
    "limit": 20,
    "offset": 0,
    "nextOffset": 20
  }
}
```

### Backward Compatibility

- Existing `genUploadKey()` calls without user/guest context continue to work
- Uploads without user/guest context will have `userId` and `guestId` as `null`
- All existing functionality remains unchanged

### Database Queries

You can now query attachments by user, guest, or global status:

```sql
-- Find all attachments uploaded by a specific user
SELECT * FROM attachments WHERE user_id = 'user-uuid';

-- Find all attachments uploaded by a specific guest
SELECT * FROM attachments WHERE guest_id = 'guest-uuid';

-- Find all global attachments
SELECT * FROM attachments WHERE is_global = true;

-- Find attachments for a target uploaded by a specific user
SELECT * FROM attachments
WHERE target_id = 'target-uuid' AND user_id = 'user-uuid';

-- Find global attachments for a specific target
SELECT * FROM attachments
WHERE target_id = 'target-uuid' AND is_global = true;

-- Find user's attachments and global attachments (optimized query)
SELECT * FROM attachments
WHERE user_id = 'user-uuid' OR is_global = true
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;
```

### Global Attachments

The `isGlobal` field allows marking attachments as globally accessible:

- **Default**: `false` - attachments are scoped to their target entity
- **Global**: `true` - attachments can be accessed across different contexts
- **Form Data**: Send `isGlobal` as `'true'` or `'false'` string in multipart form
- **Multiple Files**: Use `isGlobalValues[0]`, `isGlobalValues[1]`, etc. for multiple file uploads

### My Attachments Feature

The `GET /files/my-attachments` endpoint provides:

- **User Attachments**: All attachments uploaded by the authenticated user
- **Global Attachments**: All attachments marked as global (`isGlobal: true`)
- **Metadata**: File type, content type, and access tokens for each attachment
- **Pagination**: Configurable limit and offset for large result sets
- **Single Query**: Optimized database query with filtering, sorting, and pagination in one roundtrip
- **Sorting**: Results sorted by creation date (newest first)

### Security Considerations

- Upload tokens are single-use and expire after use
- User/guest information is validated against the token data
- Only one of `userId` or `guestId` should be provided, not both
- Global attachments may have different access control rules
- The system maintains backward compatibility for existing integrations
