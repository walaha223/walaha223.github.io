# Admin_walaha.md

# Walaha Admin Center

## 1. Présentation générale

**Walaha Admin Center** est l’espace d’administration interne réservé exclusivement à la **Walaha Team**. Il permet de superviser, contrôler, sécuriser et modérer l’ensemble de la plateforme WalahaTracker.

Cet espace n’est pas destiné aux écoles, parents, élèves, enseignants ou répétiteurs. Il est uniquement utilisé par l’équipe interne de Walaha pour gérer la plateforme, valider les comptes, modérer les activités, traiter les signalements, contrôler les écoles, gérer les contenus éducatifs et surveiller les opérations sensibles.

Walaha Admin Center est connecté à la base de données Supabase de WalahaTracker. Il doit respecter une architecture sécurisée basée sur l’authentification, les rôles internes, les permissions, les règles RLS, les logs d’audit et les fonctions serveur pour les actions sensibles.

---

## 2. Objectif principal

L’objectif de Walaha Admin Center est de donner à l’équipe Walaha un centre de contrôle fiable pour administrer la plateforme sans compromettre la confidentialité des utilisateurs.

L’admin doit permettre de :

* gérer les comptes utilisateurs ;
* valider ou refuser les écoles ;
* modérer les répétiteurs ;
* gérer les signalements ;
* surveiller les activités sensibles ;
* gérer les jeux éducatifs ;
* gérer les contenus officiels ;
* contrôler les paiements et abonnements scolaires ;
* suivre les statistiques globales ;
* conserver l’historique des actions administratives ;
* protéger les données des enfants, des familles et des écoles.

---

## 3. Utilisateurs autorisés

L’accès à Walaha Admin Center est réservé aux membres internes de la Walaha Team.

Les rôles recommandés sont :

| Rôle               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `super_admin`      | Contrôle total de la plateforme                      |
| `walaha_admin`     | Gestion générale des opérations                      |
| `moderator`        | Modération des comptes, signalements et contenus     |
| `support`          | Assistance aux utilisateurs                          |
| `finance`          | Suivi des paiements, abonnements et frais numériques |
| `school_validator` | Validation et vérification des écoles                |
| `content_manager`  | Gestion des jeux éducatifs et contenus pédagogiques  |

Une école ne doit jamais avoir un rôle dans `admin_members`. Les écoles doivent utiliser un portail séparé : **Portail Web Écoles**.

---

## 4. Principe de séparation des accès

Walaha doit séparer clairement les pouvoirs :

| Espace              | Public concerné                           | Niveau d’accès                     |
| ------------------- | ----------------------------------------- | ---------------------------------- |
| Walaha Admin Center | Walaha Team                               | Accès global contrôlé              |
| Portail Web Écoles  | Écoles validées                           | Accès limité à leur propre école   |
| Application mobile  | Parents, élèves, enseignants, répétiteurs | Accès personnel ou familial limité |

Règle fondamentale :

```text
Admin Walaha = pouvoir global
École = pouvoir local
Parent = pouvoir familial
Enseignant = pouvoir pédagogique
Répétiteur = pouvoir d’accompagnement
Élève = accès personnel limité
```

---

## 5. Pages principales de l’Admin Walaha

### 5.1 Page de connexion admin

Route recommandée :

```text
/admin/login
```

Fonctions :

* connexion sécurisée avec Supabase Auth ;
* vérification que l’utilisateur existe dans `admin_members` ;
* refus automatique si l’utilisateur n’est pas membre de la Walaha Team ;
* redirection vers le dashboard après connexion ;
* déconnexion sécurisée.

Règle importante :

Un utilisateur connecté à WalahaTracker ne doit pas automatiquement avoir accès à l’admin. Il doit être explicitement déclaré dans `admin_members`.

---

### 5.2 Dashboard général

Route recommandée :

```text
/admin/dashboard
```

Le dashboard donne une vue globale de la plateforme.

Statistiques principales :

* nombre total d’écoles ;
* nombre total d’écoles validées ;
* nombre d’écoles en attente ;
* nombre total d’élèves ;
* nombre total de parents ;
* nombre total d’enseignants ;
* nombre total de répétiteurs ;
* nombre de comptes en attente ;
* nombre de signalements ouverts ;
* nombre d’offres répétiteurs en attente ;
* nombre de jeux éducatifs publiés ;
* revenus estimés par année scolaire ;
* activités récentes.

Exemples de cartes :

```text
Écoles actives : 42
Écoles en attente : 8
Élèves inscrits : 3 850
Parents liés : 2 100
Répétiteurs en attente : 18
Signalements ouverts : 7
Jeux éducatifs publiés : 35
```

---

### 5.3 Gestion des utilisateurs

Route recommandée :

```text
/admin/users
```

Cette page permet à la Walaha Team de consulter et modérer les comptes.

Types de comptes :

* parent ;
* élève ;
* enseignant ;
* répétiteur ;
* responsable école ;
* promoteur ;
* support ;
* admin interne.

Fonctions :

* rechercher un utilisateur ;
* filtrer par rôle ;
* filtrer par statut ;
* consulter le profil ;
* vérifier l’identité ;
* activer un compte ;
* suspendre un compte ;
* bloquer un compte ;
* archiver un compte ;
* consulter l’historique d’activité ;
* ajouter une note interne ;
* voir les relations de l’utilisateur avec une école, un enfant ou un répétiteur.

Statuts recommandés :

```text
pending
verified
active
suspended
blocked
archived
deleted
```

La suppression physique doit être évitée au début. Il faut préférer une suppression logique avec un statut `archived` ou `deleted`.

---

### 5.4 Gestion et validation des écoles

Route recommandée :

```text
/admin/schools
```

Cette page permet de gérer les écoles inscrites sur Walaha.

Fonctions :

* voir toutes les écoles ;
* voir les écoles en attente de validation ;
* vérifier les informations de l’école ;
* valider une école ;
* refuser une école ;
* suspendre une école ;
* consulter les responsables associés ;
* consulter le nombre de classes ;
* consulter le nombre d’élèves ;
* consulter l’état du paiement annuel ;
* attribuer ou confirmer un code école `ECO-` ;
* ajouter une note interne de vérification.

Informations visibles :

```text
Nom de l’école
Code ECO-
Pays
Ville
Commune
Adresse
Téléphone
Email
Nom du promoteur
Nom du directeur
Statut de validation
Nombre d’élèves
Nombre de classes
Date de création
Date de validation
Validé par
```

Statuts recommandés :

```text
pending_review
verified
active
rejected
suspended
archived
```

---

### 5.5 Gestion des répétiteurs

Route recommandée :

```text
/admin/tutors
```

Cette page permet de modérer les répétiteurs et leurs offres.

Fonctions :

* voir les répétiteurs inscrits ;
* voir les répétiteurs en attente ;
* valider ou refuser un profil répétiteur ;
* modérer les offres ;
* consulter les matières proposées ;
* consulter les zones d’intervention ;
* consulter les prix ;
* consulter les signalements ;
* suspendre un répétiteur ;
* ajouter une note interne ;
* voir les enfants/familles liés, uniquement si nécessaire.

Statuts des répétiteurs :

```text
pending
verified
active
suspended
blocked
```

Statuts des offres :

```text
draft
pending_review
approved
rejected
suspended
archived
```

---

### 5.6 Gestion des jeux éducatifs

Route recommandée :

```text
/admin/educational-games
```

Cette page permet à la Walaha Team d’ajouter et gérer les jeux éducatifs proposés aux familles, écoles, enseignants et répétiteurs.

Fonctions :

* créer un jeu éducatif ;
* modifier un jeu ;
* publier un jeu ;
* archiver un jeu ;
* désactiver un jeu ;
* catégoriser le jeu ;
* définir l’âge recommandé ;
* définir le lieu adapté ;
* définir le mode de jeu ;
* ajouter les objectifs pédagogiques ;
* ajouter les consignes ;
* ajouter les matériels nécessaires ;
* ajouter la durée ;
* ajouter le niveau de difficulté ;
* ajouter une image ou icône ;
* consulter les signalements liés à un jeu.

Catégories possibles :

```text
Mathématiques
Lecture
Dictée
Anglais
Mémoire
Logique
Créativité
Culture générale
Éducation civique
Sport éducatif
Jeux en famille
Jeux de classe
Jeux sans écran
```

Lieux adaptés :

```text
Maison
École
Parc
En ligne
Partout
```

Modes de jeu :

```text
Enfant seul
Parent + enfant
Enseignant + classe
Répétiteur + enfant
Groupe d’enfants
```

Statuts :

```text
draft
published
under_review
archived
reported
```

---

### 5.7 Gestion des signalements

Route recommandée :

```text
/admin/reports
```

Cette page centralise les signalements faits par les utilisateurs.

Types de signalements :

* profil suspect ;
* offre répétiteur problématique ;
* message inapproprié ;
* école suspecte ;
* contenu incorrect ;
* jeu éducatif problématique ;
* comportement abusif ;
* problème de paiement ;
* usurpation d’identité.

Fonctions :

* consulter les signalements ;
* filtrer par statut ;
* filtrer par priorité ;
* assigner un signalement à un admin ;
* lire la description ;
* consulter les preuves disponibles ;
* prendre une décision ;
* marquer comme résolu ;
* rejeter le signalement ;
* escalader le cas ;
* enregistrer la décision finale.

Statuts :

```text
open
in_review
resolved
rejected
escalated
```

Priorités :

```text
low
normal
high
critical
```

---

### 5.8 Gestion des paiements

Route recommandée :

```text
/admin/payments
```

Cette page permet de suivre les paiements liés aux écoles, élèves, répétiteurs ou services premium.

Pour WalahaTracker, le modèle validé est :

```text
5 000 FCFA par élève et par année scolaire
```

Ce paiement doit être présenté comme un frais numérique scolaire annuel.

Fonctions :

* voir les écoles payantes ;
* voir les écoles en retard ;
* voir le nombre d’élèves facturés ;
* confirmer un paiement ;
* ajouter une preuve de paiement ;
* voir l’historique des paiements ;
* exporter un rapport ;
* filtrer par année scolaire ;
* filtrer par école ;
* filtrer par statut.

Statuts recommandés :

```text
pending
paid
partial
overdue
cancelled
refunded
```

---

### 5.9 Journal d’audit

Route recommandée :

```text
/admin/logs
```

Le journal d’audit est obligatoire. Toutes les actions sensibles doivent être enregistrées.

Actions à enregistrer :

```text
USER_APPROVED
USER_SUSPENDED
USER_BLOCKED
SCHOOL_VALIDATED
SCHOOL_REJECTED
SCHOOL_SUSPENDED
TUTOR_APPROVED
TUTOR_REJECTED
GAME_CREATED
GAME_PUBLISHED
GAME_ARCHIVED
REPORT_RESOLVED
PAYMENT_CONFIRMED
ROLE_CHANGED
ADMIN_CREATED
ADMIN_REVOKED
```

Informations à conserver :

```text
admin_id
action_type
target_type
target_id
old_data
new_data
reason
ip_address
user_agent
created_at
```

Même le super admin doit être tracé.

---

### 5.10 Paramètres admin

Route recommandée :

```text
/admin/settings
```

Fonctions :

* gérer les membres internes de la Walaha Team ;
* attribuer des rôles ;
* retirer un rôle ;
* activer ou suspendre un admin ;
* configurer les catégories de jeux ;
* configurer les motifs de signalement ;
* configurer les paramètres de validation école ;
* configurer les notifications internes ;
* consulter les paramètres de sécurité.

---

## 6. Tables Supabase recommandées

### 6.1 `admin_members`

Table réservée uniquement aux membres de la Walaha Team.

```sql
create table admin_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (
    role in (
      'super_admin',
      'walaha_admin',
      'moderator',
      'support',
      'finance',
      'school_validator',
      'content_manager'
    )
  ),
  status text default 'active' check (
    status in ('active', 'suspended', 'revoked')
  ),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
```

---

### 6.2 `admin_audit_logs`

```sql
create table admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id),
  action_type text not null,
  target_type text not null,
  target_id uuid,
  old_data jsonb,
  new_data jsonb,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);
```

---

### 6.3 `moderation_reports`

```sql
create table moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id),
  target_type text not null,
  target_id uuid,
  reason text not null,
  description text,
  status text default 'open' check (
    status in ('open', 'in_review', 'resolved', 'rejected', 'escalated')
  ),
  priority text default 'normal' check (
    priority in ('low', 'normal', 'high', 'critical')
  ),
  assigned_admin_id uuid references profiles(id),
  decision_note text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);
```

---

### 6.4 `educational_games`

```sql
create table educational_games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  age_min int,
  age_max int,
  location_type text[] default '{}',
  play_mode text[] default '{}',
  learning_objectives text[] default '{}',
  required_materials text[] default '{}',
  instructions text,
  duration_minutes int,
  difficulty text check (
    difficulty in ('easy', 'medium', 'hard')
  ),
  status text default 'draft' check (
    status in ('draft', 'published', 'archived', 'under_review')
  ),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 7. Sécurité et permissions

Walaha Admin Center doit respecter les règles suivantes :

1. L’accès est réservé aux utilisateurs présents dans `admin_members`.
2. Les rôles doivent limiter les actions possibles.
3. Les clés sensibles Supabase ne doivent jamais être exposées côté frontend.
4. Les actions critiques doivent passer par une Edge Function ou un backend sécurisé.
5. Toutes les actions sensibles doivent être enregistrées dans `admin_audit_logs`.
6. Un admin ne doit pas pouvoir supprimer définitivement des données sensibles sans procédure contrôlée.
7. Les messages privés ne doivent pas être consultés librement par l’admin, sauf cas de signalement ou support justifié.
8. Les données des enfants doivent être protégées avec un niveau de priorité élevé.
9. Les exports doivent être limités aux rôles autorisés.
10. Les accès doivent être révoqués immédiatement lorsqu’un membre quitte la Walaha Team.

---

## 8. Règles RLS recommandées

Fonction de vérification admin :

```sql
create or replace function is_walaha_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from admin_members
    where user_id = auth.uid()
    and status = 'active'
  );
$$;
```

Exemple de policy :

```sql
create policy "Walaha admins can read profiles"
on profiles
for select
to authenticated
using (is_walaha_admin());
```

Exemple pour les jeux éducatifs :

```sql
create policy "Walaha admins can manage educational games"
on educational_games
for all
to authenticated
using (is_walaha_admin())
with check (is_walaha_admin());
```

---

## 9. Actions sensibles à passer par Edge Function

Les actions suivantes doivent passer par une fonction serveur :

* créer un admin ;
* changer le rôle d’un admin ;
* révoquer un admin ;
* suspendre un compte ;
* bloquer un compte ;
* valider une école ;
* refuser une école ;
* confirmer un paiement ;
* exporter des données ;
* supprimer ou archiver des données sensibles ;
* traiter un signalement critique.

---

## 10. MVP recommandé

Pour la première version, créer seulement :

```text
/admin/login
/admin/dashboard
/admin/users
/admin/schools
/admin/tutors
/admin/educational-games
/admin/reports
/admin/payments
/admin/logs
```

Le MVP doit surtout permettre à la Walaha Team de :

* valider les écoles ;
* modérer les comptes ;
* modérer les répétiteurs ;
* gérer les jeux éducatifs ;
* traiter les signalements ;
* suivre les paiements ;
* tracer les actions sensibles.

---

## 11. Résumé

Walaha Admin Center est le centre de contrôle interne de WalahaTracker. Il est réservé uniquement à la Walaha Team et permet de gérer la plateforme de manière globale, sécurisée et traçable.

Il ne doit jamais être utilisé par les écoles, parents, élèves ou répétiteurs. Ces utilisateurs doivent avoir leurs propres espaces limités.

La priorité absolue de cet admin est la sécurité, car Walaha manipule des données sensibles liées aux enfants, aux familles, aux écoles, aux paiements et aux échanges scolaires.


Workflow WAC recommandé

Dans Admin_walaha.md, ajoute cette section :

Gestion des demandes d’écoles

Fonctions WAC :

- Voir les demandes d’écoles
- Filtrer par statut
- Ouvrir une demande
- Vérifier les informations
- Ajouter une note interne
- Demander plus d’informations
- Refuser la demande
- Valider la demande
- Créer l’école officielle
- Générer le code ECO-
- Désigner 1 ou 2 administrateurs école
- Envoyer l’invitation au PWE
- Enregistrer l’action dans admin_audit_logs


Ma recommandation finale

Pour Walaha, surtout au Mali au début, je recommande fortement :

1. Toute personne peut soumettre une demande d’école.
2. Seule la Walaha Team peut créer/valider une école officielle.
3. Seule la Walaha Team peut activer l’accès au Portail Web Écoles.
4. La Walaha Team désigne 1 ou 2 administrateurs école.
5. Les administrateurs école peuvent ensuite inviter d’autres membres selon leur rôle.
6. Toutes les actions importantes sont enregistrées dans les logs.

Donc la réponse directe est :

Oui, la création officielle de l’école doit revenir aux Admins Walaha dans WAC.
Non, toute personne ne doit pas pouvoir créer une école active et accéder directement au PWE.
Oui, toute personne peut soumettre une demande.
Oui, l’admin Walaha peut créer l’école et désigner 1 ou 2 administrateurs pour cette école.


Ma recommandation finale
Projet	Framework recommandé	Pourquoi
WAC — Walaha Admin Center	Next.js	Sécurité, routes protégées, actions serveur, dashboard admin
PWE — Portail Web Écoles	Next.js	Portail web professionnel, accès école limité, formulaires, tableaux


Stack recommandée
1. Framework principal
Next.js
2. Langage
TypeScript

TypeScript est important pour éviter les erreurs dans les rôles, les permissions, les statuts et les données scolaires.

3. Backend / Base de données
Supabase

Utilisation :

Supabase Auth
Supabase Database
Supabase Storage
Supabase Edge Functions
Supabase RLS

Supabase propose une intégration officielle avec Next.js et un guide pour créer une application Next.js connectée à Supabase.

4. UI / Design
Tailwind CSS + shadcn/ui

Pour créer rapidement :

dashboards
tableaux
formulaires
modals
menus
cartes statistiques
filtres
badges de statut
5. Tableaux admin

Pour les grandes tables :

TanStack Table

Utile pour :

liste des écoles
liste des élèves
liste des paiements
liste des signalements
liste des utilisateurs