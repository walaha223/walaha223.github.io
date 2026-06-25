# walaha223.github.io

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

Le script initialise le dépôt (si besoin), commit les fichiers et pousse sur `https://github.com/walaha223/walaha223.github.io.git`.

### Activer GitHub Pages (obligatoire, une seule fois)

Le dépôt contient le site, mais GitHub Pages doit être activé manuellement :

1. Ouvrir [Settings → Pages](https://github.com/walaha223/walaha223.github.io/settings/pages)
2. **Build and deployment** → **Deploy from a branch**
3. **Branch** : `main` · **Folder** : `/ (root)`
4. Cliquer **Save**

Le site sera disponible sur **https://walaha223.github.io/** après 1 à 2 minutes.

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
- `wac/` : Walaha Admin Center (démo statique).
- `pwe/` : Portail Web Écoles — [README](pwe/README.md) · démo `directeur@fasokanu.ml` / `walaha-demo`






marketing@walaha.net
support@walaha.net

A Ajouter au site web