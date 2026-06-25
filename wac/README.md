# Walaha Admin Center

Ce dossier contient tout ce qui concerne le Walaha Admin Center, l'espace interne reserve a la Walaha Team.

Le WAC est separe du site vitrine, de l'application mobile et du futur Portail Web Ecoles. Les ecoles, parents, eleves, enseignants et repetiteurs ne doivent pas utiliser cet espace.

Specification principale :

- [Admin_walaha.md](./Admin_walaha.md)
- [supabase/20250623000100_wac_admin.sql](./supabase/20250623000100_wac_admin.sql)

Branchement Supabase :

- le frontend WAC utilise Supabase Auth avec la cle publishable dans `js/supabase-config.js` ;
- apres connexion, l'utilisateur doit exister dans `admin_members` avec `status = 'active'` ;
- les ecrans lisent les tables Supabase existantes : `users`, `canonical_schools`, `canonical_students`, `canonical_tutors`, `educational_activities` ;
- les tables internes WAC sont creees par la migration SQL : `admin_members`, `admin_audit_logs`, `moderation_reports`, `school_digital_payments`.

Migrations a appliquer dans l'ordre :

1. `supabase/20250623000100_wac_admin.sql` — tables internes + lecture (RLS SELECT).
2. `supabase/20250624000100_wac_actions.sql` — policies d'ecriture + audit pour rendre les actions operationnelles.
3. `supabase/20250624000200_school_requests.sql` — table `school_requests` (demandes d'ecoles) + RLS.
4. `supabase/20250624000300_wac_members_games.sql` — lecture de tous les membres + INSERT jeux educatifs.
5. `supabase/20250624000400_wac_user_moderation.sql` — table `user_moderation` (statut des comptes).
6. `supabase/20250625000100_walaha_store.sql` — WalahaStore : `store_modules` + `store_subscriptions` + RLS + seed 7 modules MVP.
7. `supabase/20250625000200_store_custom_requests.sql` — WalahaStore : demandes de modules personnalisés (sur devis).
8. `supabase/20250625000300_homework_module.sql` — 1er module réel « Devoirs » (`school_homework`) + verrou paywall `school_has_active_module()`.

Edge Functions (a deployer depuis le projet WalahaTracker, meme projet Supabase) :

- `WalahaTracker/supabase/functions/wac-validate-school` — validation officielle d'une ecole : genere le code `ECO-`, cree la ligne `canonical_schools`, marque la demande active et trace l'action.
- `WalahaTracker/supabase/functions/wac-manage-admins` — gestion des membres (ajout par email, changement de role, revocation / reactivation). **Reservee au super_admin.**
- `WalahaTracker/supabase/functions/wac-moderate-user` — suspension REELLE d'un compte (bannissement Supabase Auth) / reactivation. Roles super_admin / walaha_admin / moderator.
- Deploiement : `supabase functions deploy wac-validate-school` (idem pour `wac-manage-admins`, `wac-moderate-user`).
- Variables requises : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Actions operationnelles (chacune ecrit dans `admin_audit_logs`) :

- Demandes d'ecole : verifier, **valider** (Edge Function -> creation ECO-), rejeter.
- Signalements : prendre en charge, resoudre, rejeter, escalader.
- Paiements : confirmer un paiement scolaire numerique.
- Jeux educatifs : **creer** (brouillon), publier, archiver.
- Utilisateurs : **suspendre / reactiver** (Edge Function, bannissement Auth reel), archiver.
- Membres (Parametres, super_admin) : **ajouter**, changer de role, revoquer, reactiver (Edge Function).

Exports CSV (boutons « Exporter CSV ») : utilisateurs, paiements, signalements, audit logs, activations WalahaStore.

WalahaStore (onglet dedie) : bandeau revenus (modules actifs, revenu estime, demandes en attente), catalogue de modules (creer / desactiver / reactiver), file des demandes d'activation (approuver -> activer / refuser / suspendre) et file des demandes sur devis (etudier / devis / clore / rejeter). Chaque action tracee + export CSV. Cote PWE, l'ecole consulte le catalogue, demande l'activation et peut demander un module personnalise.

La vue Ecoles affiche desormais les demandes (`school_requests`) avec un vrai statut, donc le filtre par statut fonctionne. Les ecoles officielles validees restent comptees dans la metrique « Ecoles officielles » (`canonical_schools`).

Boutons d'en-tete encore non branches (optionnels) : « Exporter selon role », « Assigner un admin » (raccourci), « Creer ecole officielle » (passe par le workflow demandes).

Pour activer le premier acces admin :

1. appliquer la migration SQL dans Supabase ;
2. creer ou identifier un compte Supabase Auth ;
3. creer la ligne correspondante dans `public.users` si elle n'existe pas ;
4. ajouter ce compte dans `admin_members` avec le role `super_admin`.

Mot de passe oublie :

- le bouton de reset utilise `supabase.auth.resetPasswordForEmail` ;
- en production, ajouter l'URL du WAC dans Supabase Auth > URL Configuration > Redirect URLs ;
- en local ouvert avec `file://`, aucun `redirectTo` n'est envoye, Supabase utilise donc l'URL de redirection configuree dans le dashboard.

Principes a respecter :

- acces reserve aux membres declares dans `admin_members` ;
- roles internes et permissions obligatoires ;
- actions sensibles via serveur ou Edge Functions ;
- audit systematique dans `admin_audit_logs` ;
- protection stricte des donnees enfants, familles, ecoles et paiements ;
- creation officielle des ecoles uniquement par la Walaha Team.
