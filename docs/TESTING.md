# Testing Guide

Welcome to the testing guide for the Daily Report Management System! We use **Vitest** along with **React Testing Library** for our testing needs. Vitest provides a fast, zero-config setup for TypeScript, making it perfect for modern React and Next.js applications.

## Running Tests

To run the test suite, you can use the following commands:

- **Run all tests (once):**
  ```bash
  npm run test
  ```

- **Run tests in UI mode:**
  Vitest comes with a beautiful UI to visualize your tests.
  ```bash
  npm run test:ui
  ```

## Writing Tests

We encourage writing two types of tests:
1. **Unit Tests**: For utility functions, logic, and helpers (e.g., `lib/currency.ts`).
2. **Component Tests**: For testing React components and their behavior using React Testing Library.

### File Structure
Test files should be placed next to the file they are testing and named with a `.test.ts` or `.test.tsx` extension.

For example:
- `lib/currency.ts` -> `lib/currency.test.ts`
- `components/ui/button.tsx` -> `components/ui/button.test.tsx`

### Example: Unit Test
```typescript
import { describe, it, expect } from 'vitest';
import { formatINR } from './currency';

describe('currency formatter', () => {
  it('formats INR correctly', () => {
    expect(formatINR(1000)).toBe('₹1,000');
  });
});
```

### Example: Component Test
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
});
```

## Best Practices
- **Test Behavior, Not Implementation**: Focus on what the code does from the user's perspective (or the consumer of the function) rather than how it does it.
- **Use `screen` queries**: Rely on `@testing-library/react` queries like `getByRole`, `getByText`, etc., to find elements in the DOM.
- **Mock External Services**: When testing API routes or components that fetch data, use Vitest's mocking capabilities (`vi.mock`) to mock external network requests or database connections.
