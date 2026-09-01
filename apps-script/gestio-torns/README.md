# Gestió Torns — v2

Reescriptura de l'aplicació d'Apps Script **«Calendario fiestas FSC CCOO»**
(_Gestió Torns_), centrada en dues coses: que la interfície no faci esperar mai
l'usuari i que sigui més clara de llegir i de fer servir.

## Com aplicar-ho al projecte d'Apps Script

Els fitxers d'aquesta carpeta es corresponen un a un amb els del projecte:

| Fitxer aquí        | Fitxer a l'editor d'Apps Script |
| ------------------ | ------------------------------- |
| `Code.gs`          | `code.gs`                       |
| `Index.html`       | `Index.html`                    |
| `appsscript.json`  | `appsscript.json` (sense canvis)|

Substitueix el contingut de cada fitxer i torna a desplegar la web app
(**Desplegar → Gestionar desplegaments → editar → Versió nova**). No cal tocar
cap permís ni cap servei: s'utilitzen exactament les mateixes API que abans.

> El primer cop que s'obri després d'actualitzar, la memòria cau local encara és
> buida i la càrrega serà com sempre. A partir d'aleshores arrenca amb dades a
> pantalla immediatament.

## Què ha canviat

### 1. Una crida per any en comptes de tretze

Abans cada mes que miraves era una consulta al servidor (`obtenerEventosMes`),
i a sobre les estadístiques (`obtenerResumenAnual`) i la vista anual
(`obtenerVistaAnual`) tornaven a llegir l'any sencer del calendari.

Ara `obtenerAnyComplet(any, calendari)` retorna en una sola resposta els events,
els torns amb horari, els festius, la bolsa i la configuració. El client en
deriva els mesos, els comptadors, les hores i la vista anual **sense tornar a
parlar amb el servidor**. Canviar de mes passa a ser instantani per sempre.

### 2. L'arrencada es fa en dues fases

La primera versió d'aquest canvi retornava l'any sencer ja a la crida
d'arrencada — una crida en lloc de dues. Era un error: feia que el **primer
pintat depengués d'escombrar 365 dies de calendari**, i amb una agenda
carregada l'aplicació es quedava en blanc, indefinidament, amb l'indicador
en «Sincronitzant».

Ara `arrancar(any, mes, calendari)` retorna els calendaris i **només el mes
visible** — una consulta barata —, i el client demana l'any sencer tot seguit,
en segon pla, amb el calendari ja a la pantalla. Mesurat al navegador: la
graella apareix en ~0,5 s encara que l'any trigui quatre segons més.

Dues proteccions més, perquè això no torni a passar en silenci:

- **Vigilant a cada crida.** Si el servidor no contesta (40 s a l'arrencada,
  120 s per a l'any), la graella deixa de ser un esquelet infinit i passa a
  dir què passa, amb un botó per tornar-ho a provar. Un error del servidor fa
  el mateix, en lloc d'un avís que s'esvaeix en quatre segons.
- **La tipografia ja no bloqueja.** El `<link>` de Google Fonts a `<head>`
  aturava l'execució de l'script fins que arribava; ara es carrega amb
  `media="print"` i s'activa en arribar. L'arrencada tampoc espera el
  logotip: `DOMContentLoaded` en lloc de `window.onload`.

### 3. Arrencada en calent

L'últim any consultat es desa a `localStorage`. En obrir l'aplicació es pinta
immediatament amb aquestes dades i es revalida en segon pla (_stale while
revalidate_); un punt taronja al capçal indica que el que veus encara és local.
Abans no es veia res fins que tornaven dues crides encadenades: primer els
calendaris i, només llavors, els events.

### 4. Escriptures optimistes amb «Desfés»

Desar dies feia tres viatges seguits al servidor: desar → recarregar el mes →
recarregar les estadístiques, i entremig la graella es buidava.

Ara el canvi s'aplica a la còpia local i es pinta a l'instant; la crida va en
segon pla i la resposta ja porta el payload refrescat. Si falla, es recupera
l'estat anterior. Cada operació mostra un avís amb **Desfés**, que restaura
exactament els events que hi havia (`restaurarDies`).

### 5. El servidor llegeix el calendari una sola vegada per operació

`procesarListaDias` feia una consulta `getEvents` **per cada dia seleccionat**.
Marcar 20 dies eren 20 consultes. Ara es llegeix tot el rang de cop i s'agrupa
per dia en memòria.

A més, el payload anual es guarda a `CacheService` amb una clau que inclou una
versió de dades que s'incrementa a cada escriptura, de manera que la memòria cau
s'invalida sola sense TTL curts.

### 6. Seleccionar dies arrossegant el dit

En mode selecció es poden pintar dies arrossegant per la graella, amb una
resposta hàptica per dia. També hi ha una barra de selecció ràpida:
**Tot el mes · Dl–Dv · Caps de setmana · Dies lliures · Cap**.

### 7. Res de diàlegs del navegador

`confirm()` i `alert()` (que en un iframe d'Apps Script apareixen desancorats de
l'aplicació) i l'overlay central bloquejant «⏳ Processant…» se substitueixen per
fulls inferiors i avisos que no bloquegen la interfície.

### 8. Tema fosc

Complet, amb tres estats (automàtic / clar / fosc) des del botó del capçal. Es
resol abans del primer pintat perquè no hi hagi flaix blanc. La impressió surt
sempre en clar.

### 9. Esquelets en comptes d'estats d'espera

Mentre no hi ha dades es mostra un esquelet amb la mida definitiva, així que no
hi ha cap salt de disposició quan arriben. Substitueix el `…` i el fos al 30 %.

### 10. Transicions i detalls

Canvi de mes amb lliscament direccional, comptadors que animen del valor antic
al nou, rebot als dies que acaben de canviar, `prefers-reduced-motion` respectat,
`:focus-visible` per a navegació amb teclat, i etiquetes `aria-label` a cada dia
amb el seu contingut real.

### 11. Prima per cap de setmana treballat sencer

Nou comptador: **150 € per cada dissabte + diumenge treballats íntegrament**, que
es cobren l'any següent.

Un dia compta com a treballat només si té torn i **cap altra marca**. Qualsevol
absència en un dels dos dies —baixa, llicència, AP/CH, VE, VA, EBEP, FC, FS, FO,
FO/DES o festiu oficial automàtic— deixa aquell cap de setmana fora de la prima.

Es mostra en un bàner amb l'import total, en un xip de la barra d'extres, al peu
i al resum de la vista anual (i per tant també a la impressió). Tocant el bàner
s'obre el detall amb la llista de caps de setmana que compten, agrupats per mes,
per poder-ho contrastar amb la nòmina.

### 12. Marca de cap de setmana (CS)

Una eina de pintar, no un tipus de dia: **només ombreja**. No suma ni resta cap
hora — l'event que crea no porta `Horario:` a la descripció, que és l'única
cosa d'on surten les hores — i té **grup propi** (`MARCA`), de manera que no
substitueix el torn ni cap absència: s'hi superposa.

Es dibuixa com una trama diagonal rosa amb un anell del mateix color, per sobre
del color que ja tingui el dia. Així es distingeix d'un dia pintat encara que a
sota hi hagi un torn blau o unes vacances verdes.

Serveix per decidir a mà quins caps de setmana entren a la prima de 150 €:

- Si l'any **no té cap marca**, la prima es compta automàticament com fins ara
  (dissabte i diumenge amb torn i sense cap absència).
- En el moment que n'hi ha **una de sola**, manen les marques: compta cada
  parell dissabte + diumenge marcats. El bàner diu sempre quin dels dos modes
  està actiu, així que el número no canvia mai sense explicació.
- El full de detall ofereix **«Marcar els N que surten treballats»**, que
  converteix la detecció automàtica en marques reals d'un sol toc, per després
  afegir-ne o treure'n una a una.

### Correcció addicional: festius mòbils de qualsevol any

`festivosFijos()` tenia el Divendres Sant, el Dilluns de Pasqua i el Dilluns de
Pasqua Granada escrits a mà només per a 2025 i 2026, i retornava una llista buida
per a qualsevol altre any — tot i que el selector d'anys arriba fins a l'actual
més tres. Ara es calculen amb l'algorisme de Meeus/Jones/Butcher, i per a 2025 i
2026 donen exactament les mateixes dates que hi havia escrites.

## Proves

Sense dependències: carreguen el codi real amb un DOM mínim i comproven la capa
de dades, les mutacions optimistes, «Desfés» i el càlcul de la prima.

```sh
node test/test-client.js         # capa de dades i mutacions optimistes
node test/test-caps-setmana.js   # prima per cap de setmana
node test/test-servidor.js       # Pasqua, festius i detecció de tipus
```
