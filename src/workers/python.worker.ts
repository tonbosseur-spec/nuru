import { loadPyodide } from 'pyodide';

let pyodide: any = null;

self.onmessage = async (event) => {
  const { id, type, payload } = event.data;

  try {
    if (type === 'INIT') {
      if (!pyodide) {
        self.postMessage({ type: 'STATUS', status: 'Initialisation de Python (Local)...' });
        pyodide = await loadPyodide({
          indexURL: '/pyodide/',
        });
        self.postMessage({ type: 'STATUS', status: 'Chargement des bibliothèques locales...' });
        try {
          // 1. Charger micropip en premier
          await pyodide.loadPackage('micropip');
          
          // 2. Charger les packages qui sont dans le lock file (pandas, numpy, scipy, statsmodels, sklearn)
          // Note: scikit-learn s'appelle scikit-learn dans Pyodide
          await pyodide.loadPackage(['pandas', 'numpy', 'scipy', 'scikit-learn', 'statsmodels']);
          
          // 3. Charger les packages restants via micropip à partir des fichiers locaux
          await pyodide.runPythonAsync(`
import micropip
import os

# Installation locale pour Plotly et Openpyxl
try:
    # On installe les .whl locaux qu'on a téléchargé dans /public/pyodide/
    # Dans l'environnement browser/worker, le chemin relatif /pyodide/ correspond au dossier public/pyodide/
    await micropip.install([
        '/pyodide/tenacity-8.2.3-py3-none-any.whl',
        '/pyodide/plotly-5.24.1-py3-none-any.whl',
        '/pyodide/et_xmlfile-1.1.0-py3-none-any.whl',
        '/pyodide/openpyxl-3.1.2-py2.py3-none-any.whl'
    ])
except Exception as e:
    print(f"Erreur d'installation locale: {e}")
          `);
        } catch (err) {
          console.error("Failed to load environment:", err);
          // Tentative de secours ultime pour pandas si tout a échoué
          try {
             await pyodide.loadPackage('pandas');
          } catch(e) {}
        }
        
        self.postMessage({ type: 'STATUS', status: 'Finalizing Python environment...' });
        // Setup Python environment
        await pyodide.runPythonAsync(`
import sys
import io

import pandas as pd
import numpy as np
import scipy.stats as stats
import statsmodels.api as sm
from sklearn.linear_model import LinearRegression
try:
    import plotly.express as px
    import plotly.io as pio
except ImportError:
    px = None
    pio = None
import json

# Ensure they are in globals
globals()['pd'] = pd
globals()['np'] = np
globals()['stats'] = stats
globals()['io'] = io
globals()['json'] = json
globals()['px'] = px
globals()['pio'] = pio

# Statistical Explanation Helpers
def interpret_p(p, alpha=0.05):
    if p < alpha:
        return f"Statistically significant (p={p:.4f} < {alpha}). The null hypothesis is rejected."
    else:
        return f"Not statistically significant (p={p:.4f} >= {alpha}). Failed to reject the null hypothesis."

def interpret_corr(r):
    abs_r = abs(r)
    if abs_r > 0.7: strength = "strong"
    elif abs_r > 0.4: strength = "moderate"
    else: strength = "weak"
    direction = "positive" if r > 0 else "negative"
    return f"{strength.capitalize()} {direction} correlation (r={r:.3f})."

# Global dataframe
df = None

def run_analysis(code_str):
    captured_output = io.StringIO()
    sys.stdout = captured_output
    sys.stderr = captured_output
    
    result = None
    try:
        # We execute code in global scope
        exec(code_str, globals())
        if 'last_result' in globals():
            result = globals()['last_result']
    except Exception as e:
        print(f"Error: {e}")
    finally:
        sys.stdout = sys.__stdout__
        sys.stderr = sys.__stderr__
        
    return json.dumps({
        "output": captured_output.getvalue(),
        "result": result
    })
        `);
      }
      self.postMessage({ id, type: 'INIT_DONE' });
    
    } else if (type === 'LOAD_DATA') {
      const { csvStr } = payload;
      pyodide.globals.set('csv_data', csvStr);
      await pyodide.runPythonAsync(`
import pandas as pd
import io
df = pd.read_csv(io.StringIO(csv_data))
column_info = []
for col in df.columns:
    col_type = 'numeric' if pd.api.types.is_numeric_dtype(df[col]) else 'categorical'
    column_info.append({"name": col, "type": col_type, "missing": int(df[col].isnull().sum())})
last_result = {"columns": column_info, "rows": len(df), "csv": df.to_csv(index=False)}
      `);
      
      const resStr = await pyodide.runPythonAsync(`run_analysis("pass")`);
      const res = JSON.parse(resStr);
      self.postMessage({ id, type: 'DATA_LOADED', payload: res.result });
    } else if (type === 'LOAD_FILE') {
      const { buffer, filename } = payload;
      const uint8 = new Uint8Array(buffer);
      pyodide.FS.writeFile(filename, uint8);
      
      await pyodide.runPythonAsync(`
import pandas as pd
import io
filename = "${filename}"
if filename.endswith('.xlsx') or filename.endswith('.xls'):
    df = pd.read_excel(filename)
elif filename.endswith('.sav'):
    # Try using pandas read_spss if available, else error
    try:
        df = pd.read_spss(filename)
    except Exception:
        raise Exception("SPSS files require pyreadstat which is not available in light mode. Please use CSV.")
elif filename.endswith('.dta'):
    df = pd.read_stata(filename)
elif filename.endswith('.json'):
    df = pd.read_json(filename)
else:
    df = pd.read_csv(filename)

column_info = []
for col in df.columns:
    col_type = 'numeric' if pd.api.types.is_numeric_dtype(df[col]) else 'categorical'
    column_info.append({"name": col, "type": col_type, "missing": int(df[col].isnull().sum())})
last_result = {"columns": column_info, "rows": len(df), "csv": df.to_csv(index=False)}
      `);

      const resStr = await pyodide.runPythonAsync(`run_analysis("pass")`);
      const res = JSON.parse(resStr);
      self.postMessage({ id, type: 'DATA_LOADED', payload: res.result });

    } else if (type === 'RUN_CODE') {
      const { code } = payload;
      pyodide.globals.set('user_code', code);
      const resStr = await pyodide.runPythonAsync(`run_analysis(user_code)`);
      const res = JSON.parse(resStr);
      self.postMessage({ id, type: 'RUN_RESULT', payload: res });
    }
  } catch (error: any) {
    self.postMessage({ id, type: 'ERROR', error: error.message });
  }
};
