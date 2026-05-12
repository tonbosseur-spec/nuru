import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  HelpCircle, 
  BarChart2, 
  ArrowLeft, 
  CheckCircle2, 
  Info,
  Scale,
  Activity,
  LineChart,
  Target
} from 'lucide-react';

interface Node {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children?: Node[];
  recommendation?: {
    text: string;
    action: string;
  };
}

const tree: Node = {
  id: 'root',
  title: 'Quel est votre objectif ?',
  description: 'Sélectionnez le type d\'analyse que vous souhaitez réaliser.',
  icon: <HelpCircle className="w-6 h-6 text-indigo-500" />,
  children: [
    {
      id: 'describe',
      title: 'Décrire mon échantillon',
      description: 'Calculer des moyennes, des fréquences et des indicateurs de dispersion.',
      icon: <Info className="w-5 h-5 text-blue-500" />,
      recommendation: {
        text: 'Utilisez les Statistiques Descriptives.',
        action: 'descriptives'
      }
    },
    {
      id: 'relationships',
      title: 'Explorer des relations',
      description: 'Chercher si deux variables sont liées entre elles.',
      icon: <Activity className="w-5 h-5 text-emerald-500" />,
      children: [
        {
          id: 'rel_quali_quali',
          title: 'Deux variables qualitatives',
          description: 'ex: Lien entre le genre et le choix d\'un produit.',
          icon: <ChevronRight className="w-4 h-4" />,
          recommendation: {
            text: 'Utilisez le Test du Khi-deux (Association).',
            action: 'tests'
          }
        },
        {
          id: 'rel_quanti_quanti',
          title: 'Deux variables quantitatives',
          description: 'ex: Lien entre l\'âge et le revenu.',
          icon: <ChevronRight className="w-4 h-4" />,
          recommendation: {
            text: 'Utilisez la Corrélation de Pearson ou Spearman.',
            action: 'tests'
          }
        }
      ]
    },
    {
      id: 'compare',
      title: 'Comparer des groupes',
      description: 'Vérifier si une moyenne diffère selon un facteur.',
      icon: <Scale className="w-5 h-5 text-amber-500" />,
      children: [
        {
          id: 'comp_2',
          title: 'Comparer 2 groupes',
          description: 'ex: Hommes vs Femmes.',
          icon: <ChevronRight className="w-4 h-4" />,
          children: [
            {
              id: 'comp_2_norm',
              title: 'Données Normales',
              description: 'Distribution en cloche (Gaussienne).',
              icon: <ChevronRight className="w-4 h-4" />,
              recommendation: {
                text: 'Utilisez le Test T de Student.',
                action: 'tests'
              }
            },
            {
              id: 'comp_2_non_norm',
              title: 'Données Non-Normales',
              description: 'Petits échantillons ou distribution asymétrique.',
              icon: <ChevronRight className="w-4 h-4" />,
              recommendation: {
                text: 'Utilisez le Test de Mann-Whitney.',
                action: 'tests'
              }
            }
          ]
        },
        {
          id: 'comp_many',
          title: 'Comparer + de 2 groupes',
          description: 'ex: 3 catégories d\'âge différentes.',
          icon: <ChevronRight className="w-4 h-4" />,
          children: [
            {
              id: 'comp_many_norm',
              title: 'Données Normales',
              description: 'Distribution en cloche.',
              icon: <ChevronRight className="w-4 h-4" />,
              recommendation: {
                text: 'Utilisez l\'ANOVA à un facteur.',
                action: 'tests'
              }
            },
            {
              id: 'comp_many_non_norm',
              title: 'Données Non-Normales',
              description: 'Distribution asymétrique.',
              icon: <ChevronRight className="w-4 h-4" />,
              recommendation: {
                text: 'Utilisez le Test de Kruskal-Wallis.',
                action: 'tests'
              }
            }
          ]
        }
      ]
    },
    {
      id: 'predict',
      title: 'Prédire une valeur',
      description: 'Estimer une valeur Y en fonction d\'un ou plusieurs prédicteurs X.',
      icon: <Target className="w-5 h-5 text-rose-500" />,
      children: [
        {
          id: 'pred_simple',
          title: 'Un seul prédicteur',
          description: 'ex: Prédire le poids en fonction de la taille.',
          icon: <ChevronRight className="w-4 h-4" />,
          recommendation: {
            text: 'Utilisez la Régression Linéaire Simple.',
            action: 'regression'
          }
        },
        {
          id: 'pred_multi',
          title: 'Plusieurs prédicteurs',
          description: 'ex: Prédire le succès en fonction de l\'âge, l\'étude et l\'expérience.',
          icon: <ChevronRight className="w-4 h-4" />,
          recommendation: {
            text: 'Utilisez la Régression Linéaire Multiple.',
            action: 'regression'
          }
        }
      ]
    },
    {
      id: 'visualize',
      title: 'Visualiser les données',
      description: 'Créer des graphiques pour explorer visuellement.',
      icon: <BarChart2 className="w-5 h-5 text-cyan-500" />,
      recommendation: {
        text: 'Utilisez le menu Graphiques.',
        action: 'graphiques'
      }
    }
  ]
};

interface Props {
  onNavigation: (tab: string) => void;
}

export function AnalysisAssistant({ onNavigation }: Props) {
  const [history, setHistory] = useState<Node[]>([tree]);
  const currentNode = history[history.length - 1];

  const handleSelect = (node: Node) => {
    if (node.children) {
      setHistory([...history, node]);
    }
  };

  const goBack = () => {
    if (history.length > 1) {
      setHistory(history.slice(0, -1));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-8">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
        {/* Progress Bar */}
        <div className="h-2 bg-slate-100 flex">
           {history.map((_, i) => (
             <div key={i} className={`flex-1 h-full transition-all duration-500 ${i === history.length - 1 ? 'bg-indigo-600' : 'bg-indigo-300'}`} />
           ))}
        </div>

        <div className="p-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentNode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                {history.length > 1 && (
                  <button 
                    onClick={goBack}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                )}
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    {currentNode.icon}
                    <h2 className="text-2xl font-bold text-slate-900">{currentNode.title}</h2>
                  </div>
                  <p className="text-slate-500">{currentNode.description}</p>
                </div>
              </div>

              {currentNode.children ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentNode.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => handleSelect(child)}
                      className="text-left p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                         <div className="space-y-2">
                            <div className="p-2 bg-slate-50 rounded-lg w-fit group-hover:bg-indigo-100 transition-colors">
                              {child.icon}
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">{child.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{child.description}</p>
                         </div>
                         <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all mt-1" />
                      </div>
                      
                      {child.recommendation && (
                        <div 
                          className="mt-6 flex items-center gap-2 text-indigo-600 font-bold text-sm bg-white border border-indigo-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                          onClick={(e) => {
                             e.stopPropagation();
                             onNavigation(child.recommendation!.action);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Aller à : {child.recommendation.text}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : currentNode.recommendation ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-8 text-center flex flex-col items-center space-y-6">
                  <div className="p-4 bg-white rounded-full shadow-lg border border-indigo-100">
                    <CheckCircle2 className="w-12 h-12 text-indigo-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-indigo-900">Analyse recommandée</h3>
                    <p className="text-lg text-indigo-700">{currentNode.recommendation.text}</p>
                  </div>
                  <button
                    onClick={() => onNavigation(currentNode.recommendation!.action)}
                    className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
                  >
                    Ouvrir le module
                  </button>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium tracking-wider uppercase">
          Assistant Statistique Nuru v2
        </div>
      </div>
    </div>
  );
}
