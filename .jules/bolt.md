
## 2026-06-11 - [State Vector Allocation Optimization]
**Learning:** In high-frequency loops (like agent evaluation simulations), using the spread operator [...] and new Float64Array() for state vector preparation causes significant GC pressure and slows down inference-loop preparation. Pre-allocating a single buffer and using .set() plus direct indexing reduced preparation time by ~35%.
**Action:** Always pre-allocate typed array buffers outside the hot loop when the shape of the data is constant.

## 2026-06-11 - [Neural Inference Cache Locality]
**Learning:** Standard matrix-vector multiplication (dot products in a loop) often uses strided access for weights (e.g., `weights[i * hiddenDim + j]`). This can lead to cache misses. Refactoring the loop to iterate through the weight array linearly and accumulating into the output buffer (outer loop over input features) significantly improves performance (~33% speedup).
**Action:** Prefer linear memory access patterns for large weight matrices even if it requires an extra buffer fill/accumulation step.

## 2026-06-11 - [Constructor Efficiency & Static Masks]
**Learning:** Initializing instance properties like typed arrays (`this.types = this.types.map(...)`) in a constructor that is frequently called (e.g., in a simulation loop) is a major performance drain. Moving invariant metadata to static class properties and using them in logic instead of instance properties reduced constructor latency by over 90%.
**Action:** Use `static` class properties for invariant metadata and configuration to keep constructors lean.
