#!/usr/bin/env bash
# Déploie le site WalahaTracker sur GitHub Pages (walaha223.github.io)
set -euo pipefail

REPO_URL="https://github.com/walaha223/walaha223.github.io.git"
SITE_URL="https://walaha223.github.io/"
PAGES_SETTINGS="https://github.com/walaha223/walaha223.github.io/settings/pages"
BRANCH="main"
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT"

echo "→ Dossier : $ROOT"

if [[ ! -f "index.html" ]]; then
  echo "Erreur : index.html introuvable." >&2
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
Update WalahaTracker site for GitHub Pages.
EOF
)"
fi

echo "→ git branch -M $BRANCH"
git branch -M "$BRANCH"

echo "→ git push -u origin $BRANCH"
git push -u origin "$BRANCH"

echo ""
echo "→ Vérification GitHub Pages"
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  if gh api "repos/walaha223/walaha223.github.io/pages" >/dev/null 2>&1; then
    echo "✓ GitHub Pages est déjà configuré."
  else
    echo "→ Activation GitHub Pages depuis main / (root)"
    gh api \
      --method POST \
      "repos/walaha223/walaha223.github.io/pages" \
      -F "source[branch]=$BRANCH" \
      -F "source[path]=/" >/dev/null
    echo "✓ GitHub Pages activé."
  fi
else
  echo "ℹ GitHub CLI n'est pas connecté. Pour activer Pages depuis le terminal :"
  echo "  gh auth login"
  echo "  gh api --method POST repos/walaha223/walaha223.github.io/pages -F source[branch]=$BRANCH -F source[path]=/"
fi

echo ""
echo "✓ Code poussé sur $REPO_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ACTIVATION GITHUB PAGES (une seule fois)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Ouvrir : $PAGES_SETTINGS"
echo "  2. Build and deployment → Source : Deploy from a branch"
echo "  3. Branch : main  |  Folder : / (root)"
echo "  4. Cliquer Save"
echo ""
echo "  Site en ligne sous 1-2 min : $SITE_URL"
echo ""

if [[ "$(uname)" == "Darwin" ]] && command -v open &>/dev/null; then
  open "$PAGES_SETTINGS" 2>/dev/null || true
fi
