## 🚀 Guide de déploiement Desktop (Windows)

Cette version de Nuru est optimisée pour fonctionner comme un logiciel Windows indépendant (`.exe`).

### 1. Solution Recommandée : Build Automatique (GitHub)
Si vous exportez ce projet vers GitHub, **vous n'avez rien à faire sur votre ordinateur !**
1. Exportez le code vers un dépôt GitHub.
2. Allez dans l'onglet **"Actions"** de votre dépôt GitHub.
3. Un processus nommé **"Build Windows EXE"** se lance automatiquement.
4. Une fois terminé, téléchargez l'exécutable dans les "Artifacts".

### 2. Solution Locale (Si vous voulez builder chez vous)

#### Prérequis
- **Python 3.11** (Recommandé pour éviter l'erreur `pythonnet`).
- **Node.js 20+**.

#### Installation
```bash
# 1. Installer les dépendances frontend
npm install

# 2. Installer les dépendances Python
# Si l'erreur pythonnet persiste, installez d'abord PySide6
pip install PySide6
pip install -r backend/requirements.txt
```

#### Création du .exe
```bash
npm run desktop:build
```
Le fichier sera généré dans le dossier `dist/NuruAnalytics.exe`.

### 🛠 Dépannage
- **Erreur `pythonnet`** : Cette erreur survient sur les versions de Python trop récentes (3.12+). Utilisez Python 3.11 ou installez `PySide6` pour que pywebview l'utilise comme moteur alternatif.
- **Ecran Blanc** : Assurez-vous d'avoir exécuté `npm run build` avant de lancer le script desktop.
- **Logs d'erreur** : En cas de crash du .exe, un fichier `error_log.txt` peut être généré à côté de l'application.
