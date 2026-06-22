#!/usr/bin/env bash
# Déploie le site WalahaTracker sur GitHub Pages (walaha.github.io)
set -euo pipefail

REPO_URL="https://github.com/walaha223/walaha.github.io.git"
BRANCH="main"
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT"

echo "→ Dossier : $ROOT"

if [[ ! -f "index.html" ]]; then
  echo "Erreur : index.html introuvable. Lancez ce script depuis la racine du site." >&2
  exit 1
fi

if [[ ! -d ".git" ]]; then
  echo "→ git init"
  git init
fi

if git remote get-url origin &>/dev/null; then
  current="$(git remote get-url origin)"
  if [[ "$current" != "$REPO_URL" ]]; then
    echo "→ git remote set-url origin $REPO_URL"
    git remote set-url origin "$REPO_URL"
  fi
else
  echo "→ git remote add origin $REPO_URL"
  git remote add origin "$REPO_URL"
fi

echo "→ git add ."
git add .

if git diff --cached --quiet; then
  echo "→ Aucun changement à committer."
else
  echo "→ git commit"
  git commit -m "$(cat <<'EOF'
Publish WalahaTracker site for GitHub Pages.

Site vitrine bêta avec captures recadrées, vitrine interactive et assets WebP.
EOF
)"
fi

echo "→ git branch -M $BRANCH"
git branch -M "$BRANCH"

echo "→ git push -u origin $BRANCH"
git push -u origin "$BRANCH"

echo ""
echo "✓ Déployé sur $REPO_URL"
echo "  GitHub Pages : https://walaha223.github.io/ (après activation dans les paramètres du dépôt)"
