# StatStudio 📊

StatStudio est une application web moderne d'analyse statistique inspirée de logiciels professionnels comme SPSS, Rcmdr et Jamovi. Elle utilise une architecture innovante basée sur **Pyodide** pour exécuter le moteur d'analyse Python (`pandas`, `scipy`, `statsmodels`, `plotly`) **directement dans le navigateur du client**, sans dépendre d'un serveur backend lourd.

## 🚀 Fonctionnalités
- **Importation de Données :** Glisser-déposer de fichiers `.csv` ou `.txt` (moteur Pandas).
- **Interface Professionnelle :** Organisation en onglets intuitifs avec un panneau des variables dynamique.
- **Analyses Statistiques :**
  - Statistiques Descriptives
  - Graphiques Interactifs (Plotly)
  - Tests de Normalité (Shapiro-Wilk, Kolmogorov-Smirnov)
  - Tests d'Hypothèses (t-Test, ANOVA)
  - Régression Linéaire
- **Code Généré en Temps Réel :** Chaque analyse génère le code Python exact utilisé pour produire les résultats, affiché dans une console de type IDE. L'utilisateur peut copier-coller ce code.

## 🛠️ Stack Technique
- **Frontend :** React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui.
- **Moteur d'analyse (WebAssembly) :** Pyodide (`pandas`, `scipy`, `statsmodels`, `scikit-learn`, `plotly`).
- **Gestion d'état :** Zustand.
- **Graphiques :** react-plotly.js.

## 📦 Installation & Lancement

1. \`npm install\` - Installer les dépendances
2. \`npm run dev\` - Lancer le serveur de développement

*Note : L'analyse fonctionne entièrement côté client sans backend séparé via FastAPI, rendant l'application ultra-rapide et sécurisée (les données ne quittent pas votre navigateur).*
