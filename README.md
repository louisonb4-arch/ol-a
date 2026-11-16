# Olea · site vitrine

Site du restaurant Olea (kaakeh libanaise, 16 rue de la Juiverie, Nantes). HTML/CSS/JS sans framework, défilement natif.

## Lancer en local
```bash
python3 -m http.server 8000   # puis http://localhost:8000
```
Ou double-clic sur « Ouvrir le site.command » (macOS). En double-clic direct sur index.html, la police Quicksand est bloquée par Chrome.

## Modifier
- Textes et carte : `index.html`
- Styles : `css/styles.css` · Interactions : `js/main.src.js`
- Puis `./build.sh` (minifie CSS/JS, met à jour le numéro de version anti-cache).

## Ajouter une photo
1. Déposer le JPEG dans `src-img/` (nom court, sans accent).
2. `python3 tools/build_images.py` → génère `img/nom-320/480/720/960.avif` + `img/nom-960.jpg`.
3. L'insérer avec un `<picture>` comme les autres.

## Vérifier
- `python3 tools/functest.py http://localhost:8000/` : 51 tests (ouverture, statut, composer, menu mobile, carte, fichiers).
- Lighthouse local : mobile 97 · 100 · 100 · 100, ordinateur 99 · 100 · 100 · 100.

## À compléter
- Mentions légales : forme juridique, SIRET, directeur de la publication.
- Domaine définitif : remplacer `ol-a.vercel.app` (canonical, OG, sitemap, robots, JSON-LD).
