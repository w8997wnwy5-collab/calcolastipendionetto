"""Costruisce index.html nella radice del sito da src/: motore + tabelle + pagina.
Uso: python3 src/build.py && node src/test.js"""
import json, html, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
P = lambda *a: os.path.join(HERE, *a)
tables = json.load(open(P('tables_2026.json')))
order = ['A0'] + [f'B{i}' for i in range(5)] + [f'C{i}' for i in range(5)] + [f'H{i}' for i in range(1, 5)] + ['R0'] + \
        [f'S{i}' for i in range(5)] + [f'T{i}' for i in range(5)] + [f'U{i}' for i in range(1, 5)]
assert sorted(order) == sorted(tables)
js = '{' + ','.join(f'{k}:[{",".join(map(str, tables[k]))}]' for k in order) + '}'
src = open(P('engine.js')).read()
assert src.count('__TABLES__') == 1
open(P('engine.built.js'), 'w').write(src.replace('__TABLES__', js))
print('engine.built.js', len(src.replace('__TABLES__', js)), 'bytes')

SITE = 'https://calcolastipendionetto.ch/'
ADS = {'client': '', 'host': 'calcolastipendionetto.ch', 'slots': ['', '', '']}
FAQ = [
 ("Quale tabella dell'imposta alla fonte mi tocca?",
  "Dipende dalla tua situazione familiare. A: persona sola senza figli. B: coppia sposata in cui lavora solo uno. "
  "C: coppia sposata in cui lavorano entrambi. H: persona sola che vive con figli a carico. Il numero dopo la lettera "
  "indica i figli a carico, per esempio B2. I nuovi frontalieri usano le tabelle R, S, T e U, che corrispondono ad A, B, C e H. "
  "La tua tabella è scritta anche sulla busta paga."),
 ("Sono frontaliere: cosa cambia?",
  "Se hai iniziato a lavorare in Ticino dopo il 17 luglio 2023 sei un nuovo frontaliere: la Svizzera trattiene l'80% "
  "dell'imposta normale (tabelle R, S, T e U) e il reddito lo dichiari anche in Italia, che tiene conto di quanto hai già pagato qui. "
  "Se lavoravi già in Ticino da prima, paghi l'imposta solo in Svizzera, con le tabelle A, B, C e H. "
  "Il calcolatore copre la parte svizzera: le imposte italiane non sono incluse."),
 ("Perché nel mese della tredicesima prendo meno di quanto mi aspettavo?",
  "Perché in Ticino vale il modello annuale. Con la tredicesima il reddito dell'anno sale, quindi sale anche l'aliquota. "
  "La nuova aliquota si applica a tutto quello che hai guadagnato dall'inizio dell'anno, e la differenza sui mesi già pagati "
  "viene trattenuta in un colpo solo nella busta della tredicesima."),
 ("Gli assegni familiari pagano l'imposta alla fonte?",
  "Sì. Gli assegni per i figli (215 franchi al mese in Ticino nel 2026) e di formazione (268 franchi, dai 16 ai 25 anni) "
  "si sommano allo stipendio per calcolare l'imposta alla fonte, ma non pagano l'AVS. Li riceve un solo genitore: "
  "se li prende l'altro, togli la spunta nel calcolatore."),
 ("Cos'è la tassazione ordinaria ulteriore e mi conviene?",
  "Con la tassazione ordinaria ulteriore (TOU) compili una dichiarazione d'imposta come chi non è tassato alla fonte, "
  "e puoi dedurre per esempio il terzo pilastro 3a, i riscatti nella cassa pensione e le spese professionali effettive. "
  "Per chi vive in Svizzera è obbligatoria se il reddito lordo da lavoro arriva a 120'000 franchi all'anno. Sotto quella soglia "
  "puoi chiederla entro il 31 marzo dell'anno dopo, ma la richiesta non si può ritirare: resti in TOU finché sei tassato alla fonte. "
  "Di solito conviene se hai deduzioni importanti. Per i frontalieri le regole sono diverse."),
 ("Perché il risultato può essere diverso dalla mia busta paga?",
  "I programmi paga arrotondano e proiettano in modi leggermente diversi, per esempio sui bonus. Anche LPP, LAINF e indennità "
  "di malattia cambiano da un datore di lavoro all'altro: se hai una busta paga, inserisci le tue percentuali e il tuo importo LPP. "
  "Il calcolo segue le tabelle ufficiali 2026 del Cantone Ticino ed è stato verificato su buste paga reali, ma resta una stima."),
 ("Quanto vale l'auto aziendale in busta paga?",
  "Se puoi usare l'auto aziendale anche per scopi privati, ogni mese si aggiunge allo stipendio lo 0.9% del prezzo d'acquisto "
  "senza IVA, almeno 150 franchi: per un'auto da 50'000 franchi sono 450 franchi al mese. Non li ricevi in contanti, "
  "ma pagano AVS e imposta alla fonte. Nel calcolatore la trovi in «Altre voci in busta»."),
]
faq_html = ''.join(f'<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>' for q, a in FAQ)
ld = [
 {"@context": "https://schema.org", "@type": "WebApplication", "name": "Calcola stipendio netto", "url": SITE,
  "applicationCategory": "FinanceApplication", "operatingSystem": "Any", "inLanguage": "it-CH",
  "description": "Calcolatore dello stipendio netto mese per mese per chi è tassato alla fonte in Ticino, con le tabelle ufficiali 2026.",
  "offers": {"@type": "Offer", "price": "0", "priceCurrency": "CHF"}},
 {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
   {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]},
]
engine = open(P('engine.built.js')).read()
page = open(P('template.html')).read()
for k, v in {'__FAQ__': faq_html, '__LD__': json.dumps(ld, ensure_ascii=False).replace('</', '<\\/'),
             '__ADS__': json.dumps(ADS), '__SITE__': SITE}.items():
    assert k in page, k
    page = page.replace(k, v)
assert page.count('__ENGINE__') == 1
page = page.replace('__ENGINE__', engine)
assert '__' not in page.replace('__proto__', ''), [l for l in page.splitlines() if '__' in l][:3]
open(os.path.join(ROOT, 'index.html'), 'w').write(page)
print('index.html', len(page), 'bytes')
