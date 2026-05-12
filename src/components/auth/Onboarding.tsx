import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, LayoutDashboard, Globe, ShieldCheck, Activity } from 'lucide-react';
import { motion } from 'motion/react';

export function Onboarding() {
  const { setUser } = useStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName.trim() && lastName.trim()) {
      setUser({ firstName: firstName.trim(), lastName: lastName.trim() });
    }
  };

  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      {/* Visual Side */}
      <div className="hidden lg:flex flex-col w-1/2 bg-indigo-950 text-white p-12 justify-between relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-0 -left-20 w-80 h-80 bg-indigo-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-600 rounded-full blur-[120px]" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-12">
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
              <Zap className="w-8 h-8 text-indigo-400 fill-current" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Nuru Analytics</span>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              L'analyse de données, <br /> 
              <span className="text-indigo-400 italic">réinventée localement.</span>
            </h1>
            <p className="text-xl text-indigo-200/80 max-w-md leading-relaxed">
              Puissance statistique, sécurité absolue et interface intuitive. 
              Tout se passe dans votre navigateur.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-8 py-8 border-t border-white/10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-indigo-300">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Confidentialité</span>
            </div>
            <p className="text-sm text-indigo-200/60">Vos données ne quittent jamais votre machine.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-indigo-300">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Performance</span>
            </div>
            <p className="text-sm text-indigo-200/60">Moteur Python haute performance via WASM.</p>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center space-x-2 mb-12 justify-center">
            <Zap className="w-6 h-6 text-indigo-600 fill-current" />
            <span className="text-xl font-bold tracking-tight text-slate-900">Nuru Analytics</span>
          </div>

          <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-slate-200/60 transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)]">
            <CardHeader className="space-y-1.5 pt-8">
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Bienvenue</CardTitle>
              <CardDescription className="text-slate-500">
                Créez votre profil local pour commencer à analyser.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5 py-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-xs font-bold uppercase tracking-wider text-slate-600">Prénom</Label>
                  <Input 
                    id="firstName" 
                    placeholder="Ex. Jean" 
                    className="h-11 border-slate-200 focus:ring-indigo-500 rounded-lg"
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-xs font-bold uppercase tracking-wider text-slate-600">Nom</Label>
                  <Input 
                    id="lastName" 
                    placeholder="Ex. Dupont" 
                    className="h-11 border-slate-200 focus:ring-indigo-500 rounded-lg"
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    required 
                  />
                </div>
              </CardContent>
              <CardFooter className="pb-8">
                <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all active:scale-[0.98]">
                  Commencer l'aventure
                </Button>
              </CardFooter>
            </form>
          </Card>
          
          <p className="mt-8 text-center text-xs text-slate-400">
            Nuru Analytics — Version 2.0.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}
