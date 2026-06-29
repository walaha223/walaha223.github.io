# Portail Web Écoles (PWE)

Espace web réservé aux **écoles validées** par Walaha Admin Center. Chaque établissement ne voit que ses propres données.

Spécification : [portail_ecoles.md](../../WalahaTracker/docs_walaha/portail_ecoles.md) (source WalahaTracker).

## Accès

- URL locale : `http://localhost:8000/pwe/`
- URL GitHub Pages : `https://walaha223.github.io/pwe/`
- Démo locale (lecture seule, mock) : `http://localhost:8000/pwe/?demo=1`

## Démarrage local

Depuis la racine `walaha.net` :

```bash
python3 -m http.server 8000
```

Puis ouvrir [http://localhost:8000/pwe/](http://localhost:8000/pwe/).

## Supabase (mode par défaut)

Le portail utilise **Supabase** pour toutes les données et l’authentification. La démo mock n’est active qu’avec `?demo=1` (ou `localStorage pwe_demo=1`).

1. Copier `js/supabase-config.example.js` → `js/supabase-config.js`
2. Renseigner `url` et `anonKey` (même projet que WalahaTracker)
3. Appliquer les migrations PWE :

```bash
cd WalahaTracker && ./scripts/push_supabase_migrations.sh
# WalahaStore, Devoirs, Carnet (extensions WAC) :
./scripts/push_supabase_wac_extensions.sh
```

4. Créer un compte Supabase Auth, puis lier l’école :

```sql
INSERT INTO public.school_staff (school_id, user_id, role)
SELECT id, '<uuid-auth.users>', 'school_director'
FROM public.canonical_schools
WHERE public_code = 'ECO-00291';
```

L’école **ECO-00291** (Faso Kanu) est seedée avec classes, élèves, bulletins et frais.

Sans `supabase-config.js` valide, le portail affiche un écran de connexion avec un message d’erreur — **pas de fallback mock automatique**.

## Démo locale (`?demo=1` uniquement)

| Champ | Valeur |
|-------|--------|
| Email | `directeur@fasokanu.ml` |
| Mot de passe | `walaha-demo` |

Données fictives (`js/mock-data.js`), lecture seule. Aucune écriture en base.

## Règles d’accès (spec)

1. L’école doit être **validée** par la Walaha Team (WAC).
2. L’utilisateur doit figurer dans `school_staff` avec statut `active`.
3. Une école `suspended` ou `pending_review` est refusée.
4. Aucun accès global Walaha — données limitées à **une** école.

## MVP — routes

| Route hash | Page |
|------------|------|
| `#dashboard` | Tableau de bord |
| `#profile` | Profil école |
| `#classes` | Classes |
| `#students` | Élèves |
| `#teachers` | Enseignants |
| `#reports` | Bulletins |
| `#fees` | Frais scolaires |
| `#messages` | Messages parents |
| `#homework` | Devoirs (module WalahaStore — verrouillé si non activé) |
| `#store` | WalahaStore (catalogue + demandes d'activation) |
| `#settings` | Paramètres |
| `#statistics` | Statistiques école |

## Connexion données

| Mode | Condition | Source |
|------|-----------|--------|
| **Supabase** | `js/supabase-config.js` valide (défaut) | Supabase Auth + `school_staff` + tables PWE |
| **Démo** | `?demo=1` (même onglet) | `js/mock-data.js` (lecture seule) |
| **Non configuré** | config absente sans `?demo=1` | Écran login + message d’erreur |

## Phase B — écritures Supabase

Après migration `20250623000013_pwe_phase_b.sql` :

| Fonction | Page | RPC / table |
|----------|------|-------------|
| Modifier profil école | Profil | `pwe_update_school_profile` |
| Créer classe / élève | Classes, Élèves | `school_classes`, `school_students` |
| Lier personnel (code Walaha) | Enseignants | `pwe_invite_school_staff_by_code` |
| Ajouter bulletin | Bulletins | `pwe_create_report` |
| Publier bulletins | Bulletins | `pwe_publish_reports` |
| Enregistrer paiement | Frais | `pwe_record_fee_payment` |
| Message parents | Messages | `school_announcements` |

```bash
cd WalahaTracker && ./scripts/push_supabase_migrations.sh
```

Hard refresh PWE après déploiement : `Cmd+Shift+R` sur `/pwe/` (`?v=20260623-11`).

## Phase C — édition, archivage, statistiques

Après migration `20250623000014_pwe_phase_c.sql` :

| Fonction | Page | RPC |
|----------|------|-----|
| Modifier / archiver classe | Classes | `pwe_update_class` |
| Supprimer classe | Classes | `pwe_delete_class` (si aucun élève actif) |
| Modifier / archiver élève | Élèves | `pwe_update_student` |
| Statistiques internes | Statistiques | `pwe_get_school_statistics` |

Actions par ligne dans les tableaux Classes et Élèves (icônes modifier / archiver).

Cache : `?v=20260623-36`.

## Guide première connexion

Bandeau sur le tableau de bord (`js/pwe-onboarding.js`) : profil → classes → élèves → parents `PAR-`. Masquable par école (`localStorage`).

## Permissions par rôle

Matrice alignée sur la spec §8 (`js/pwe-permissions.js`) : navigation filtrée, boutons d'action masqués, message contextuel dans l'en-tête (enseignant, comptable, secrétaire…). Tests : `node pwe/tests/pwe-permissions.test.mjs`.

## Messagerie (réponses)

Les annonces parents supportent un **fil de réponses** (école ↔ parents). Migration : `20250627000002_pwe_announcement_replies.sql`. RPC : `pwe_list_announcement_replies`, `pwe_create_announcement_reply`.

## WalahaStore (page `#store`)

Catalogue des modules premium activables par l'école (lecture de `store_modules`), avec :

- **Bandeau statistiques** : catalogue, actifs, en attente, disponibles
- **Modules recommandés** (mise en avant)
- **Filtres par catégorie** (chips) + recherche texte
- **Fiches module** (modal détail : objectif, fonctionnalités, tarif)
- **Demande d'activation** → `store_subscriptions` (statut `requested`) → file WAC
- Barre latérale : modules actifs, demandes en attente, guide en 4 étapes

- Demande réservée aux `school_owner` / `school_director` (RLS).
- L'approbation puis l'activation se font côté Walaha Team (WAC).
- Migration requise (même projet) : `walaha.net/wac/supabase/20250625000100_walaha_store.sql`.
- En démo (`?demo=1`), le catalogue est interactif : demandes simulées en `localStorage`, paywall réaliste (Devoirs actif sur Faso Kanu par défaut).

## Module « Devoirs » (page `#homework`)

Premier vrai module WalahaStore (payant). La page est **verrouillée** tant que l'école n'a pas un abonnement actif au module `homework` (vérifié via `isModuleActive`) : elle affiche un état « non activé » avec un lien vers WalahaStore. Une fois actif, le personnel pédagogique peut **créer / lister / archiver** des devoirs par classe (matière, consignes, échéance).

- Paywall appliqué aussi côté serveur : RLS `school_homework` exige `school_has_active_module(school_id, 'homework')` pour l'écriture.
- Migration : `walaha.net/wac/supabase/20250625000300_homework_module.sql`.
- En démo, le module est considéré actif (avec données fictives) pour visualiser l'UI.

## Structure

```
pwe/
  index.html              # Shell SPA
  css/pwe.css             # Styles portail école
  js/mock-data.js         # Données démo (?demo=1)
  js/supabase-config.js   # Clés Supabase (gitignored en local)
  js/pwe-utils.js         # Utilitaires partagés (genre M/F, DOM…)
  js/pwe-permissions.js   # Matrice rôles / routes
  js/pwe-router.js         # Routes et garde d'accès
  js/pwe-onboarding.js     # Guide première connexion
  js/pwe-store.js           # WalahaStore (catalogue, abonnements)
  js/pwe-api.js           # Couche données Supabase / démo
  js/pwe.js               # Auth, routing, rendu principal
  tests/pwe-permissions.test.mjs
  README.md
```
