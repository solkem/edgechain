---
name: Backend Task
about: Create API endpoint or backend service
title: "[API] "
labels: ['backend', 'packages/api']
assignees: []
---

## Overview
Brief description of the endpoint/service

## Location
📁 `packages/api/src/routes/your-route.ts`
📁 `packages/api/src/services/your-service.ts`

## API Spec
```typescript
// Endpoint
POST /api/your-endpoint

// Request Body
{
  field1: string;
  field2: number;
}

// Response
{
  success: boolean;
  data: any;
}
```

## Requirements
- [ ] Endpoint accepts correct params
- [ ] Input validation
- [ ] Error handling
- [ ] Response format matches spec
- [ ] Integration with blockchain/contract

## Acceptance Criteria
- [ ] Returns 200 on success
- [ ] Returns appropriate error codes (400, 500)
- [ ] TypeScript types defined
- [ ] Can be called from frontend
- [ ] Logs errors appropriately
