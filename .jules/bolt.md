
## 2026-06-11 - [State Vector Allocation Optimization]
**Learning:** In high-frequency loops (like agent evaluation simulations), using the spread operator [...] and new Float64Array() for state vector preparation causes significant GC pressure and slows down inference-loop preparation. Pre-allocating a single buffer and using .set() plus direct indexing reduced preparation time by ~35%.
**Action:** Always pre-allocate typed array buffers outside the hot loop when the shape of the data is constant.

## 2026-06-11 - [Neural Inference Cache Locality]
**Learning:** Standard matrix-vector multiplication (dot products in a loop) often uses strided access for weights (e.g., `weights[i * hiddenDim + j]`). This can lead to cache misses. Refactoring the loop to iterate through the weight array linearly and accumulating into the output buffer (outer loop over input features) significantly improves performance (~33% speedup).
**Action:** Prefer linear memory access patterns for large weight matrices even if it requires an extra buffer fill/accumulation step.
