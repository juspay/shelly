# NeuroLink v8.41 Update Plan for Shelly

## Executive Summary

Analysis of 52 commits in neurolink-fork (v8.21.x → v8.41.1) reveals several updates needed in Shelly. Branch `feature/neurolink-v8.41-updates` created for implementation.

---

## Current State

| Aspect                    | Shelly                                      | Neurolink Fork               |
| ------------------------- | ------------------------------------------- | ---------------------------- |
| **Package Version**       | `^8.41.0`                                   | `8.41.1`                     |
| **Files Using Neurolink** | 5 files                                     | -                            |
| **Providers Configured**  | google, openai, mistral, ollama, openrouter | +60 providers via OpenRouter |

---

## Required Updates (Priority Order)

### 🔴 HIGH PRIORITY

#### 1. Memory Leak Prevention - Add Shutdown Cleanup

**Issue**: NeuroLink instances are created but never cleaned up, accumulating event listeners.

**New Methods Available**:

- `neurolink.shutdown()` - Cleanup NeuroLink instance
- `ExternalServerManager.destroy()` - Clean up server manager
- `ToolDiscoveryService.destroy()` - Clean up tool discovery
- `CircuitBreakerManager.destroyAll()` - Clean up circuit breakers

**Files to Update**:

##### `src/services/analysisService.ts`

```typescript
// BEFORE
const neurolink = new NeuroLink();
const result = await neurolink.generate({...});
return result.content;

// AFTER
const neurolink = new NeuroLink();
try {
  const result = await neurolink.generate({...});
  return result.content;
} finally {
  await neurolink.shutdown();
}
```

##### `src/shelly/utils/aiContentGenerator.ts`

Already has `process.setMaxListeners(20)` which helps, but should implement proper cleanup pattern.

---

#### 2. Update Package Version

**File**: `package.json`

```json
// BEFORE
"@juspay/neurolink": "^8.41.0"

// AFTER (if using specific version)
"@juspay/neurolink": "^8.41.1"
```

---

### 🟡 MEDIUM PRIORITY

#### 3. Claude Model Identifier Awareness

**Change in v8.40.1**: Claude model identifiers updated:

- `claude-sonnet-4@20250514` → `claude-sonnet-4-5@20250929`
- `claude-opus-4@20250514` → `claude-opus-4-5@20251101`

**Impact on Shelly**:

- aiConfigService uses `anthropic/claude-3.5-sonnet` via OpenRouter
- This is different from the internal ModelRouter identifiers
- **No action needed** - the ModelRouter handles this internally

**Verification**: Test with OpenRouter Claude models after update.

---

#### 4. OpenRouter Provider Enhancement

**New in v8.24.0**: Full OpenRouter support with 300+ models

**Current Shelly Config** (`aiConfigService.ts`):

```typescript
openrouter: {
  free: {
    model: 'meta-llama/llama-3.2-3b-instruct:free',
  },
  paid: {
    model: 'anthropic/claude-3.5-sonnet',
  },
},
```

**Enhancement Opportunity**: Could add more OpenRouter model options or dynamic model discovery.

---

### 🟢 LOW PRIORITY (Future Enhancements)

#### 5. Title Generation Events

**New in v8.40.0**: Event emission for title generation

```typescript
// Available but not needed for Shelly's current use case
neurolink.on('title:generated', (event) => {
  console.log(`Title: ${event.title}`);
});
```

---

#### 6. PowerPoint Generation

**New in v8.36.0-v8.39.0**: PPT generation via SlideGenerator

```typescript
import { SlideGenerator } from '@juspay/neurolink';
// Could be used for visual project summaries
```

---

#### 7. Video Generation

**New in v8.26.0**: Video output mode

```typescript
const result = await neurolink.generate({
  mode: 'video',
  video: { resolution: '1080p' },
  // ...
});
```

---

#### 8. Network Resilience

**New in v8.35.2**: Automatic exponential backoff for network retries

**Impact**: Already built into NeuroLink - Shelly benefits automatically.

---

## Implementation Checklist

### Phase 1: Critical Updates

- [ ] Add `neurolink.shutdown()` calls in analysisService.ts
- [ ] Verify Claude model compatibility with OpenRouter
- [ ] Update package.json version if needed
- [ ] Run tests to verify no regressions

### Phase 2: Enhancements

- [ ] Consider adding more OpenRouter model options
- [ ] Add destroy() calls if using MCP components
- [ ] Review memory usage patterns in long-running processes

### Phase 3: Future Features

- [ ] Evaluate PPT generation for project reports
- [ ] Consider title generation for session naming
- [ ] Explore video capabilities if relevant

---

## Files to Modify

| File                                     | Changes                  | Priority  |
| ---------------------------------------- | ------------------------ | --------- |
| `src/services/analysisService.ts`        | Add shutdown cleanup     | 🔴 High   |
| `src/shelly/utils/aiContentGenerator.ts` | Review cleanup pattern   | 🟡 Medium |
| `package.json`                           | Version update           | 🟡 Medium |
| `src/services/aiConfigService.ts`        | OpenRouter model options | 🟢 Low    |

---

## Testing Plan

1. **Unit Tests**
   - Verify neurolink.generate() still works
   - Verify neurolink.shutdown() doesn't break flow
   - Test with all configured providers

2. **Integration Tests**
   - Run `shelly` error analysis
   - Run `shelly organize`
   - Run `shelly memory init`

3. **Memory Tests**
   - Monitor event listener count before/after analysis
   - Verify no memory leaks in repeated operations

---

## Documentation Updates

After implementation:

- [ ] Update CLAUDE.md with new cleanup patterns
- [ ] Update README if new features are exposed
- [ ] Add memory management notes to developer docs

---

## Risk Assessment

| Risk                             | Likelihood | Impact | Mitigation                 |
| -------------------------------- | ---------- | ------ | -------------------------- |
| Breaking change in model routing | Low        | Medium | Test with all providers    |
| Shutdown causing issues          | Low        | Low    | Wrap in try/finally        |
| Memory issues in long sessions   | Medium     | Medium | Implement cleanup properly |

---

## Timeline

| Phase   | Tasks            | Effort    |
| ------- | ---------------- | --------- |
| Phase 1 | Critical updates | 1-2 hours |
| Phase 2 | Enhancements     | 2-3 hours |
| Phase 3 | Future features  | As needed |

---

## Next Steps

1. Start with `analysisService.ts` shutdown cleanup
2. Test with existing functionality
3. Commit and verify CI passes
4. Consider Phase 2 enhancements
