# Loading Overlay Implementation Guide

## Overview
The CRM now has a global loading overlay system that shows a "Please wait..." indicator when performing database operations. This improves user experience by providing clear feedback during async operations.

## How It Works

### 1. **LoadingProvider** (Global Context)
Located in `src/components/LoadingOverlay.tsx`, this provider wraps the entire application and manages the loading state globally.

### 2. **useLoading Hook**
Available in any component to trigger loading states:

```typescript
import { useLoading } from "@/components/LoadingOverlay";

const { withLoading } = useLoading();
```

## Usage Examples

### Basic Usage with Fetch
```typescript
async function deleteMember() {
  try {
    const response = await withLoading(
      fetch(`/api/users/${id}`, { method: "DELETE" }),
      "Removing team member..."  // Custom message
    );
    
    if (!response.ok) {
      throw new Error("Failed to delete");
    }
    
    showToast("Success!");
  } catch (error) {
    showToast("Failed", "error");
  }
}
```

### With Multiple Operations
```typescript
async function createUser(formData) {
  try {
    await withLoading(
      async () => {
        const res = await fetch("/api/users", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed");
        await fetchUsers(); // Refresh list
      },
      "Creating user..."
    );
    
    showToast("User created!");
  } catch (error) {
    showToast("Failed to create user", "error");
  }
}
```

### Custom Messages for Different Actions
```typescript
// Adding
await withLoading(promise, "Adding team member...");

// Updating
await withLoading(promise, "Updating information...");

// Deleting
await withLoading(promise, "Removing item...");

// Assigning
await withLoading(promise, "Assigning lead...");

// Moving
await withLoading(promise, "Moving to public pool...");
```

## Implementation Checklist

### Files Already Updated ✅
- [x] `src/components/LoadingOverlay.tsx` - Created
- [x] `src/app/layout.tsx` - Provider added
- [x] `src/app/admin/sales/page.tsx` - All operations wrapped
- [x] `src/app/admin/leads/page.tsx` - All operations wrapped

### Files That Need Updates
Apply the same pattern to these files:

#### Sales Pages
- [ ] `src/app/sales/leads/page.tsx`
- [ ] `src/app/sales/page.tsx`

#### Admin Pages  
- [ ] `src/app/admin/page.tsx`
- [ ] `src/app/admin/activity/page.tsx`
- [ ] `src/app/admin/reports/page.tsx`

#### Public Pool
- [ ] `src/app/public-pool/page.tsx`

#### Components (if they have direct API calls)
- [ ] `src/components/LeadDetails.tsx`
- [ ] `src/components/NotesPanel.tsx`

## Step-by-Step Implementation for Each Page

1. **Import the hook**
   ```typescript
   import { useLoading } from "@/components/LoadingOverlay";
   ```

2. **Initialize in component**
   ```typescript
   const { withLoading } = useLoading();
   ```

3. **Wrap all fetch operations**
   ```typescript
   // Before
   const res = await fetch("/api/endpoint", { method: "POST" });
   
   // After
   const res = await withLoading(
     fetch("/api/endpoint", { method: "POST" }),
     "Action in progress..."
   );
   ```

4. **Test the operation** - Click the button and verify the overlay appears

## Visual Design
The loading overlay:
- ✅ Full-screen semi-transparent backdrop
- ✅ Centered white card with shadow
- ✅ Spinning blue loader icon
- ✅ Custom message text
- ✅ High z-index (100) to appear above modals

## Notes
- The overlay automatically dismisses when the promise resolves/rejects
- Multiple calls queue properly (latest message shows)
- Works with existing Toast notifications
- Does not interfere with modal dialogs
- Provides visual feedback for operations that take >100ms

## Testing
Test each operation to ensure:
1. Overlay appears immediately on button click
2. Custom message displays correctly
3. Overlay dismisses after operation completes
4. Error handling still works
5. Toast notifications appear after overlay dismisses
