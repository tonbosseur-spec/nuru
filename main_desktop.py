import os
import sys
import threading
import webview
import uvicorn
from backend.main import app

# Configuration
API_PORT = 8000
API_HOST = "127.0.0.1"

def start_backend():
    """Lance le serveur FastAPI en arrière-plan"""
    uvicorn.run(app, host=API_HOST, port=API_PORT, log_level="error")

def get_entrypoint():
    """Détermine le chemin du frontend (dev ou prod)"""
    # Si on est en mode PyInstaller, les fichiers sont dans _MEIPASS
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, 'dist', 'index.html')
    
    # En mode développement, on utilise le dossier local
    return os.path.join(os.path.dirname(__file__), 'dist', 'index.html')

if __name__ == "__main__":
    # 1. Démarrer le backend dans un thread séparé
    t = threading.Thread(target=start_backend, daemon=True)
    t.start()

    # 2. Créer la fenêtre Desktop
    # On pointe vers le fichier index.html local
    # pywebview va gérer le chargement des ressources relatives (JS/CSS)
    window = webview.create_window(
        'Nuru Analytics',
        get_entrypoint(),
        width=1280,
        height=720,
        min_size=(1024, 600),
        background_color='#ffffff'
    )

    # 3. Lancer l'interface
    try:
        # On essaie de forcer le moteur Edge si disponible, sinon pywebview choisit le meilleur
        # 'gui' peut être 'edgehtml', 'edgechromium' (WebView2), ou 'qt' (PySide6)
        # En mode dev, debug=True permet d'avoir la console F12
        webview.start(debug=not hasattr(sys, '_MEIPASS'))
    except Exception as e:
        print(f"Erreur au lancement de l'interface : {e}")
        # Tentative de secours : si pythonnet échoue, on essaie de forcer un autre moteur
        try:
            print("Tentative de secours avec un autre moteur GUI...")
            webview.start(gui='cef', debug=not hasattr(sys, '_MEIPASS'))
        except:
            with open("error_log.txt", "w") as f:
                f.write(f"Erreur fatale : {str(e)}")
