import os
import subprocess
import platform
import shutil

def build():
    print("🚀 Début de la compilation du backend Python...")
    
    # Nom de l'exécutable sidecar selon la convention Tauri
    # format: <nom>-<target_triple>.exe
    target_triple = "x86_64-pc-windows-msvc" # Pour Windows 64 bits
    executable_name = f"nuru-backend-{target_triple}"
    
    # Commande PyInstaller
    # --onefile : Un seul fichier .exe
    # --noconsole : Pas de fenêtre noire (on le veut car Tauri gère le processus)
    # --name : Nom de sortie
    cmd = [
        "pyinstaller",
        "--onefile",
        "--noconsole",
        f"--name={executable_name}",
        "backend/main.py"
    ]
    
    subprocess.run(cmd, check=True)
    
    # Déplacement vers src-tauri/binaries
    os.makedirs("src-tauri/binaries", exist_ok=True)
    src = os.path.join("dist", f"{executable_name}.exe")
    dst = os.path.join("src-tauri/binaries", f"{executable_name}.exe")
    
    if os.path.exists(src):
        shutil.copy(src, dst)
        print(f"✅ Backend compilé et copié vers : {dst}")
    else:
        print("❌ Erreur : Le fichier compilé n'a pas été trouvé.")

if __name__ == "__main__":
    build()
