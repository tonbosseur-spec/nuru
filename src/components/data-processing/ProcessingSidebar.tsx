import React from 'react';
import { 
  Eraser, 
  Trash2, 
  RefreshCcw, 
  PlusCircle, 
  Calendar, 
  Filter, 
  Zap, 
  GitMerge, 
  CheckCircle2, 
  Sparkles,
  ChevronDown,
  LucideIcon
} from 'lucide-react';

interface ToolCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  tools: { id: string; name: string; description: string }[];
}

const CATEGORIES: ToolCategory[] = [
  {
    id: 'cleaning',
    name: 'Nettoyage des données',
    icon: Eraser,
    tools: [
      { id: 'DROP_NA_ROWS', name: 'Supprimer lignes vides', description: 'Supprime toutes les lignes contenant des valeurs manquantes' },
      { id: 'DROP_NA_COLS', name: 'Supprimer colonnes vides', description: 'Supprime les variables qui n\'ont aucune donnée' },
      { id: 'DROP_DUPLICATES', name: 'Détecter les doublons', description: 'Identifie et supprime les lignes identiques' },
      { id: 'STRIP_SPACES', name: 'Espaces inutiles', description: 'Supprime les espaces au début et à la fin des textes' },
      { id: 'TEXT_CASE', name: 'Uniformiser casse', description: 'Convertit les textes en majuscules ou minuscules' }
    ]
  },
  {
    id: 'missing_values',
    name: 'Valeurs manquantes',
    icon: Trash2,
    tools: [
      { id: 'REPLACE_NA_MEAN', name: 'Remplacer par moyenne', description: 'Remplace les N/A numériques par la moyenne' },
      { id: 'REPLACE_NA_MEDIAN', name: 'Remplacer par médiane', description: 'Remplace les N/A numériques par la médiane' },
      { id: 'REPLACE_NA_MODE', name: 'Remplacer par mode', description: 'Remplace les N/A par la valeur la plus fréquente' },
      { id: 'REPLACE_NA_CUSTOM', name: 'Valeur personnalisée', description: 'Définit une valeur de remplacement précise' }
    ]
  },
  {
    id: 'transformations',
    name: 'Transformations',
    icon: RefreshCcw,
    tools: [
      { id: 'CONVERT_NUMERIC', name: 'Texte ➔ Numérique', description: 'Convertit une variable texte en nombres' },
      { id: 'ONE_HOT_ENCODE', name: 'One-Hot Encoding', description: 'Crée des colonnes binaires pour les catégories' },
      { id: 'NORMALIZE', name: 'Normalisation Min-Max', description: 'Échelle entre 0 et 1' },
      { id: 'STANDARDIZE', name: 'Standardisation Z-Score', description: 'Moyenne 0, Écart-type 1' },
      { id: 'LOG_TRANSFORM', name: 'Logarithmique (log)', description: 'Applique une transformation log(x)' }
    ]
  },
  {
    id: 'creation',
    name: 'Création de variables',
    icon: PlusCircle,
    tools: [
      { id: 'CALC_COLUMN', name: 'Colonne calculée', description: 'Crée une variable à partir d\'une formule' },
      { id: 'CONDITIONAL', name: 'Variable conditionnelle', description: 'Si... Alors... Sinon...' },
      { id: 'CONCAT_COLS', name: 'Concaténer colonnes', description: 'Fusionne plusieurs variables texte' }
    ]
  },
  {
    id: 'time',
    name: 'Dates et Temps',
    icon: Calendar,
    tools: [
      { id: 'PARSE_DATE', name: 'Détecter les dates', description: 'Parse automatiquement les formats de date' },
      { id: 'EXTRACT_DATE_PART', name: 'Extraire Année/Mois/Jour', description: 'Isole une partie précise de la date' },
      { id: 'CALC_AGE', name: 'Calculer l\'âge', description: 'Calcul basé sur une date de naissance' }
    ]
  },
  {
    id: 'filtering',
    name: 'Filtrage et sélection',
    icon: Filter,
    tools: [
      { id: 'FILTER_COMPLEX', name: 'Filtres multiples', description: 'Filtres combinés avancés' },
      { id: 'SELECT_COLS', name: 'Sélectionner colonnes', description: 'Garde uniquement les variables choisies' },
      { id: 'SORT_MULTI', name: 'Tri multicritère', description: 'Trier par plusieurs colonnes' }
    ]
  },
  {
    id: 'outliers',
    name: 'Valeurs aberrantes',
    icon: Zap,
    tools: [
      { id: 'OUTLIER_IQR', name: 'Méthode IQR', description: 'Interquartile Range detection' },
      { id: 'OUTLIER_ZSCORE', name: 'Méthode Z-Score', description: 'Standard deviation outlier detection' }
    ]
  },
  {
    id: 'reshaping',
    name: 'Fusion et structure',
    icon: GitMerge,
    tools: [
      { id: 'MERGE_TABLES', name: 'Fusionner datasets', description: 'Join, Left Join, Right Join...' },
      { id: 'PIVOT_TABLE', name: 'Table de pivot', description: 'Restructurer les données (Pivot)' },
      { id: 'GROUP_BY', name: 'Regroupement', description: 'Agrégations par catégories' }
    ]
  },
  {
    id: 'validation',
    name: 'Validation',
    icon: CheckCircle2,
    tools: [
      { id: 'DATA_QUALITY', name: 'Score qualité', description: 'Analyse la santé globale du dataset' },
      { id: 'VALIDATE_RULES', name: 'Règles métiers', description: 'Vérifie les plages de valeurs' }
    ]
  },
  {
    id: 'ai',
    name: 'Suggestions IA',
    icon: Sparkles,
    tools: [
      { id: 'AI_ANALYZE', name: 'Analyse automatique', description: 'Laisse l\'IA détecter les anomalies' },
      { id: 'AI_SUGGEST', name: 'Suggérer nettoyages', description: 'Propose les meilleures actions' }
    ]
  }
];

interface ProcessingSidebarProps {
  onSelectTool: (tool: any) => void;
  activeTool: any;
}

export function ProcessingSidebar({ onSelectTool, activeTool }: ProcessingSidebarProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>('cleaning');

  return (
    <aside className="w-72 border-r bg-[#f1f5f9] flex flex-col shrink-0 z-10">
      <div className="p-4 border-b bg-white/50 backdrop-blur-sm">
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center">
          <Settings className="h-3 w-3 mr-2" /> Outils de traitement
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="overflow-hidden rounded-xl bg-white/40 border border-slate-200/50 shadow-sm transition-all hover:bg-white/60">
            <button 
              onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
              className="w-full px-4 py-3.5 flex items-center justify-between group"
            >
              <div className="flex items-center">
                <div className={`p-2 rounded-lg mr-3 transition-colors ${cat.id === 'ai' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'}`}>
                    <cat.icon className="h-4 w-4" />
                </div>
                <span className={`text-[13px] font-bold ${expandedId === cat.id ? 'text-indigo-600' : 'text-slate-700'}`}>{cat.name}</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${expandedId === cat.id ? 'rotate-180 text-indigo-500' : ''}`} />
            </button>
            <div className={`transition-all duration-300 ${expandedId === cat.id ? 'max-h-[500px] pb-3 px-3' : 'max-h-0'}`}>
              <div className="space-y-1">
                {cat.tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => onSelectTool({ ...tool, category: cat.id })}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden ${activeTool?.id === tool.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-white'}`}
                  >
                    <div className="text-[12px] font-semibold mb-0.5">{tool.name}</div>
                    <div className={`text-[10px] leading-tight ${activeTool?.id === tool.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {tool.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Settings({ className }: { className?: string }) {
    return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
}
