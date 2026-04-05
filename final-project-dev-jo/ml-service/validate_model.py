import pandas as pd
import numpy as np
import joblib
import warnings
import sys

warnings.filterwarnings('ignore')

def run_validation():
    with open("validation_report.txt", "w") as f:
        def log(msg):
            f.write(msg + "\n")
            print(msg)
            
        log("=== STARTING MODEL VALIDATION ===")
        
        model_path = "beehive_model.pkl"
        try:
            pipeline = joblib.load(model_path)
        except Exception as e:
            log(f"Failed to load model: {e}")
            return
            
        features_order = ['temp','humidity','rainfall','ndvi','flora','month','lat','lng']
        flagged_issues = []
        
        # STEP 1: EDGE CASE TESTING
        log("\n[1] EDGE CASE TESTING")
        cases = {
            "Very Bad Conditions": [45, 20, 0, 0.1, 1, 6, 11.0, 78.0],
            "Ideal Conditions": [26, 65, 60, 0.8, 8, 6, 11.0, 78.0],
            "Moderate Conditions": [30, 45, 30, 0.5, 4, 6, 11.0, 78.0]
        }
        
        edge_results = {}
        for name, vals in cases.items():
            df = pd.DataFrame([vals], columns=features_order)
            pred = pipeline.predict(df)[0]
            prob = pipeline.predict_proba(df)[0]
            max_prob = max(prob)
            edge_results[name] = {"pred": pred, "prob": max_prob}
            log(f" - {name} -> Predicted: {pred} (Confidence: {max_prob:.2f}) - Probs: {np.round(prob,2)}")
            
        if edge_results["Very Bad Conditions"]["pred"] == 2:
            flagged_issues.append("Bad conditions predicted as Safe (Class 2).")

        # STEP 2: PREDICTION STABILITY
        log("\n[2] PREDICTION STABILITY")
        base_vals = [30, 45, 30, 0.5, 4, 6, 11.0, 78.0]
        last_pred = None
        flips = 0
        log("Varying temp: 30 -> 31 -> 32")
        for t in [30, 31, 32]:
            vals = base_vals.copy()
            vals[0] = t
            df = pd.DataFrame([vals], columns=features_order)
            pred = pipeline.predict(df)[0]
            prob = np.round(pipeline.predict_proba(df)[0], 2)
            log(f" - Temp {t} -> Pred: {pred}, Probs: {prob}")
            if last_pred is not None and abs(pred - last_pred) > 1:
                flips += 1
            last_pred = pred
            
        if flips > 0:
            flagged_issues.append("Random class flipping detected in stability test (e.g. 0 to 2 directly).")

        # STEP 3: FEATURE IMPORTANCE AUDIT
        log("\n[3] FEATURE IMPORTANCE AUDIT")
        rf_model = pipeline.named_steps['rf']
        importances = rf_model.feature_importances_
        feat_imps = pd.DataFrame({'feature': features_order, 'importance': importances}).sort_values(by='importance', ascending=False)
        log("Top Features:")
        for _, row in feat_imps.head(4).iterrows():
            log(f" - {row['feature']}: {row['importance']:.4f}")
            
        top_2_feats = feat_imps.head(2)['feature'].values
        if 'lat' in top_2_feats or 'lng' in top_2_feats or 'month' in top_2_feats:
            flagged_issues.append("Model is overly dependent on lat, lng, or month.")

        # STEP 4: CLASS BALANCE CHECK
        log("\n[4] CLASS BALANCE CHECK (100 Samples)")
        try:
            data = pd.read_csv("tn_beehive_dataset.csv")
            sample_df = data.sample(n=100, random_state=42)
            X_sample = sample_df[features_order]
            preds = pipeline.predict(X_sample)
            unique, counts = np.unique(preds, return_counts=True)
            dist = dict(zip(unique, counts))
            log(f"Distribution: {dist}")
            for k, v in dist.items():
                pct = v / 100.0
                log(f" - Class {k}: {pct*100:.1f}%")
                if pct > 0.6:
                    flagged_issues.append(f"Class {k} dominates excessively ({pct*100:.1f}%).")
        except Exception as e:
            log(f"Could not load dataset for class balance: {e}")

        # STEP 5: CONFIDENCE VALIDATION
        log("\n[5] CONFIDENCE VALIDATION")
        high_conf = edge_results["Very Bad Conditions"]["prob"] > 0.8 or edge_results["Ideal Conditions"]["prob"] > 0.8
        mod_conf = edge_results["Moderate Conditions"]["prob"]
        log(f" - Extreme condition max confidence: >0.8? {'Yes' if high_conf else 'No'}")
        log(f" - Moderate condition max confidence: {mod_conf:.2f}")

        # STEP 6: VERDICT
        log("\n=== FINAL VERDICT ===")
        if len(flagged_issues) > 0:
            log("Verdict: MODEL NEEDS IMPROVEMENT")
            log("Issues found:")
            for iss in flagged_issues:
                log(f" - {iss}")
        else:
            log("Verdict: MODEL IS RELIABLE")

if __name__ == "__main__":
    run_validation()
