# Automated Test Generation Guide

Comprehensive guide to automated test generation in Task Sentinel Phase 4.

## Table of Contents

1. [Overview](#overview)
2. [Test Generation Algorithm](#test-generation-algorithm)
3. [Test Templates](#test-templates)
4. [Mock Generation](#mock-generation)
5. [Coverage Optimization](#coverage-optimization)
6. [Best Practices](#best-practices)
7. [Examples](#examples)

## Overview

Task Sentinel's TestGenerator automatically creates comprehensive test suites by analyzing code structure, identifying test scenarios, and generating tests with mocks.

### Key Features

- **Multi-Framework Support:** Jest, Mocha, Vitest
- **Intelligent Test Scenarios:** Analyzes code to identify edge cases
- **Automatic Mock Generation:** Creates mocks for dependencies
- **Coverage Optimization:** Targets specific coverage goals
- **Template Customization:** Extensible template system

### Supported Test Types

1. **Unit Tests** - Individual function/method testing
2. **Integration Tests** - API endpoint and service integration
3. **E2E Tests** - Complete user workflow testing
4. **Component Tests** - React/Vue component testing

## Test Generation Algorithm

### Phase 1: Code Analysis

```typescript
// Input: Source code
const sourceCode = `
export class UserService {
  constructor(private db: Database, private cache: Cache) {}

  async getUser(id: string): Promise<User> {
    const cached = await this.cache.get(id);
    if (cached) return cached;

    const user = await this.db.findOne({ id });
    if (!user) throw new Error('User not found');

    await this.cache.set(id, user);
    return user;
  }
}
`;

// Analysis Output
{
  type: 'class',
  name: 'UserService',
  dependencies: ['Database', 'Cache'],
  methods: [
    {
      name: 'getUser',
      params: [{ name: 'id', type: 'string' }],
      returns: 'Promise<User>',
      async: true,
      throws: ['Error'],
      branches: 3,
      complexity: 'medium'
    }
  ],
  testScenarios: [
    'should return cached user if exists',
    'should fetch from database if not cached',
    'should throw error if user not found',
    'should cache user after fetching from database'
  ]
}
```

### Phase 2: Scenario Identification

The algorithm identifies test scenarios based on:

1. **Happy Path:** Normal execution flow
2. **Error Cases:** Exception handling
3. **Edge Cases:** Boundary conditions
4. **Branch Coverage:** All conditional paths

```typescript
interface TestScenario {
  description: string;
  type: 'happy' | 'error' | 'edge' | 'branch';
  setup: string[];         // Setup steps
  execution: string;        // Method call
  assertions: string[];     // Expected outcomes
  mocks: MockConfig[];     // Required mocks
}
```

### Phase 3: Test Generation

```typescript
// Generated Test
import { UserService } from './UserService';
import { Database, Cache } from './dependencies';

describe('UserService', () => {
  let userService: UserService;
  let mockDb: jest.Mocked<Database>;
  let mockCache: jest.Mocked<Cache>;

  beforeEach(() => {
    mockDb = {
      findOne: jest.fn()
    } as jest.Mocked<Database>;

    mockCache = {
      get: jest.fn(),
      set: jest.fn()
    } as jest.Mocked<Cache>;

    userService = new UserService(mockDb, mockCache);
  });

  describe('getUser', () => {
    it('should return cached user if exists', async () => {
      const mockUser = { id: '123', name: 'John' };
      mockCache.get.mockResolvedValue(mockUser);

      const result = await userService.getUser('123');

      expect(result).toEqual(mockUser);
      expect(mockCache.get).toHaveBeenCalledWith('123');
      expect(mockDb.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      const mockUser = { id: '123', name: 'John' };
      mockCache.get.mockResolvedValue(null);
      mockDb.findOne.mockResolvedValue(mockUser);

      const result = await userService.getUser('123');

      expect(result).toEqual(mockUser);
      expect(mockCache.get).toHaveBeenCalledWith('123');
      expect(mockDb.findOne).toHaveBeenCalledWith({ id: '123' });
      expect(mockCache.set).toHaveBeenCalledWith('123', mockUser);
    });

    it('should throw error if user not found', async () => {
      mockCache.get.mockResolvedValue(null);
      mockDb.findOne.mockResolvedValue(null);

      await expect(userService.getUser('123')).rejects.toThrow('User not found');
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });
});
```

### Phase 4: Coverage Analysis

```typescript
// Estimate coverage based on generated tests
{
  statements: 95.5,  // 21/22 statements covered
  branches: 100.0,   // 3/3 branches covered
  functions: 100.0,  // 1/1 function covered
  lines: 95.5,       // 21/22 lines covered
  uncovered: [
    { line: 15, reason: 'Cache error handling not covered' }
  ]
}
```

## Test Templates

### Unit Test Template (Jest)

```typescript
// templates/jest-unit.template
import { {{className}} } from './{{fileName}}';
{{#dependencies}}
import { {{name}} } from '{{path}}';
{{/dependencies}}

describe('{{className}}', () => {
  {{#dependencies}}
  let mock{{name}}: jest.Mocked<{{name}}>;
  {{/dependencies}}
  let {{instanceName}}: {{className}};

  beforeEach(() => {
    {{#dependencies}}
    mock{{name}} = {
      {{#methods}}
      {{name}}: jest.fn(){{#if @last}}{{else}},{{/if}}
      {{/methods}}
    } as jest.Mocked<{{name}}>;
    {{/dependencies}}

    {{instanceName}} = new {{className}}({{mockParams}});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('{{methodName}}', () => {
    {{#scenarios}}
    it('{{description}}', async () => {
      // Arrange
      {{#mocks}}
      {{mockSetup}}
      {{/mocks}}

      // Act
      {{#if expectError}}
      await expect({{execution}}).{{assertion}};
      {{else}}
      const result = await {{execution}};
      {{/if}}

      // Assert
      {{#assertions}}
      {{assertion}}
      {{/assertions}}
    });
    {{/scenarios}}
  });
});
```

### Integration Test Template (Supertest)

```typescript
// templates/supertest-integration.template
import request from 'supertest';
import { app } from '../app';
import { setupTestDatabase, teardownTestDatabase } from '../test-utils';

describe('{{endpoint}} {{method}}', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  {{#if requiresAuth}}
  let authToken: string;

  beforeEach(async () => {
    // Get authentication token
    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'test', password: 'test' });
    authToken = response.body.token;
  });
  {{/if}}

  {{#scenarios}}
  it('{{description}}', async () => {
    const response = await request(app)
      .{{method}}('{{endpoint}}')
      {{#if requiresAuth}}
      .set('Authorization', `Bearer ${authToken}`)
      {{/if}}
      {{#if hasBody}}
      .send({{body}})
      {{/if}}
      .expect({{expectedStatus}});

    {{#assertions}}
    {{assertion}}
    {{/assertions}}
  });
  {{/scenarios}}
});
```

### E2E Test Template (Playwright)

```typescript
// templates/playwright-e2e.template
import { test, expect } from '@playwright/test';

test.describe('{{featureName}}', () => {
  {{#if requiresAuth}}
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  {{/if}}

  {{#scenarios}}
  test('{{description}}', async ({ page }) => {
    {{#steps}}
    // {{description}}
    {{action}}
    {{/steps}}

    {{#assertions}}
    {{assertion}}
    {{/assertions}}
  });
  {{/scenarios}}
});
```

### Custom Template Creation

Create custom templates for specific frameworks:

```typescript
// .tasksentinel/templates/custom-test.template
import { describe, it, expect, beforeEach } from 'vitest';
import { {{className}} } from './{{fileName}}';

describe('{{className}}', () => {
  // Your custom template logic
  {{#methods}}
  describe('{{name}}', () => {
    {{#scenarios}}
    it('{{description}}', () => {
      // Test implementation
    });
    {{/scenarios}}
  });
  {{/methods}}
});
```

Configure in `.tasksentinel/qa-config.json`:

```json
{
  "testGeneration": {
    "templates": {
      "unit": ".tasksentinel/templates/custom-test.template"
    }
  }
}
```

## Mock Generation

### Automatic Mock Detection

The generator analyzes code to identify mockable dependencies:

```typescript
class PaymentService {
  constructor(
    private paymentGateway: PaymentGateway,    // External API - Mock
    private database: Database,                 // Database - Mock
    private emailService: EmailService,         // External Service - Mock
    private config: Config                      // Configuration - Don't Mock
  ) {}
}
```

### Mock Strategies

#### 1. Sinon Stubs (Default)

```typescript
import sinon from 'sinon';

const mockPaymentGateway = {
  charge: sinon.stub(),
  refund: sinon.stub()
};

// Setup
mockPaymentGateway.charge.resolves({ success: true, id: 'ch_123' });
mockPaymentGateway.refund.resolves({ success: true });

// Assertions
expect(mockPaymentGateway.charge.calledOnce).toBe(true);
expect(mockPaymentGateway.charge.calledWith({ amount: 1000 })).toBe(true);
```

#### 2. Jest Mocks

```typescript
const mockPaymentGateway = {
  charge: jest.fn(),
  refund: jest.fn()
} as jest.Mocked<PaymentGateway>;

// Setup
mockPaymentGateway.charge.mockResolvedValue({ success: true, id: 'ch_123' });

// Assertions
expect(mockPaymentGateway.charge).toHaveBeenCalledWith({ amount: 1000 });
expect(mockPaymentGateway.charge).toHaveBeenCalledTimes(1);
```

#### 3. MSW (Mock Service Worker) for APIs

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/payments', (req, res, ctx) => {
    return res(ctx.json({ success: true, id: 'ch_123' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### 4. In-Memory Database

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

### Mock Configuration

```json
{
  "testGeneration": {
    "mockStrategies": {
      "api": "msw",
      "database": "in-memory",
      "external": "sinon-stub"
    },
    "mockDefaults": {
      "api": {
        "timeout": 100,
        "responseTime": 50
      },
      "database": {
        "seed": true,
        "fixtures": "./test/fixtures"
      }
    }
  }
}
```

## Coverage Optimization

### Target-Based Generation

Generate tests to achieve specific coverage targets:

```typescript
const generator = new TestGenerator({
  coverageTarget: 90,
  prioritize: 'critical-paths'
});

const result = await generator.generateTests(code, metadata);

// Result includes coverage estimate
console.log(result.coverage); // 92.5
console.log(result.criticalPathCoverage); // 100.0
```

### Uncovered Code Analysis

Identify and address uncovered code:

```typescript
const analysis = generator.analyzeUncovered(code, tests);

analysis.uncovered.forEach(section => {
  console.log(`Line ${section.line}: ${section.reason}`);
  console.log(`Suggested test: ${section.suggestedTest}`);
});

// Generate additional tests for uncovered sections
const additionalTests = await generator.generateForUncovered(analysis.uncovered);
```

### Coverage Priorities

```json
{
  "coverageTargets": {
    "critical": 95,
    "important": 85,
    "standard": 80,
    "low": 70
  },
  "criticalPaths": [
    "src/auth/**",
    "src/payment/**",
    "src/core/**"
  ]
}
```

## Best Practices

### 1. Review Generated Tests

Always review and enhance generated tests:

```typescript
// Generated (baseline)
it('should create user', async () => {
  const result = await userService.createUser({ email: 'test@example.com' });
  expect(result).toBeDefined();
});

// Enhanced (after review)
it('should create user with valid email and return user object', async () => {
  const userData = {
    email: 'test@example.com',
    name: 'Test User',
    role: 'user'
  };

  mockDb.insert.mockResolvedValue({ id: '123', ...userData });

  const result = await userService.createUser(userData);

  expect(result).toMatchObject({
    id: expect.any(String),
    email: userData.email,
    name: userData.name,
    role: userData.role,
    createdAt: expect.any(Date)
  });
  expect(mockDb.insert).toHaveBeenCalledWith(expect.objectContaining(userData));
  expect(mockEmailService.sendWelcome).toHaveBeenCalledWith(result.email);
});
```

### 2. Add Domain-Specific Assertions

```typescript
// Generic assertion (generated)
expect(result.status).toBe(200);

// Domain-specific assertion (enhanced)
expect(result).toMatchBusinessRule('valid_payment', {
  amount: expect.toBePositive(),
  currency: expect.toBeIn(['USD', 'EUR', 'GBP']),
  status: 'completed',
  metadata: expect.toContainPaymentInfo()
});
```

### 3. Organize Tests by Feature

```
tests/
  ├── auth/
  │   ├── login.test.ts
  │   ├── registration.test.ts
  │   └── password-reset.test.ts
  ├── payment/
  │   ├── checkout.test.ts
  │   ├── refund.test.ts
  │   └── webhooks.test.ts
  └── user/
      ├── profile.test.ts
      └── preferences.test.ts
```

### 4. Use Test Factories

```typescript
// test/factories/user.factory.ts
export const createTestUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'user',
  createdAt: new Date(),
  ...overrides
});

// In tests
const user = createTestUser({ email: 'specific@example.com' });
```

### 5. Maintain Test Performance

```typescript
// Slow (avoid)
beforeEach(async () => {
  await setupCompleteDatabase();
  await seedAllData();
});

// Fast (prefer)
beforeAll(async () => {
  await setupCompleteDatabase();
});

beforeEach(async () => {
  await seedMinimalData();
});

afterEach(async () => {
  await cleanupTestData();
});
```

## Examples

### Example 1: REST API Controller

```typescript
// Source: UserController.ts
export class UserController {
  constructor(private userService: UserService) {}

  async getUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await this.userService.getUser(id);
      res.json(user);
    } catch (error) {
      res.status(404).json({ error: 'User not found' });
    }
  }

  async createUser(req: Request, res: Response) {
    try {
      const user = await this.userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

// Generated Test: UserController.test.ts
import { UserController } from './UserController';
import { UserService } from '../services/UserService';
import { Request, Response } from 'express';

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: jest.Mocked<UserService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockUserService = {
      getUser: jest.fn(),
      createUser: jest.fn()
    } as any;

    controller = new UserController(mockUserService);

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getUser', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '123', name: 'John' };
      mockReq = { params: { id: '123' } };
      mockUserService.getUser.mockResolvedValue(mockUser);

      await controller.getUser(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });

    it('should return 404 when user not found', async () => {
      mockReq = { params: { id: '999' } };
      mockUserService.getUser.mockRejectedValue(new Error('Not found'));

      await controller.getUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });

  describe('createUser', () => {
    it('should create user and return 201', async () => {
      const userData = { email: 'test@example.com', name: 'John' };
      const createdUser = { id: '123', ...userData };
      mockReq = { body: userData };
      mockUserService.createUser.mockResolvedValue(createdUser);

      await controller.createUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(createdUser);
    });

    it('should return 400 on validation error', async () => {
      const userData = { email: 'invalid' };
      mockReq = { body: userData };
      mockUserService.createUser.mockRejectedValue(
        new Error('Invalid email')
      );

      await controller.createUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid email'
      });
    });
  });
});
```

### Example 2: Async Service with Complex Logic

```typescript
// Source: OrderService.ts
export class OrderService {
  constructor(
    private db: Database,
    private paymentService: PaymentService,
    private inventoryService: InventoryService,
    private emailService: EmailService
  ) {}

  async createOrder(orderData: CreateOrderDTO): Promise<Order> {
    // Validate inventory
    const available = await this.inventoryService.checkAvailability(
      orderData.items
    );
    if (!available) {
      throw new Error('Items not available');
    }

    // Process payment
    const payment = await this.paymentService.charge({
      amount: orderData.total,
      currency: orderData.currency
    });

    // Create order
    const order = await this.db.orders.create({
      ...orderData,
      paymentId: payment.id,
      status: 'confirmed'
    });

    // Update inventory
    await this.inventoryService.reserve(orderData.items, order.id);

    // Send confirmation
    await this.emailService.sendOrderConfirmation(order);

    return order;
  }
}

// Generated Test: OrderService.test.ts
import { OrderService } from './OrderService';

describe('OrderService', () => {
  let orderService: OrderService;
  let mockDb: jest.Mocked<Database>;
  let mockPaymentService: jest.Mocked<PaymentService>;
  let mockInventoryService: jest.Mocked<InventoryService>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockDb = {
      orders: { create: jest.fn() }
    } as any;

    mockPaymentService = {
      charge: jest.fn()
    } as any;

    mockInventoryService = {
      checkAvailability: jest.fn(),
      reserve: jest.fn()
    } as any;

    mockEmailService = {
      sendOrderConfirmation: jest.fn()
    } as any;

    orderService = new OrderService(
      mockDb,
      mockPaymentService,
      mockInventoryService,
      mockEmailService
    );
  });

  describe('createOrder', () => {
    const orderData = {
      items: [{ id: '1', quantity: 2 }],
      total: 100,
      currency: 'USD'
    };

    it('should create order successfully', async () => {
      mockInventoryService.checkAvailability.mockResolvedValue(true);
      mockPaymentService.charge.mockResolvedValue({ id: 'pay_123' });
      mockDb.orders.create.mockResolvedValue({
        id: 'ord_123',
        ...orderData,
        status: 'confirmed'
      });

      const result = await orderService.createOrder(orderData);

      expect(result.id).toBe('ord_123');
      expect(result.status).toBe('confirmed');
      expect(mockInventoryService.checkAvailability).toHaveBeenCalledWith(
        orderData.items
      );
      expect(mockPaymentService.charge).toHaveBeenCalled();
      expect(mockInventoryService.reserve).toHaveBeenCalled();
      expect(mockEmailService.sendOrderConfirmation).toHaveBeenCalled();
    });

    it('should throw error when items not available', async () => {
      mockInventoryService.checkAvailability.mockResolvedValue(false);

      await expect(orderService.createOrder(orderData)).rejects.toThrow(
        'Items not available'
      );

      expect(mockPaymentService.charge).not.toHaveBeenCalled();
      expect(mockDb.orders.create).not.toHaveBeenCalled();
    });

    it('should rollback on payment failure', async () => {
      mockInventoryService.checkAvailability.mockResolvedValue(true);
      mockPaymentService.charge.mockRejectedValue(
        new Error('Payment failed')
      );

      await expect(orderService.createOrder(orderData)).rejects.toThrow(
        'Payment failed'
      );

      expect(mockDb.orders.create).not.toHaveBeenCalled();
      expect(mockInventoryService.reserve).not.toHaveBeenCalled();
    });
  });
});
```

## CLI Commands

### Generate Tests

```bash
# Generate all tests
npx task-sentinel qa test-gen --task-id task-123

# Generate specific test type
npx task-sentinel qa test-gen --type unit --task-id task-123

# Generate with custom template
npx task-sentinel qa test-gen \
  --template ./custom-template.ts \
  --task-id task-123

# Generate and run immediately
npx task-sentinel qa test-gen --run --task-id task-123
```

### Analyze Coverage

```bash
# Estimate coverage
npx task-sentinel qa estimate-coverage \
  --code ./src/service.ts \
  --tests ./tests/service.test.ts

# Find uncovered code
npx task-sentinel qa uncovered \
  --code ./src/service.ts \
  --tests ./tests/service.test.ts
```

---

**Version:** 1.0.0
**Last Updated:** 2025-10-30
**Maintainers:** Task Sentinel Team
