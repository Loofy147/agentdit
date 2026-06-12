import { MacroService } from '../src/services/macroService.js';

const ms = new MacroService();
console.log('--- Initial Vitals ---');
console.log(ms.vitals);

console.log('--- After 5 steps in Crisis ---');
for (let i = 0; i < 5; i++) {
    ms.step('Crisis', 0.9);
}
console.log(ms.vitals);
console.log('Normalized Signals:', ms.getNormalizedSignals());
