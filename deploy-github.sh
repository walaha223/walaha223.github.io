#!/usr/bin/env bash
# Déploie le site WalahaTracker sur GitHub Pages (walaha223.github.io)
set -euo pipefail

REPO_HTTPS="https://github.com/walaha223/walaha223.github.io.git"
REPO_SSH="git@github.com:walaha223/walaha223.github.io.git"
SITE_URL="https://walaha223.github.io/"
PAGES_SETTINGS="https://github.com/walaha223/walaha223.github.io/settings/pages"
BRANCH="main"
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT"

echo "→ WalahaTracker — déploiement GitHub Pages"
echo "→ Dossier : $ROOT"

if [[ ! -f "index.html" ]]; then
  echo "Erreur : index.html introuvable." >&2
  exit 1
fi

pick_repo_url() {
  # GIT_REMOTE=https|ssh pour forcer ; sinon SSH si la clé GitHub fonctionne
  if [[ "${GIT_REMOTE:-}" == "https" ]]; then
    echo "$REPO_HTTPS"
    return
  fi
  if [[ "${GIT_REMOTE:-}" == "ssh" ]]; then
    echo "$REPO_SSH"
    return
  fi
  if ssh -o BatchMode=yes -o ConnectTimeout=5 -T git@github.com 2>&1 | grep -qi "successfully authenticated"; then
    echo "$REPO_SSH"
  else
    echo "$REPO_HTTPS"
  fi
}

REPO_URL="$(pick_repo_url)"
echo "→ Remote : $REPO_URL"

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
if ! git push -u origin "$BRANCH"; then
  if [[ "$REPO_URL" == "$REPO_SSH" ]]; then
    echo "⚠️  Push SSH échoué, nouvel essai en HTTPS…" >&2
    git remote set-url origin "$REPO_HTTPS"
    git push -u origin "$BRANCH"
    REPO_URL="$REPO_HTTPS"
  else
    exit 1
  fi
fi

pages_configured=false
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  if gh api "repos/walaha223/walaha223.github.io/pages" >/dev/null 2>&1; then
    pages_configured=true
    echo "✓ GitHub Pages est déjà configuré."
  else
    echo "→ Activation GitHub Pages (main / root)…"
    if gh api \
      --method POST \
      "repos/walaha223/walaha223.github.io/pages" \
      -F "source[branch]=$BRANCH" \
      -F "source[path]=/" >/dev/null 2>&1; then
      pages_configured=true
      echo "✓ GitHub Pages activé."
    fi
  fi
elif curl -fsI "$SITE_URL" 2>/dev/null | head -1 | grep -q "200"; then
  pages_configured=true
  echo "✓ Site accessible : $SITE_URL"
fi

echo ""
echo "✓ Code poussé sur $REPO_URL"

if [[ "$pages_configured" == true ]]; then
  echo "  Site : $SITE_URL"
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ACTIVATION GITHUB PAGES (une seule fois)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  1. Ouvrir : $PAGES_SETTINGS"
  echo "  2. Build and deployment → Deploy from a branch"
  echo "  3. Branch : main  |  Folder : / (root)"
  echo "  4. Cliquer Save"
  echo ""
  echo "  Site : $SITE_URL"
  echo ""
  echo "  Ou connecter GitHub CLI : gh auth login"
fi
