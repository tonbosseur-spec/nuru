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
    """Lance le serveur FastAPI en arrière-plan. Gère l'erreur de port déjà utilisé."""
    try:
        uvicorn.run(app, host=API_HOST, port=API_PORT, log_level="error")
    except Exception as e:
        error_str = str(e).lower()
        if "10048" in error_str or "already in use" in error_str:
            print(f"ERREUR CRITIQUE : Le port {API_PORT} est déjà utilisé.")
            # On peut essayer d'informer l'utilisateur via un fichier log ou autre
            with open("nuru_port_error.txt", "w", encoding="utf-8") as f:
                f.write(f"Erreur : Le port {API_PORT} est occupé par une autre application.\n")
                f.write("Veuillez fermer les autres instances de Nuru Analytics.")
        else:
            print(f"Erreur backend : {e}")

def get_entrypoint():
    """Détermine le chemin du frontend (dev ou prod)"""
    # Si on est en mode PyInstaller, les fichiers sont dans _MEIPASS
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, 'dist', 'index.html')
    
    # En mode développement, on utilise le dossier local
    return os.path.join(os.path.dirname(__file__), 'dist', 'index.html')

class Api:
    def get_user_data_path(self):
        return os.path.join(os.path.expanduser("~"), "NuruAnalytics")

    def save_file_dialog(self, content, filename):
        """Ouvre une boîte de dialogue pour enregistrer un fichier .nra"""
        result = window.create_file_dialog(webview.SAVE_DIALOG, directory=os.path.expanduser("~"), save_filename=filename)
        if result:
            try:
                with open(result, 'w', encoding='utf-8') as f:
                    f.write(content)
                return {"success": True, "path": result}
            except Exception as e:
                return {"success": False, "error": str(e)}
        return {"success": False, "error": "Cancelled"}

    def open_file_dialog(self):
        """Ouvre une boîte de dialogue pour charger un fichier .nra"""
        result = window.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False, file_types=('Nuru Workspace (*.nra)', 'All files (*.*)'))
        if result and len(result) > 0:
            try:
                with open(result[0], 'r', encoding='utf-8') as f:
                    content = f.read()
                return {"success": True, "content": content, "filename": os.path.basename(result[0])}
            except Exception as e:
                return {"success": False, "error": str(e)}
        return {"success": False, "error": "Cancelled"}

if __name__ == "__main__":
    # Redirection des logs en mode production (EXE)
    if hasattr(sys, '_MEIPASS'):
        log_file = open("nuru_debug.log", "w", encoding="utf-8")
        sys.stdout = log_file
        sys.stderr = log_file
        print("Application démarrée en mode production")

    # 1. Démarrer le backend dans un thread séparé
    t = threading.Thread(target=start_backend, daemon=True)
    t.start()

    # 2. Créer la fenêtre Desktop
    api = Api()
    window = webview.create_window(
        'Nuru Analytics',
        get_entrypoint(),
        js_api=api,
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
