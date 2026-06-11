
## 2026-06-11 - [State Vector Allocation Optimization]
**Learning:** In high-frequency loops (like agent evaluation simulations), using the spread operator [...] and new Float64Array() for state vector preparation causes significant GC pressure and slows down inference-loop preparation. Pre-allocating a single buffer and using .set() plus direct indexing reduced preparation time by ~35%.
**Action:** Always pre-allocate typed array buffers outside the hot loop when the shape of the data is constant.
