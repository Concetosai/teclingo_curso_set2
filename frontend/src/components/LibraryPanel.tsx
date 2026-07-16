import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface LibraryProps { world: string; highlightRuleId?: string | null; }

interface LibrarySection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

const worldData: Record<string, {
  vocabTitle: string;
  vocabCategories: { name: string; color: string; words: string[] }[];
  expressions: { en: string; es: string }[];
  mistakes: { w: string; c: string; r: string }[];
}> = {
  tecnm: {
    vocabTitle: 'Vocabulario del Campus TecNM',
    vocabCategories: [
      { name: '🏫 Campus', color: 'text-blue-400', words: ['campus', 'classroom', 'laboratory', 'cafeteria', 'library', 'workshop', 'office', 'auditorium'] },
      { name: '📚 Academia', color: 'text-green-400', words: ['exam', 'homework', 'assignment', 'project', 'grade', 'semester', 'syllabus', 'certificate'] },
      { name: '👨‍🏫 Personas', color: 'text-purple-400', words: ['professor', 'instructor', 'classmate', 'student', 'engineer', 'technician', 'principal', 'coordinator'] },
      { name: '🔧 Ingeniería', color: 'text-yellow-400', words: ['engineering', 'technology', 'systems', 'design', 'formula', 'diagram', 'measurement', 'calculation'] },
    ],
    expressions: [
      { en: 'Excuse me, professor...', es: 'Disculpe, profesor...' },
      { en: 'I have a question about the assignment.', es: 'Tengo una pregunta sobre la tarea.' },
      { en: 'Where is the laboratory?', es: '¿Dónde está el laboratorio?' },
      { en: 'When is the next exam?', es: '¿Cuándo es el próximo examen?' },
      { en: 'Can I make up the exam?', es: '¿Puedo recuperar el examen?' },
      { en: 'What is my grade?', es: '¿Cuál es mi calificación?' },
      { en: 'I need help with the project.', es: 'Necesito ayuda con el proyecto.' },
      { en: 'The class starts at 7 AM.', es: 'La clase empieza a las 7 AM.' },
      { en: 'I am an engineering student.', es: 'Soy estudiante de ingeniería.' },
      { en: 'Where is the coordinator?', es: '¿Dónde está el coordinador?' },
    ],
    mistakes: [
      { w: '❌ I have 20 years old', c: '✅ I am 20 years old', r: 'En inglés se usa "to be" para la edad.' },
      { w: '❌ The class of today is...', c: "✅ Today's class is...", r: 'Usa el posesivo "today\'s" en lugar de "of today".' },
      { w: '❌ I need do the homework', c: '✅ I need to do the homework', r: 'Después de "need" se usa "to + verbo".' },
      { w: '❌ The professor give us a exam', c: '✅ The professor gave us an exam', r: '"Exam" empieza con vocal, usa "an". Pasado: "gave".' },
    ],
  },
  empresa: {
    vocabTitle: 'Vocabulario de la Empresa',
    vocabCategories: [
      { name: '💼 Negocios', color: 'text-blue-400', words: ['meeting', 'client', 'deadline', 'report', 'invoice', 'contract', 'project', 'budget'] },
      { name: '🏢 Oficina', color: 'text-green-400', words: ['manager', 'director', 'department', 'schedule', 'department', 'branch', 'headquarters', 'reception'] },
      { name: '📊 Producción', color: 'text-purple-400', words: ['production', 'quality', 'shipping', 'inventory', 'warehouse', 'supplier', 'logistics', 'export'] },
      { name: '💰 Finanzas', color: 'text-yellow-400', words: ['payment', 'price', 'cost', 'profit', 'tax', 'receipt', 'account', 'transfer'] },
    ],
    expressions: [
      { en: 'I will send you the report.', es: 'Le enviaré el reporte.' },
      { en: "What's the deadline for the project?", es: '¿Cuál es la fecha límite del proyecto?' },
      { en: 'Let us schedule a meeting.', es: 'Programemos una reunión.' },
      { en: 'The client is waiting.', es: 'El cliente está esperando.' },
      { en: 'Can you call the supplier?', es: '¿Puedes llamar al proveedor?' },
      { en: 'I need to check the inventory.', es: 'Necesito revisar el inventario.' },
      { en: 'When is the shipment?', es: '¿Cuándo es el envío?' },
      { en: 'The quality is very good.', es: 'La calidad es muy buena.' },
      { en: 'I am a professional in this company.', es: 'Soy profesional en esta empresa.' },
      { en: 'Let me introduce myself to the client.', es: 'Permítame presentarme al cliente.' },
    ],
    mistakes: [
      { w: '❌ The people is working', c: '✅ The people are working', r: '"People" es plural, usa "are".' },
      { w: '❌ I have a meeting tomorrow morning', c: '✅ I have a meeting tomorrow morning', r: '¡Correcto! Pero cuidado: "I have TO GO TO a meeting".' },
      { w: '❌ The manager said me that...', c: '✅ The manager told me that...', r: 'En inglés se dice "tell someone", no "say someone".' },
      { w: '❌ I need send the email', c: '✅ I need to send the email', r: 'Después de "need" siempre "to + verbo".' },
    ],
  },
  usa_university: {
    vocabTitle: 'USA University Life',
    vocabCategories: [
      { name: '🏫 Campus', color: 'text-blue-400', words: ['lecture hall', 'dormitory', 'office hours', 'student center', 'financial aid', 'registrar', 'syllabus', 'GPA'] },
      { name: '📚 Academia', color: 'text-green-400', words: ['major', 'minor', 'elective', 'credit', 'midterm', 'final exam', 'transcript', 'academic advisor'] },
      { name: '👨‍🎓 Personas', color: 'text-purple-400', words: ['professor', 'roommate', 'classmate', 'international student', 'dean', 'RA', 'faculty', 'alumni'] },
      { name: '🏠 Vida en Campus', color: 'text-yellow-400', words: ['cafeteria', 'laundry', 'bookstore', 'shuttle', 'health center', 'career center', 'library', 'study group'] },
    ],
    expressions: [
      { en: 'I need to go to office hours.', es: 'Necesito ir a las horas de oficina del profesor.' },
      { en: 'Where is the financial aid office?', es: '¿Dónde está la oficina de ayuda financiera?' },
      { en: 'What is my GPA?', es: '¿Cuál es mi promedio (GPA)?' },
      { en: 'Can I drop this class?', es: '¿Puedo darme de baja de esta clase?' },
      { en: 'The midterm is next week.', es: 'El examen parcial es la próxima semana.' },
      { en: 'I need to register for next semester.', es: 'Necesito inscribirme para el próximo semestre.' },
      { en: 'Where is the international student office?', es: '¿Dónde está la oficina de estudiantes internacionales?' },
      { en: 'My roommate is from California.', es: 'Mi compañero de cuarto es de California.' },
      { en: 'I am an international student.', es: 'Soy estudiante internacional.' },
      { en: 'The library is open 24 hours during finals.', es: 'La biblioteca está abierta 24 horas durante exámenes finales.' },
    ],
    mistakes: [
      { w: '❌ I have 3.5 of GPA', c: '✅ I have a 3.5 GPA', r: 'En inglés se dice "a 3.5 GPA", sin preposición "of".' },
      { w: '❌ The professor give us a lot of homework', c: '✅ The professor gives us a lot of homework', r: 'Tercera persona singular: "gives" con "s".' },
      { w: '❌ I need to do the homeworks', c: '✅ I need to do the homework', r: '"Homework" es incontable en inglés. Sin "s".' },
      { w: '❌ I want to major in engineering of software', c: '✅ I want to major in software engineering', r: 'El orden en inglés es: "software engineering", no "engineering of software".' },
    ],
  },
  viajes: {
    vocabTitle: 'Vocabulario de Viajes',
    vocabCategories: [
      { name: '✈️ Aeropuerto', color: 'text-blue-400', words: ['airport', 'flight', 'gate', 'boarding pass', 'luggage', 'customs', 'departure', 'arrival'] },
      { name: '🏨 Hotel', color: 'text-green-400', words: ['hotel', 'reservation', 'room', 'key', 'receptionist', 'check-in', 'check-out', 'suite'] },
      { name: '🗺️ Destinos', color: 'text-purple-400', words: ['tourist', 'museum', 'beach', 'restaurant', 'souvenir', 'attraction', 'guide', 'map'] },
      { name: '🗣️ Comunicación', color: 'text-yellow-400', words: ['ticket', 'passport', 'visA', 'exchange', 'currency', 'direction', 'emergency', 'phrase'] },
    ],
    expressions: [
      { en: 'Where is the gate to Cancun?', es: '¿Dónde está la puerta a Cancún?' },
      { en: 'I have a reservation.', es: 'Tengo una reservación.' },
      { en: 'How much is the ticket?', es: '¿Cuánto cuesta el boleto?' },
      { en: 'Can you help me? I am lost.', es: '¿Puedes ayudarme? Estoy perdido.' },
      { en: 'I would like a room, please.', es: 'Me gustaría una habitación, por favor.' },
      { en: 'What time does the flight leave?', es: '¿A qué hora sale el vuelo?' },
      { en: 'Where can I exchange money?', es: '¿Dónde puedo cambiar dinero?' },
      { en: 'Is there a restaurant near here?', es: '¿Hay un restaurante cerca de aquí?' },
      { en: 'I am a tourist from Mexico.', es: 'Soy turista de México.' },
      { en: 'Excuse me, where is the museum?', es: 'Disculpe, ¿dónde está el museo?' },
    ],
    mistakes: [
      { w: '❌ I have 30 years old', c: '✅ I am 30 years old', r: 'Edad = "to be" + años + old.' },
      { w: '❌ The hotel is very beautiful, I want to reserve it', c: '✅ The hotel is very nice, I want to book it', r: '"Reserve" no se usa para hoteles. Usa "book a room".' },
      { w: '❌ How much costs the ticket?', c: '✅ How much does the ticket cost?', r: 'En preguntas con "how much", el verbo va al final con "does".' },
      { w: '❌ I can to help you', c: '✅ I can help you', r: 'Después de "modal" (can, should, must) el verbo va sin "to".' },
    ],
  },
  vida_diaria: {
    vocabTitle: 'Vocabulario de Vida Diaria',
    vocabCategories: [
      { name: '🏠 Hogar', color: 'text-blue-400', words: ['house', 'apartment', 'neighbor', 'street', 'neighborhood', 'room', 'kitchen', 'bathroom'] },
      { name: '🛒 Compras', color: 'text-green-400', words: ['supermarket', 'bakery', 'pharmacy', 'market', 'price', 'receipt', 'cart', 'bag'] },
      { name: '👨‍👩‍👧 Familia', color: 'text-purple-400', words: ['family', 'mother', 'father', 'brother', 'sister', 'son', 'daughter', 'grandfather'] },
      { name: '🕐 Rutinas', color: 'text-yellow-400', words: ['wake up', 'cook', 'clean', 'laundry', 'commute', 'return', 'shower', 'breakfast'] },
    ],
    expressions: [
      { en: 'I am from this neighborhood.', es: 'Soy de este barrio.' },
      { en: 'Is the supermarket open?', es: '¿Está abierto el supermercado?' },
      { en: 'Where is the pharmacy?', es: '¿Dónde está la farmacia?' },
      { en: 'How much are the apples?', es: '¿Cuánto cuestan las manzanas?' },
      { en: 'Can you help me carry these bags?', es: '¿Puedes ayudarme a cargar estas bolsas?' },
      { en: 'I go to work every day.', es: 'Voy al trabajo todos los días.' },
      { en: 'My neighbor is very friendly.', es: 'Mi vecino es muy amable.' },
      { en: 'I need to buy some milk.', es: 'Necesito comprar leche.' },
      { en: 'We are happy in this community.', es: 'Somos felices en esta comunidad.' },
      { en: 'Excuse me, where is the park?', es: 'Disculpe, ¿dónde está el parque?' },
    ],
    mistakes: [
      { w: '❌ I have 25 years', c: '✅ I am 25 years old', r: 'Edad = "to be" + años + old.' },
      { w: '❌ The store is very near of my house', c: '✅ The store is very near my house', r: '"Near" no lleva preposición "of". Va directamente con el sustantivo.' },
      { w: '❌ I am going to doing the laundry', c: '✅ I am going to do the laundry', r: 'Después de "going to" el verbo va en forma base.' },
      { w: '❌ I like a lot my neighborhood', c: '✅ I like my neighborhood a lot', r: 'El adverbio "a lot" va al final de la oración.' },
    ],
  },
};

const LibraryPanel = ({ world, highlightRuleId }: LibraryProps) => {
  const [openSection, setOpenSection] = useState<string | null>('grammar_rules');
  const [grammarRules, setGrammarRules] = useState<any[]>([]);
  const [grammarLoading, setGrammarLoading] = useState(true);
  const [expandedRule, setExpandedRule] = useState<string | null>(highlightRuleId || null);

  useEffect(() => {
    fetch(`${API_BASE}/api/course/grammar-library`)
      .then(r => r.json())
      .then(data => { setGrammarRules(data.rules || []); setGrammarLoading(false); })
      .catch(() => setGrammarLoading(false));
  }, []);

  useEffect(() => {
    if (highlightRuleId) {
      setOpenSection('grammar_rules');
      setExpandedRule(highlightRuleId);
    }
  }, [highlightRuleId]);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const wd = worldData[world] || worldData.tecnm;

  const sections: LibrarySection[] = [
    {
      id: 'grammar_rules',
      title: 'Reglas Gramaticales CEFR A1',
      icon: '📖',
      content: (
        <div className="space-y-3 text-sm">
          <p className="text-amber-400 font-semibold text-xs">📚 Referencia gramatical del nivel A1. Cuando cometas un error, revisa aquí la regla correspondiente.</p>
          {grammarLoading ? (
            <p className="text-slate-400">Cargando reglas...</p>
          ) : grammarRules.length === 0 ? (
            <p className="text-slate-400">No hay reglas disponibles.</p>
          ) : (
            grammarRules.map((rule: any) => (
              <div key={rule.rule_id} className={`bg-slate-800 rounded-lg border overflow-hidden ${expandedRule === rule.rule_id ? 'border-blue-500' : 'border-slate-700'}`}>
                <button
                  onClick={() => setExpandedRule(expandedRule === rule.rule_id ? null : rule.rule_id)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${rule.category === 'Verbos' ? 'bg-blue-900 text-blue-300' : rule.category === 'Sustantivos' ? 'bg-green-900 text-green-300' : rule.category === 'Tiempos verbales' ? 'bg-purple-900 text-purple-300' : rule.category === 'Preposiciones' ? 'bg-yellow-900 text-yellow-300' : 'bg-slate-700 text-slate-300'}`}>{rule.category}</span>
                    <span className="text-white font-medium text-xs">{rule.title}</span>
                  </div>
                  <span className="text-slate-400 text-xs">{expandedRule === rule.rule_id ? '▲' : '▼'}</span>
                </button>
                {expandedRule === rule.rule_id && (
                  <div className="px-3 pb-3 border-t border-slate-700 bg-slate-900/50 space-y-2 mt-1">
                    <div className="bg-blue-950/50 p-2 rounded border border-blue-900 mt-2">
                      <p className="text-blue-300 font-semibold text-xs mb-1">📐 Estructura:</p>
                      <p className="text-slate-300 text-xs font-mono whitespace-pre-line">{rule.structure}</p>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                      <p className="text-green-400 font-semibold text-xs mb-1">✅ Ejemplos:</p>
                      {rule.examples?.map((ex: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-700 last:border-0">
                          <span className="text-blue-400">{ex.en}</span>
                          <span className="text-slate-400">{ex.es}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-amber-950/30 p-2 rounded border border-amber-900">
                      <p className="text-amber-400 font-semibold text-xs mb-1">💡 Tips:</p>
                      <ul className="text-slate-300 text-xs space-y-1">
                        {rule.tips?.map((tip: string, i: number) => <li key={i}>• {tip}</li>)}
                      </ul>
                    </div>
                    {rule.common_mistakes?.length > 0 && (
                      <div className="bg-red-950/30 p-2 rounded border border-red-900">
                        <p className="text-red-400 font-semibold text-xs mb-1">⚠️ Errores comunes:</p>
                        {rule.common_mistakes.map((m: any, i: number) => (
                          <div key={i} className="text-xs py-1 border-b border-red-900/50 last:border-0">
                            <p className="text-red-400">❌ {m.wrong}</p>
                            <p className="text-green-400">✅ {m.right}</p>
                            <p className="text-slate-400 italic">{m.why}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ),
    },
    {
      id: 'rules',
      title: 'Reglas de Escritura',
      icon: '📝',
      content: (
        <ul className="space-y-2 text-sm">
          {[
            { r: 'Inicia la oración con MAYÚSCULA.', e: '✅ I am a student.  ❌ i am a student.' },
            { r: 'Termina con punto (.).', e: '✅ She is happy.  ❌ She is happy' },
            { r: 'El pronombre "I" SIEMPRE en mayúscula.', e: '✅ I am from Mexico.   i am from Mexico.' },
            { r: 'Nombres propios en mayúscula (personas, países, ciudades).', e: '✅ Carlos, Mexico, Dallas' },
            { r: 'Días y meses en mayúscula.', e: '✅ Monday, January  ❌ monday, january' },
            { r: 'Usa apóstrofo en contracciones.', e: "✅ I'm, don't, she's" },
            { r: 'Adjetivos ANTES del sustantivo.', e: '✅ a big house  ❌ a house big' },
            { r: 'Orden básico: Sujeto + Verbo + Objeto.', e: '✅ She eats pizza.' },
            { r: 'Sin espacio antes de coma o punto.', e: '✅ Hello, world.  ❌ Hello , world.' },
            { r: 'Mayúscula después de punto (inicio de oración).', e: '✅ I am tired, but happy.' },
          ].map((item, i) => (
            <li key={i} className="bg-slate-800 p-2 rounded border border-slate-700">
              <p className="text-slate-200 font-medium">{i + 1}. {item.r}</p>
              <p className="text-slate-400 text-xs font-mono mt-1">{item.e}</p>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'pronouns',
      title: 'Pronombres Personales',
      icon: '🔤',
      content: (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {[
            { en: 'I', es: 'Yo' },
            { en: 'You', es: 'Tú / Usted' },
            { en: 'He', es: 'Él' },
            { en: 'She', es: 'Ella' },
            { en: 'It', es: 'Eso / Ello (cosas/animales)' },
            { en: 'We', es: 'Nosotros' },
            { en: 'They', es: 'Ellos / Ellas' },
          ].map((p, i) => (
            <div key={i} className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
              <p className="text-blue-400 font-bold text-lg">{p.en}</p>
              <p className="text-slate-400 text-xs">{p.es}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'verbs',
      title: 'Verbo "To Be" (Ser / Estar)',
      icon: '🔗',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-green-400 font-semibold mb-2">✅ Afirmativo</p>
            <div className="grid grid-cols-2 gap-2">
              {['I am', 'You are', 'He is', 'She is', 'It is', 'We are', 'They are'].map((v, i) => (
                <div key={i} className="bg-slate-800 p-2 rounded border border-slate-700 text-center font-mono">{v}</div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-red-400 font-semibold mb-2">❌ Negativo</p>
            <div className="grid grid-cols-2 gap-2">
              {["I am not", "You are not (aren't)", "He is not (isn't)", "She is not (isn't)", "It is not (isn't)", "We are not (aren't)", "They are not (aren't)"].map((v, i) => (
                <div key={i} className="bg-slate-800 p-2 rounded border border-slate-700 text-center font-mono text-xs">{v}</div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-yellow-400 font-semibold mb-2">❓ Interrogativo</p>
            <div className="grid grid-cols-2 gap-2">
              {['Am I...?', 'Are you...?', 'Is he...?', 'Is she...?', 'Is it...?', 'Are we...?', 'Are they...?'].map((v, i) => (
                <div key={i} className="bg-slate-800 p-2 rounded border border-slate-700 text-center font-mono">{v}</div>
              ))}
            </div>
          </div>
          <div className="bg-slate-800 p-3 rounded border border-slate-700 mt-4">
            <p className="text-purple-400 font-semibold mb-2">💡 Ejemplos de tu contexto:</p>
            {world === 'tecnm' && <p className="text-slate-300 text-xs">I <span className="text-green-400 font-bold">am</span> a TecNM student. The lab <span className="text-green-400 font-bold">is</span> big. We <span className="text-green-400 font-bold">are</span> in the classroom.</p>}
            {world === 'empresa' && <p className="text-slate-300 text-xs">I <span className="text-green-400 font-bold">am</span> a professional. The meeting <span className="text-green-400 font-bold">is</span> at 3 PM. We <span className="text-green-400 font-bold">are</span> the logistics team.</p>}
            {world === 'usa_university' && <p className="text-slate-300 text-xs">I <span className="text-green-400 font-bold">am</span> an international student. The lecture <span className="text-green-400 font-bold">is</span> at 10 AM. We <span className="text-green-400 font-bold">are</span> in the dorm.</p>}
            {world === 'viajes' && <p className="text-slate-300 text-xs">I <span className="text-green-400 font-bold">am</span> a tourist. The hotel <span className="text-green-400 font-bold">is</span> beautiful. We <span className="text-green-400 font-bold">are</span> at the airport.</p>}
            {world === 'vida_diaria' && <p className="text-slate-300 text-xs">I <span className="text-green-400 font-bold">am</span> from this neighborhood. My house <span className="text-green-400 font-bold">is</span> small. They <span className="text-green-400 font-bold">are</span> my neighbors.</p>}
          </div>
        </div>
      ),
    },
    {
      id: 'possessives',
      title: 'Adjetivos Posesivos',
      icon: '👤',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {[
              { en: 'My', es: 'Mi' },
              { en: 'Your', es: 'Tu / Su' },
              { en: 'His', es: 'De él' },
              { en: 'Her', es: 'De ella' },
              { en: 'Its', es: 'De eso (cosa/animal)' },
              { en: 'Our', es: 'Nuestro' },
              { en: 'Their', es: 'De ellos' },
            ].map((p, i) => (
              <div key={i} className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                <p className="text-purple-400 font-bold text-lg">{p.en}</p>
                <p className="text-slate-400 text-xs">{p.es}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 p-3 rounded border border-slate-700 text-sm">
            <p className="text-purple-400 font-semibold mb-2">💡 Ejemplos de tu contexto:</p>
            {world === 'tecnm' && <p className="text-slate-300 text-xs"><span className="text-purple-400 font-bold">My</span> professor is great. This is <span className="text-purple-400 font-bold">our</span> classroom. <span className="text-purple-400 font-bold">Their</span> project is excellent.</p>}
            {world === 'empresa' && <p className="text-slate-300 text-xs"><span className="text-purple-400 font-bold">My</span> manager is professional. This is <span className="text-purple-400 font-bold">our</span> office. <span className="text-purple-400 font-bold">Their</span> client is important.</p>}
            {world === 'usa_university' && <p className="text-slate-300 text-xs"><span className="text-purple-400 font-bold">My</span> advisor is helpful. This is <span className="text-purple-400 font-bold">our</span> dorm. <span className="text-purple-400 font-bold">Their</span> research is impressive.</p>}
            {world === 'viajes' && <p className="text-slate-300 text-xs"><span className="text-purple-400 font-bold">My</span> passport is blue. This is <span className="text-purple-400 font-bold">our</span> hotel. <span className="text-purple-400 font-bold">Their</span> restaurant is famous.</p>}
            {world === 'vida_diaria' && <p className="text-slate-300 text-xs"><span className="text-purple-400 font-bold">My</span> house is small. This is <span className="text-purple-400 font-bold">our</span> neighborhood. <span className="text-purple-400 font-bold">Their</span> store is near.</p>}
          </div>
        </div>
      ),
    },
    {
      id: 'vocabulary',
      title: 'Vocabulario Temático',
      icon: '📖',
      content: (
        <div className="space-y-3 text-sm">
          <p className="text-amber-400 font-semibold text-xs">🌍 Contexto: {wd.vocabTitle}</p>
          {wd.vocabCategories.map((cat, i) => (
            <div key={i}>
              <p className={`${cat.color} font-semibold mb-2`}>{cat.name}</p>
              <div className="flex flex-wrap gap-2">
                {cat.words.map((w, j) => (
                  <span key={j} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs">{w}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'expressions',
      title: 'Expresiones Útiles',
      icon: '💬',
      content: (
        <div className="space-y-2 text-sm">
          <p className="text-amber-400 font-semibold text-xs mb-2">🌍 Frases para tu contexto: {wd.vocabTitle}</p>
          {wd.expressions.map((p, i) => (
            <div key={i} className="flex justify-between bg-slate-800 p-2 rounded border border-slate-700">
              <span className="text-blue-400 font-medium">{p.en}</span>
              <span className="text-slate-400 text-xs">{p.es}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'mistakes',
      title: 'Errores Comunes',
      icon: '⚠️',
      content: (
        <ul className="space-y-2 text-sm">
          <p className="text-amber-400 font-semibold text-xs mb-2">🌍 Errores frecuentes en contexto de {wd.vocabTitle}</p>
          {wd.mistakes.map((m, i) => (
            <li key={i} className="bg-slate-800 p-3 rounded border border-slate-700">
              <p className="text-red-400 text-xs">{m.w}</p>
              <p className="text-green-400 text-xs font-medium">{m.c}</p>
              <p className="text-slate-400 text-xs italic mt-1">💡 {m.r}</p>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full px-4 py-3 flex items-center justify-between bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <span className="text-white font-semibold flex items-center gap-2">
              <span className="text-xl">{section.icon}</span>
              {section.title}
            </span>
            <span className="text-slate-400 text-sm">{openSection === section.id ? '▲' : '▼'}</span>
          </button>
          {openSection === section.id && (
            <div className="p-4 border-t border-slate-700 bg-slate-900/50 max-h-96 overflow-y-auto">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LibraryPanel;
