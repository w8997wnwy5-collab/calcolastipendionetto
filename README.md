# calcolastipendionetto.ch

Calcolatore dello stipendio netto per chi è tassato alla fonte in Ticino: tabelle ufficiali 2026 A, B, C, H e, per i nuovi frontalieri, R, S, T, U. Calcola mese per mese AVS, disoccupazione, LAINF, indennità di malattia, LPP, assegni familiari, tredicesima, bonus e i ricalcoli del modello annuale ticinese.

Il sito è statico e pubblicato con GitHub Pages sul dominio `calcolastipendionetto.ch` (file `CNAME`).

## Struttura

- `index.html`: la pagina pubblicata, generata da `src/build.py`. Non va modificata a mano.
- `src/template.html`: struttura, stile e interfaccia della pagina.
- `src/engine.js`: il motore di calcolo.
- `src/tables_2026.json`: le aliquote 2026, in decimi di punto percentuale, per fasce di 600 franchi fino a 250'800.
- `src/build.py`: inserisce tabelle, motore, domande frequenti e configurazione degli annunci nella pagina.
- `src/test.js` e `src/validate_tables.py`: controlli del motore e delle tabelle.
- `fonts/`: Mona Sans, licenza SIL Open Font License.

## Aggiornare

```sh
python3 src/build.py
node src/test.js
python3 src/validate_tables.py
```

Ogni anno vanno sostituite le tabelle in `src/tables_2026.json` con quelle nuove della Divisione delle contribuzioni. Il controllo verifica anche che le tabelle dei nuovi frontalieri siano l'80% delle tabelle normali, arrotondato per difetto al decimo di punto.

## Annunci

L'ID editore Google AdSense è in `src/build.py`: il build mette il codice AdSense e il meta tag nella pagina e genera `ads.txt`. I tre spazi pubblicitari restano nascosti finché in `ADS['slots']` non ci sono gli ID delle unità annuncio. `python3 src/build.py --preview FILE` crea una copia senza annunci per le anteprime.

## Fonti

- [Aliquote 2026 dell'imposta alla fonte, Cantone Ticino](https://m4.ti.ch/fileadmin/DFE/DC/DOC-IF/Aliquote_2026/Ticino_tabella_A_2026.pdf) (tabelle A, B, C, H, R, S, T, U)
- [Assegni familiari, Ufficio federale delle assicurazioni sociali](https://www.bsv.admin.ch/it/assegni-per-le-famiglie)
- [Circolare AFC n. 45, tassazione ordinaria ulteriore](https://www.estv.admin.ch/dam/estv/it/dokumente/dbst/kreisschreiben/dbst-ks-2019-1-045-d-anhang2-it.pdf.download.pdf/dbst-ks-2019-1-045-d-anhang2-it.pdf)
