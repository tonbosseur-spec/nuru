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

### 🛠 Résolution définitive de l'erreur `pythonnet`
L'erreur "Failed building wheel for pythonnet" arrive parce qu'il manque les outils de compilation C++ sur votre Windows.

**Solution 1 (La Vraie Fix) :**
1. Téléchargez et installez les **[Visual Studio Build Tools](https://visualstudio.microsoft.com/fr/visual-cpp-build-tools/)**.
2. Lors de l'installation, cochez bien la case **"Développement Desktop en C++"**.
3. Redémarrez votre PC.
4. Lancez : `pip install pythonnet`

**Solution 2 (Via GitHub - Recommandé) :**
Ne vous embêtez pas avec l'installation locale ! GitHub dispose déjà de tous les outils de compilation.
1. Exportez ce projet vers votre GitHub.
2. Allez dans **Actions** > **Build Windows EXE**.
3. Récupérez le fichier `.exe` prêt à l'emploi.

### 2. Installation manuelle locale
Si vous voulez absolument builder sur votre machine :
```bash
# 1. Mettre à jour les outils de base
python -m pip install --upgrade pip setuptools wheel

# 2. Installer les dépendances
pip install -r backend/requirements.txt

# 3. Builder le projet
npm run desktop:build
```
