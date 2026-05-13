from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from scipy import stats
import statsmodels.api as sm
import statsmodels.formula.api as smf
from sklearn.linear_model import LinearRegression
from sklearn.metrics import confusion_matrix, roc_curve, auc
import plotly.express as px
import plotly.graph_objects as go
import plotly.figure_factory as ff
import plotly.io as pio
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

# Stockage en mémoire du dataset actif
current_df = None
global_filter_condition = None

def get_active_df():
    global current_df, global_filter_condition
    if current_df is None:
        return None
    if global_filter_condition:
        try:
            return current_df.query(global_filter_condition)
        except:
            return current_df
    return current_df

@app.get("/health")
async def health():
    return {"status": "ready", "engine": "CPython 3.10+"}

@app.post("/load")
async def load_data(file: UploadFile = File(...)):
    global current_df, global_filter_condition
    global_filter_condition = None
    print(f"Chargement du fichier : {file.filename}")
    contents = await file.read()
    try:
        filename = file.filename.lower()
        if filename.endswith('.csv'):
            # Use engine='python' and try to avoid StringDtype conversion if pandas 2.0+ is configured for it
            current_df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(('.xls', '.xlsx')):
            current_df = pd.read_excel(io.BytesIO(contents))
        else:
            print(f"Format non supporté : {file.filename}")
            raise HTTPException(status_code=400, detail="Format non supporté")
        
        # Normalisation ultra-agressive des types pour éviter les problèmes avec StringDtype de Pandas 2.x
        # qui cause l'erreur "Cannot interpret StringDtype as a data type" dans numpy/scipy
        for col in current_df.columns:
            # 1. Convertir les types StringDtype (pandas 2+) en object (standard numpy)
            dtype_str = str(current_df[col].dtype).lower()
            if 'string' in dtype_str or 'bool' in dtype_str:
                try:
                    current_df[col] = current_df[col].astype(object)
                except:
                    pass
            
            # 2. Remplacer les types 'Int64' (nullable) par 'float64' ou 'int64' standard
            # car certains calculs numpy ne les supportent pas bien
            if 'int' in dtype_str and '64' in dtype_str and current_df[col].isna().any():
                current_df[col] = current_df[col].astype(float)
            
            # 3. Remplacer pd.NA par np.nan pour la compatibilité JSON et calcul
            if current_df[col].dtype == object or pd.api.types.is_object_dtype(current_df[col]):
                current_df[col] = current_df[col].replace({pd.NA: np.nan})
                # S'assurer que les colonnes vides ou quasi-vides d'objets sont propres
                current_df[col] = current_df[col].fillna(np.nan)
        
        # Vérification finale des types pour log
        print(f"Dataset normalisé. Types : {current_df.dtypes.to_dict()}")
        
        # Préparation des infos de colonnes
        cols_info = []
        for col in current_df.columns:
            # Use pandas type checkers for better compatibility with StringDtype
            is_num = pd.api.types.is_numeric_dtype(current_df[col])
            col_type = "numeric" if is_num else "categorical"
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
            "preview": current_df.head(1000).to_dict(orient='records') # Increased preview limit
        }
    except Exception as e:
        print(f"Erreur lors du chargement : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/prepare/rename")
async def rename_column(old_name: str, new_name: str):
    global current_df
    if current_df is None: raise HTTPException(status_code=400, detail="No data loaded")
    try:
        current_df = current_df.rename(columns={old_name: new_name})
        return {"success": True, "columns": current_df.columns.tolist()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/prepare/categorize")
async def categorize_column(column: str, bins: int, new_name: str = None):
    global current_df
    if current_df is None: raise HTTPException(status_code=400, detail="No data loaded")
    try:
        target_name = new_name if new_name else f"{column}_cat"
        current_df[target_name] = pd.cut(current_df[column], bins=bins).astype(str)
        return {"success": True, "new_column": target_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/prepare/filter")
async def apply_global_filter(condition: str = None):
    global current_df, global_filter_condition
    if current_df is None: raise HTTPException(status_code=400, detail="No data loaded")
    
    if not condition:
        global_filter_condition = None
        return {"success": True, "rows_remaining": len(current_df)}

    try:
        test_df = current_df.query(condition)
        global_filter_condition = condition
        return {"success": True, "rows_remaining": len(test_df)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Condition invalide: {str(e)}")

@app.post("/analyze/descriptive")
async def descriptive_stats(column: str):
    df = get_active_df()
    if df is None:
        raise HTTPException(status_code=400, detail="Aucun dataset chargé")
    
    if column not in df.columns:
        raise HTTPException(status_code=404, detail="Colonne introuvable")
    
    series = df[column]
    if not pd.api.types.is_numeric_dtype(series):
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
    df = get_active_df()
    code = payload.get("code", "")
    
    import sys
    output = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = output
    try:
        # On injecte le dataframe actuel dans le namespace
        namespace = {"df": df, "pd": pd, "np": np, "stats": stats, "plt": None}
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
        print(f"Erreur d'exécution : {error_msg}", file=sys.stderr)
        return {"error": str(e), "details": error_msg, "success": False}
    finally:
        sys.stdout = old_stdout

if __name__ == "__main__":
    import sys
    try:
        print("Démarrage du backend Nuru Analytics sur http://127.0.0.1:8000")
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
    except Exception as e:
        if "10048" in str(e) or "already in use" in str(e).lower():
            print("\n" + "!"*60)
            print("ERREUR : Le port 8000 est déjà utilisé par une autre application.")
            print("Veuillez fermer les autres instances de Nuru Analytics ou tout")
            print("autre service utilisant le port 8000 (ex: un autre serveur local).")
            print("!"*60 + "\n")
        else:
            print(f"Erreur fatale lors du démarrage : {e}")
        sys.exit(1)
