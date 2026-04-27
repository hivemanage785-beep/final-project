import sys, random, time, json
sys.path.insert(0, '.')

# ─── Load model silently ───────────────────────────────────────────────────────
from ml_api import evaluate_point   # loads model + scaler on import

PASS = "PASS"
FAIL = "FAIL"
results = {}

# =============================================================================
# STEP 1 — CONSISTENCY  (same input → identical output x5)
# =============================================================================
print("\n" + "="*60)
print("STEP 1 — ML CONSISTENCY TEST")
print("="*60)

base_input = {
    "temp": 28, "humidity": 70, "rainfall": 2,
    "lat": 11.0, "lng": 78.5, "month": 6
}

consistency_scores = [evaluate_point(base_input)["score"] for _ in range(5)]
print("CONSISTENCY TEST:", consistency_scores)

consistency_pass = len(set(consistency_scores)) == 1
results["consistency"] = PASS if consistency_pass else FAIL
print("RESULT:", results["consistency"],
      "— all identical" if consistency_pass else "— outputs differ!")

# =============================================================================
# STEP 2 — SENSITIVITY  (vary one feature at a time)
# =============================================================================
print("\n" + "="*60)
print("STEP 2 — ML SENSITIVITY TEST")
print("="*60)

def score_for(**overrides):
    inp = dict(base_input, **overrides)
    return evaluate_point(inp)["score"]

lat_scores = [score_for(lat=v) for v in [10.0, 11.0, 12.0]]
hum_scores = [score_for(humidity=v) for v in [40, 60, 80]]

print("  Varying lat  10->11->12 :", lat_scores)
print("  Varying humidity 40->60->80:", hum_scores)

# sensitivity pass = at least ONE pair differs in each sweep
lat_varies = len(set(lat_scores)) > 1
hum_varies = len(set(hum_scores)) > 1

# no sudden jump = max consecutive diff ≤ 40
def smooth(seq):
    diffs = [abs(seq[i+1]-seq[i]) for i in range(len(seq)-1)]
    return all(d <= 40 for d in diffs), max(diffs) if diffs else 0

lat_smooth, lat_maxdiff = smooth(lat_scores)
hum_smooth, hum_maxdiff = smooth(hum_scores)

sensitivity_pass = lat_varies and hum_varies and lat_smooth and hum_smooth
print(f"  lat varies={lat_varies}, smooth={lat_smooth} (max_diff={lat_maxdiff})")
print(f"  hum varies={hum_varies}, smooth={hum_smooth} (max_diff={hum_maxdiff})")
results["sensitivity"] = PASS if sensitivity_pass else FAIL
print("RESULT:", results["sensitivity"])

# =============================================================================
# STEP 3 — ML RANGE  (50 random Tamil Nadu inputs)
# =============================================================================
print("\n" + "="*60)
print("STEP 3 — ML RANGE TEST (50 random inputs)")
print("="*60)

random.seed(99)
range_scores = []
for _ in range(50):
    inp = {
        "lat":      random.uniform(8.0, 13.5),
        "lng":      random.uniform(76.0, 80.5),
        "temp":     random.uniform(18.0, 42.0),
        "humidity": random.uniform(25.0, 95.0),
        "rainfall": random.uniform(0.0, 80.0),
        "month":    random.randint(1, 12)
    }
    range_scores.append(evaluate_point(inp)["score"])

ml_min, ml_max = min(range_scores), max(range_scores)
ml_range = ml_max - ml_min
print(f"PRED MIN: {ml_min}  MAX: {ml_max}  RANGE: {ml_range}")

# histogram by 10-pt bucket
hist = {}
for s in range_scores:
    b = (s // 10) * 10
    hist[b] = hist.get(b, 0) + 1
print("SCORE HISTOGRAM:", dict(sorted(hist.items())))

range_pass = ml_range > 30 and len(hist) >= 3
results["ml_range"] = ml_range
results["ml_range_status"] = PASS if range_pass else FAIL
print("RESULT:", results["ml_range_status"],
      f"(range={ml_range}, buckets={len(hist)})")

# =============================================================================
# SUMMARY (ML-only)
# =============================================================================
print("\n" + "="*60)
print("ML AUDIT SUMMARY")
print("="*60)
print(json.dumps({
    "consistency":      results["consistency"],
    "sensitivity":      results["sensitivity"],
    "ml_range":         ml_range,
    "ml_score_min":     ml_min,
    "ml_score_max":     ml_max,
    "ml_range_status":  results["ml_range_status"],
}, indent=2))
