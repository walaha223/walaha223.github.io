# walaha.github.io

Site GitHub Pages de **WalahaTracker** — suivi scolaire familial au Mali.

## WalahaTracker — Site vitrine bêta

Site vitrine one-page en français pour présenter WalahaTracker au Mali et collecter les demandes d’accès bêta.

## Démarrage local

Ouvrir `index.html` dans un navigateur, ou lancer un serveur statique depuis ce dossier.

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Déploiement GitHub Pages

```bash
chmod +x deploy-github.sh
./deploy-github.sh
```

Le script initialise le dépôt (si besoin), commit les fichiers et pousse sur `https://github.com/walaha223/walaha.github.io.git`.

## Captures de validation

Pour les captures headless, activer la préférence `prefers-reduced-motion: reduce`.
Les sections avec la classe `.reveal` restent alors visibles sans attendre `IntersectionObserver`, ce qui évite les captures blanches et permet de valider la mise en page.

## Configuration avant mise en ligne

Remplacer les placeholders suivants dans `index.html` :

- `G-XXXXXXXXXX` par l’identifiant Google Analytics 4 réel.
- `https://formspree.io/f/FORM_ID` par l’endpoint Formspree réel.
- `https://wa.me/223XXXXXXXX` par le numéro WhatsApp réel avec l’indicatif du Mali.

## Structure

- `index.html` : contenu du site, SEO, Google Analytics.
- `css/style.css` : styles responsive.
- `js/main.js` : menu mobile, suivi des événements, soumission du formulaire.
- `logos/` : assets logo fournis.
