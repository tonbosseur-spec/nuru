from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from scipy import stats
import statsmodels.api as sm
from sklearn.linear_model import LinearRegression
import json
import io
import uvicorn

app = FastAPI(title="Nuru Analytics Backend")

# Configuration CORS pour autoriser l'app Tauri
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stockage en mémoire du dataset actif (plus simple pour une app locale)
current_df = None

@app.get("/health")
async def health():
    return {"status": "ready", "engine": "CPython 3.10+"}

@app.post("/load")
async def load_data(file: UploadFile = File(...)):
    global current_df
    print(f"Chargement du fichier : {file.filename}")
    contents = await file.read()
    try:
        filename = file.filename.lower()
        if filename.endswith('.csv'):
            current_df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(('.xls', '.xlsx')):
            current_df = pd.read_excel(io.BytesIO(contents))
        else:
            print(f"Format non supporté : {file.filename}")
            raise HTTPException(status_code=400, detail="Format non supporté")
        
        # Préparation des infos de colonnes
        cols_info = []
        for col in current_df.columns:
            dtype = current_df[col].dtype
            col_type = "numeric" if np.issubdtype(dtype, np.number) else "categorical"
            missing = int(current_df[col].isna().sum())
            cols_info.append({
                "name": str(col),
                "type": col_type,
                "missing": missing
            })

        print(f"Succès : {len(current_df)} lignes chargées, {len(cols_info)} colonnes")
        return {
            "columns": cols_info,
            "rows": len(current_df),
            "preview": current_df.head(10).to_dict(orient='records')
        }
    except Exception as e:
        print(f"Erreur lors du chargement : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/descriptive")
async def descriptive_stats(column: str):
    global current_df
    if current_df is None:
        raise HTTPException(status_code=400, detail="Aucun dataset chargé")
    
    if column not in current_df.columns:
        raise HTTPException(status_code=404, detail="Colonne introuvable")
    
    series = current_df[column]
    if not np.issubdtype(series.dtype, np.number):
        return {"type": "categorical", "counts": series.value_counts().to_dict()}
    
    return {
        "type": "numeric",
        "mean": float(series.mean()),
        "median": float(series.median()),
        "std": float(series.std()),
        "min": float(series.min()),
        "max": float(series.max()),
        "skew": float(series.skew()),
        "kurtosis": float(series.kurtosis())
    }

@app.post("/execute")
async def execute_code(payload: dict):
    global current_df
    code = payload.get("code", "")
    # Simulation sécurisée d'exécution (pour démo technique)
    # Dans une vraie app, on utiliserait un environnement sandbox ou on parserait le code
    output = io.StringIO()
    try:
        # On injecte le dataframe actuel dans le namespace
        namespace = {"df": current_df, "pd": pd, "np": np, "stats": stats, "plt": None}
        exec(code, namespace)
        
        # On récupère last_result s'il existe
        result = namespace.get("last_result")
        
        # Si c'est un DataFrame ou une Series, on le convertit en JSON
        if isinstance(result, (pd.DataFrame, pd.Series)):
            result = result.to_json(orient="records")
        
        return {
            "output": output.getvalue(),
            "results": result if result is not None else "OK",
            "success": True
        }
    except Exception as e:
        import traceback
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Erreur d'exécution : {error_msg}")
        return {"error": str(e), "details": error_msg, "success": False}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
