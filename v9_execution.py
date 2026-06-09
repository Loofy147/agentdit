import numpy as np
import pandas as pd
import time
from scipy.optimize import minimize

class PacioliEngineV9:
    def __init__(self):
        # [Cash, AR, Inv, Liab, Eq]
        self.state = np.array([1500.0, 500.0, 500.0, 1000.0, 1500.0], dtype=np.float64)
        self.types = np.array([1, 1, 1, -1, -1])
        self.debit_mask = np.where(self.types == 1, 1.0, -1.0)
        self.credit_mask = np.where(self.types == -1, 1.0, -1.0)

    def post(self, dr, cr, amt):
        if amt <= 0: return
        self.state[dr] += self.debit_mask[dr] * amt
        self.state[cr] += self.credit_mask[cr] * amt

    def get_invariant(self):
        return np.dot(self.state, self.types)

class MPCController:
    def __init__(self, horizon=10):
        self.H = horizon
        self.yield_rate = 0.08 / 365
        self.risk_coeff = 10000.0

    def objective(self, u_sequence, current_cash, friction_b, forecast_sales):
        cost = 0
        temp_cash = current_cash
        for i in range(self.H):
            # Simulation inside MPC: u[i] is the steering action
            temp_cash += u_sequence[i] + forecast_sales[i] - 180 # 180 = avg drain
            yield_loss = self.yield_rate * temp_cash if temp_cash > 0 else 0
            friction = friction_b * (temp_cash**2)
            # Penalty for liquidity risk (hyperbolic as cash -> 0)
            liquidity_risk = self.risk_coeff / (temp_cash + 1e-6) if temp_cash > 0 else 1e9
            # Smoothing constraint (control effort)
            effort = 0.5 * (u_sequence[i]**2)
            cost += yield_loss + friction + liquidity_risk + effort
        return cost

    def solve(self, current_cash, friction_b, forecast_sales):
        res = minimize(self.objective, np.zeros(self.H),
                       args=(current_cash, friction_b, forecast_sales),
                       method='SLSQP', bounds=[(-500, 500)] * self.H)
        return res.x[0]

def run_v9_execution(steps=100):
    p = PacioliEngineV9()
    mpc = MPCController(horizon=8)
    friction_b = 0.000008

    # Environment Setup
    history = []
    shock_start, shock_end = 60, 80

    np.random.seed(99)

    for t in range(steps):
        t0 = time.perf_counter_ns()

        # 1. PREDICTIVE HORIZON: Forecast sales for next H steps
        # The system "knows" the shock is coming 8 steps out
        forecast = []
        for i in range(mpc.H):
            lookahead_t = t + i
            base_sales = 250
            if shock_start <= lookahead_t <= shock_end:
                base_sales *= 0.3
            forecast.append(base_sales)

        # 2. MPC SOLVE
        v_opt = mpc.solve(p.state[0], friction_b, forecast)

        # 3. STEER BALANCE SHEET
        if v_opt > 0:
            p.post(0, 3, v_opt) # Borrow
        else:
            p.post(4, 0, abs(v_opt)) # Dividend

        # 4. REALITY STEP
        actual_sales_factor = 0.3 if shock_start <= t <= shock_end else 1.0
        sales = max(0, np.random.normal(250, 40) * actual_sales_factor)
        p.post(1, 4, sales)
        p.post(0, 1, p.state[1] * 0.18) # Collection
        p.post(4, 0, 180) # Expenses
        p.post(4, 0, (p.state[0]**2) * friction_b) # Operational friction

        t1 = time.perf_counter_ns()
        history.append({
            "Step": t, "Cash": p.state[0], "Liab": p.state[3], "Eq": p.state[4],
            "V_Opt": v_opt, "Invariant": p.get_invariant(), "Latency": t1 - t0
        })

    return pd.DataFrame(history)

df_v9_res = run_v9_execution(100)
# Final metrics and key behavior detection
preemptive_action = df_v9_res[(df_v9_res['Step'] >= 52) & (df_v9_res['Step'] < 60)]['V_Opt'].mean()
shock_min_cash = df_v9_res[60:80]['Cash'].min()
baseline_min_cash = df_v9_res[0:60]['Cash'].min()

print("V9 Metrics:")
print(f"Pre-shock average V_Opt (Step 52-59): {preemptive_action:.2f}")
print(f"Min Cash during shock: {shock_min_cash:.2f}")
print(f"Final Invariant: {df_v9_res['Invariant'].iloc[-1]:.12f}")
print(f"Avg Latency: {df_v9_res['Latency'].mean()/1e6:.2f} ms")
print("\nFinal State Snapshot:")
print(df_v9_res.iloc[-1])
