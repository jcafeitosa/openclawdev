# Provider Core System

Centralized provider logic for OpenClaw.

## Overview

This module provides a single source of truth for all provider-related functionality:

- **Normalization**: Unified provider ID and model ID normalization
- **Capabilities**: Provider and model capability tracking and validation
- **Health**: Provider health monitoring and automatic fallback (basic implementation)
- **Types**: Shared type definitions for consistent typing across the codebase

## Usage

### Normalization

```typescript
import { normalizeProviderId, parseModelRef, modelKey } from "./providers/core/index.js";

// Normalize provider IDs
normalizeProviderId("z-ai"); // "zai"
normalizeProviderId("Claude"); // "anthropic"

// Parse model references
parseModelRef("anthropic/claude-opus-4-6"); // { provider: "anthropic", model: "claude-opus-4-6" }
parseModelRef("opus-4.6", "anthropic"); // { provider: "anthropic", model: "claude-opus-4-6" }

// Create model keys for caching
modelKey("anthropic", "claude-opus-4-6"); // "anthropic/claude-opus-4-6"
```

### Capabilities

```typescript
import {
  providerSupports,
  inferModelCapabilities,
  validateCapabilities,
  findCapableModels,
} from "./providers/core/index.js";

// Check provider capabilities
providerSupports("anthropic", "vision"); // true
providerSupports("openai", "extended-thinking"); // false

// Infer model capabilities from catalog entry
const entry = { id: "claude-opus-4-6", provider: "anthropic", input: ["text", "image"] };
const caps = inferModelCapabilities(entry);
// { vision: true, tools: true, reasoning: true, ... }

// Validate model meets requirements
const required = { vision: true, contextWindow: 100000 };
const validation = validateCapabilities(caps, required);
// { valid: true, missing: [] }

// Find models that support specific capabilities
const visionModels = findCapableModels(catalog, { vision: true });
```

### Health Monitoring

```typescript
import {
  recordSuccess,
  recordFailure,
  isProviderHealthy,
  getProvidersByHealth,
} from "./providers/core/index.js";

// Record API call results
recordSuccess("anthropic", 250); // 250ms response time
recordFailure("openai", new Error("Rate limit"));

// Check health status
isProviderHealthy("anthropic"); // true

// Get providers sorted by health
const providers = ["anthropic", "openai", "google"];
const sorted = getProvidersByHealth(providers);
// Returns: ["anthropic", "google", "openai"] (healthiest first)
```

## Migration Guide

### Before (Scattered Logic)

```typescript
// model-selection.ts
function normalizeProviderId(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  if (normalized === "z.ai" || normalized === "z-ai") return "zai";
  // ... more logic
}

// provider-usage.ts
function normalizeProvider(provider: string): string {
  return provider.toLowerCase().trim();
}

// commands/providers/detection.ts
function getProviderName(id: string): string {
  if (id === "z-ai") return "Z.AI";
  // ... more logic
}
```

### After (Centralized)

```typescript
import { normalizeProviderId } from "./providers/core/index.js";

// Single source of truth
const normalized = normalizeProviderId(provider);
```

## Phase 1 Status ✅

- [x] Core types defined
- [x] Provider ID normalization (with aliases)
- [x] Model ID normalization (provider-specific)
- [x] Capabilities system
- [x] Basic health monitoring
- [ ] Integration with existing code (in progress)

## Next Steps

**Phase 2 - Integration**:

- Refactor `model-catalog.ts` to use normalized IDs
- Update `model-selection.ts` to use capabilities validation
- Integrate health tracking into provider calls

**Phase 3 - Advanced Health**:

- Persist health metrics to database
- Automatic fallback based on health
- Real-time health monitoring dashboard
- Circuit breaker pattern

**Phase 4 - Configuration**:

- Validate model refs in config
- Suggest alternatives for unavailable models
- Migration helpers for old configs
