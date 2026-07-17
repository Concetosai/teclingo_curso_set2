import { useState } from 'react';

const WritingRulesPanel = () => {
  const [isOpen, setIsOpen] = useState(false);

  const rules = [
    { num: 1, rule: "Siempre inicia la oración con MAYÚSCULA.", example: "✅ I am a student.  ❌ i am a student." },
    { num: 2, rule: "Termina la oración con punto (.).", example: "✅ She is happy.  ❌ She is happy" },
    { num: 3, rule: "El pronombre 'I' (yo) SIEMPRE va en mayúscula.", example: "✅ I am from Mexico.  ❌ i am from Mexico." },
    { num: 4, rule: "Nombres propios van en mayúscula: personas, países, ciudades.", example: "✅ Carlos, Mexico, Dallas  ❌ carlos, mexico, dallas" },
    { num: 5, rule: "Días de la semana y meses SIEMPRE en mayúscula (a diferencia del español).", example: "✅ Monday, January  ❌ monday, january" },
    { num: 6, rule: "Usa apóstrofo (') en las contracciones.", example: "✅ I'm, don't, she's  ❌ Im, dont, shes" },
    { num: 7, rule: "Los adjetivos van ANTES del sustantivo.", example: "✅ a big house  ❌ a house big" },
    { num: 8, rule: "Orden básico: Sujeto + Verbo + Objeto (SVO).", example: "✅ She eats pizza.   She pizza eats." },
    { num: 9, rule: "No pongas espacio antes de coma (,) o punto (.).", example: "✅ Hello, world.  ❌ Hello , world ." },
    { num: 10, rule: "Después de coma o punto, la siguiente palabra va en mayúscula (si es inicio de oración).", example: "✅ I am tired, but happy.  ❌ I am tired, But happy." },
  ];

  return (
    <div className="bg-amber-900/20 border border-amber-700 rounded-xl mb-6 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-amber-900/30 hover:bg-amber-900/50 transition-colors"
      >
        <span className="text-amber-400 font-semibold flex items-center gap-2">
          📋 Reglas básicas de escritura en inglés
        </span>
        <span className="text-amber-400 text-sm">{isOpen ? '▲ Ocultar' : '▼ Mostrar'}</span>
      </button>
      
      {isOpen && (
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {rules.map((item) => (
            <div key={item.num} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
              <div className="flex items-start gap-3">
                <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded-full shrink-0">
                  {item.num}
                </span>
                <div className="flex-1">
                  <p className="text-slate-200 text-sm font-medium mb-1">{item.rule}</p>
                  <p className="text-slate-400 text-xs font-mono bg-slate-800 p-2 rounded">{item.example}</p>
                </div>
              </div>
            </div>
          ))}
          <p className="text-amber-400 text-xs italic text-center pt-2">
            💡 Ten estas reglas en mente cada vez que escribas. ¡La práctica hace al maestro!
          </p>
        </div>
      )}
    </div>
  );
};

export default WritingRulesPanel;
