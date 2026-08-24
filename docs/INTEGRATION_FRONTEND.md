# Guide d’intégration frontend — Gestion des stagiaires

> Version vérifiée le 24 août 2026 à partir du backend NestJS du projet d’entreprise.

Ce document est le contrat pratique entre le frontend et le backend. Il explique les domaines métier, les données à envoyer, les réponses reçues, les permissions nécessaires et les erreurs à traiter. Le contrat OpenAPI généré par le backend reste la référence exécutable.

## 1. Démarrage rapide

### Adresses du backend

```text
API                   http://IP_DU_BACKEND:3000
Swagger               http://IP_DU_BACKEND:3000/api/docs
OpenAPI JSON          http://IP_DU_BACKEND:3000/api/docs-json
Test de l’application http://IP_DU_BACKEND:3000/
Test MySQL            http://IP_DU_BACKEND:3000/health/database
```

Il n’existe pas de préfixe global `/api` pour les routes métier. Par exemple, la liste des départements est bien `GET /departments`, et non `GET /api/departments`.

### Configuration Axios recommandée

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

`withCredentials: true` est indispensable : le refresh token est normalement placé dans un cookie `HttpOnly`. Le JWT d’accès est envoyé dans l’en-tête :

```text
Authorization: Bearer ACCESS_TOKEN
```

### Conventions communes

- Les identifiants sont des UUID version 4.
- Les dates sont envoyées en ISO 8601, par exemple `2026-08-24` ou `2026-08-24T10:30:00.000Z` selon le champ.
- Le backend renvoie directement l’objet, le tableau ou l’objet paginé : il n’ajoute pas d’enveloppe `data`. Avec Axios, la donnée métier reste dans `response.data`.
- Les champs inconnus sont refusés avec le statut `400`.
- Les listes CRUD classiques ne renvoient que les ressources actives, sauf indication contraire.
- Les opérations `DELETE` sont généralement des désactivations logiques.
- Un JWT valide ne remplace jamais une permission : le backend vérifie la session, le compte et la permission à chaque requête.

### Forme générale des erreurs

```json
{
  "statusCode": 400,
  "message": "Description de l’erreur",
  "error": "Bad Request"
}
```

Une erreur de validation peut renvoyer `message` sous forme de tableau.

| Statut | Signification frontend |
|---|---|
| `400` | Données ou UUID invalides |
| `401` | Session absente, expirée, révoquée ou compte indisponible |
| `403` | Permission insuffisante ou changement de mot de passe obligatoire |
| `404` | Ressource inexistante ou relation inactive |
| `409` | Doublon ou règle métier empêchant l’opération |

## 2. Catalogue complet des API

`Public` signifie qu’aucun JWT n’est requis. `Session` signifie qu’une session valide suffit. Toutes les autres lignes indiquent la permission métier exacte.

| Domaine | Méthode | Endpoint | Protection |
|---|---|---|---|
| Application | `GET` | `/` | Public |
| Santé MySQL | `GET` | `/health/database` | Public |
| Authentification | `POST` | `/auth/login` | Public |
| Authentification | `POST` | `/auth/refresh` | Refresh token/cookie |
| Authentification | `POST` | `/auth/logout` | Refresh token/cookie |
| Profil | `GET` | `/auth/me` | Session |
| Mot de passe | `PATCH` | `/auth/change-password` | Session |
| Tableau de bord | `GET` | `/dashboard` | `dashboard.read` |
| Départements | `GET` | `/departments`, `/departments/:id` | `departments.read` |
| Départements | `POST` | `/departments` | `departments.create` |
| Départements | `PATCH` | `/departments/:id` | `departments.update` |
| Départements | `DELETE` | `/departments/:id` | `departments.deactivate` |
| Postes | `GET` | `/positions`, `/positions/:id` | `positions.read` |
| Postes | `POST` | `/positions` | `positions.create` |
| Postes | `PATCH` | `/positions/:id` | `positions.update` |
| Postes | `DELETE` | `/positions/:id` | `positions.deactivate` |
| Employés | `GET` | `/employees`, `/employees/:id` | `employees.read` |
| Employés | `POST` | `/employees` | `employees.create` |
| Employés | `PATCH` | `/employees/:id` | `employees.update` |
| Employés | `DELETE` | `/employees/:id` | `employees.deactivate` |
| Utilisateurs | `GET` | `/users`, `/users/:id` | `users.read` |
| Utilisateurs | `POST` | `/users` | `users.create` |
| Utilisateurs | `PATCH` | `/users/:id` | `users.update` |
| Utilisateurs | `PATCH` | `/users/:id/reset-password` | `users.reset-password` |
| Utilisateurs | `DELETE` | `/users/:id` | `users.deactivate` |
| Rôles | `GET` | `/roles`, `/roles/:id` | `roles.read` |
| Rôles | `POST` | `/roles` | `roles.create` |
| Rôles | `PATCH` | `/roles/:id` | `roles.update` |
| Rôles | `PUT` | `/roles/:id/permissions` | `roles.permissions.manage` |
| Rôles | `DELETE` | `/roles/:id` | `roles.deactivate` |
| Permissions | `GET` | `/permissions`, `/permissions/:id` | `permissions.read` |
| Stagiaires | `GET` | `/interns`, `/interns/:id` | `interns.read` |
| Stagiaires | `POST` | `/interns` | `interns.create` |
| Stagiaires | `PATCH` | `/interns/:id` | `interns.update` |
| Stagiaires | `DELETE` | `/interns/:id` | `interns.deactivate` |
| Encadreurs | `GET` | `/supervisors`, `/supervisors/:id` | `supervisors.read` |
| Encadreurs | `POST` | `/supervisors` | `supervisors.create` |
| Encadreurs | `PATCH` | `/supervisors/:id` | `supervisors.update` |
| Encadreurs | `DELETE` | `/supervisors/:id` | `supervisors.deactivate` |
| Autorités | `GET` | `/authorities`, `/authorities/:id` | `authorities.read` |
| Autorités | `POST` | `/authorities` | `authorities.create` |
| Autorités | `PATCH` | `/authorities/:id` | `authorities.update` |
| Autorités | `DELETE` | `/authorities/:id` | `authorities.deactivate` |
| Stages | `GET` | `/internships`, `/internships/:id` | `internships.read` |
| Suivi des stages | `GET` | `/internships/tracking` | `internships.read` |
| Stages | `POST` | `/internships` | `internships.create` |
| Stages | `PATCH` | `/internships/:id` | `internships.update` |
| Stages | `DELETE` | `/internships/:id` | `internships.deactivate` |
| Projets | `GET` | `/projects`, `/projects/:id` | `projects.read` |
| Projets | `POST` | `/projects` | `projects.create` |
| Projets | `PATCH` | `/projects/:id` | `projects.update` |
| Projets | `DELETE` | `/projects/:id` | `projects.deactivate` |
| Affectations | `GET` | `/project-assignments`, `/project-assignments/:id` | `project-assignments.read` |
| Affectations | `POST` | `/project-assignments` | `project-assignments.create` |
| Affectations | `PATCH` | `/project-assignments/:id` | `project-assignments.update` |
| Affectations | `DELETE` | `/project-assignments/:id` | `project-assignments.deactivate` |
| Journal d’audit | `GET` | `/audit-logs`, `/audit-logs/:id` | `audit-logs.read` |

## 3. Ordre métier conseillé au frontend

```text
Département + Poste
        ↓
      Employé
        ↓
Compte utilisateur / Encadreur / Autorité
        ↓
     Stagiaire
        ↓
       Stage
        ↓
Projet + Affectation du stage au projet
```

Cette distinction évite les confusions :

- un **employé** est une personne de l’entreprise ;
- un **poste** est la fonction professionnelle attribuée à l’employé ;
- un **utilisateur** est le compte qui permet à un employé de se connecter ;
- un **encadreur** est un profil supplémentaire porté par un employé ;
- une **autorité** est un profil de signature porté par un employé ;
- un **stagiaire** est la personne accueillie ;
- un **stage** est la période d’accueil et relie le stagiaire aux structures internes ;
- un **projet** est un travail de l’entreprise ;
- une **affectation** relie un stage à un projet pour une période et un rôle donnés.


## Departement
Pour réaliser correctement la page « Départements », transmettez à la personne du frontend ce contrat complet.
1. Adresse et authentification
Base URL : http://IP_DU_BACKEND:3000
Swagger  : http://IP_DU_BACKEND:3000/api/docs
Toutes les requêtes des départements nécessitent :
Authorization: Bearer ACCESS_TOKEN
Avec Axios :
const api = axios.create({
  baseURL: 'http://IP_DU_BACKEND:3000',
  withCredentials: true,
});

api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
2. Structure d’un département
Le frontend peut créer cette interface TypeScript :
export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
}
Les dates arrivent au format ISO :
2026-08-22T10:30:00.000Z
3. Afficher la liste
Requête
GET /departments
Réponse
[
  {
    "id": "5f5cb995-d8aa-4575-b873-135b898c5356",
    "name": "DSI Plateau Aile Gauche",
    "code": "DSI-PAG",
    "description": "Département informatique",
    "isActive": true,
    "createdAt": "2026-08-22T10:30:00.000Z",
    "updatedAt": "2026-08-22T10:30:00.000Z",
    "createdById": null,
    "updatedById": null
  }
]
Utilisation :
const response = await api.get<Department[]>('/departments');
const departments = response.data;
Informations importantes :
- seuls les départements actifs sont renvoyés ;
- ils sont classés par nom ;
- il n’y a pas encore de pagination ni de recherche côté backend ;
- la recherche devra donc temporairement être faite dans le frontend.
4. Créer un département
Requête
POST /departments
{
  "code": "DSI-PAG",
  "name": "DSI Plateau Aile Gauche",
  "description": "Département informatique"
}
isActive est facultatif et vaut true par défaut.
Réponse
Le backend renvoie directement le département créé :
{
  "id": "5f5cb995-d8aa-4575-b873-135b898c5356",
  "name": "DSI Plateau Aile Gauche",
  "code": "DSI-PAG",
  "description": "Département informatique",
  "isActive": true,
  "createdAt": "2026-08-22T10:30:00.000Z",
  "updatedAt": "2026-08-22T10:30:00.000Z",
  "createdById": null,
  "updatedById": null
}
Après réussite, le frontend peut :
1. afficher un message de succès ;
2. fermer le formulaire ;
3. ajouter le résultat dans la liste ou relancer GET /departments.
5. Modifier un département
PATCH /departments/:id
Seuls les champs à modifier sont envoyés :
{
  "name": "Nouveau nom",
  "description": "Nouvelle description"
}
Tous les champs sont facultatifs pendant la modification.
await api.patch(`/departments/${departmentId}`, {
  name: 'Nouveau nom',
});
Le backend renvoie le département entièrement modifié.
6. Désactiver un département
DELETE /departments/:id
Ce n’est pas une suppression physique : le département passe à :
{
  "isActive": false
}
Le frontend doit afficher une confirmation avant l’appel :
Voulez-vous vraiment désactiver ce département ?
Après réussite, il faut retirer le département de la liste, car GET /departments ne retourne que les actifs.
7. Consulter un département
GET /departments/:id
Exemple :
const response = await api.get<Department>(
  `/departments/${departmentId}`,
);

const department = response.data;
8. Validation des champs
Champ	Obligatoire	Validation
name	Oui à la création	Texte, maximum 150 caractères
code	Oui à la création	Texte, maximum 20 caractères
description	Non	Texte
isActive	Non	Booléen


Le backend :
- retire les espaces au début et à la fin ;
- transforme automatiquement le code en majuscules ;
- refuse un nom déjà utilisé ;
- refuse un code déjà utilisé ;
- refuse les champs inconnus.
9. Gestion des erreurs
Nom ou code déjà utilisé
Statut 409 :
{
  "statusCode": 409,
  "message": "Un département avec le même nom ou le même code existe déjà.",
  "error": "Conflict"
}
Département inexistant
Statut 404 :
{
  "statusCode": 404,
  "message": "Département introuvable.",
  "error": "Not Found"
}
Identifiant incorrect
Statut 400 si id n’est pas un UUID valide.
JWT expiré
{
  "statusCode": 401,
  "code": "ACCESS_TOKEN_EXPIRED",
  "message": "Le jeton d’accès a expiré."
}
Le frontend appelle alors /auth/refresh, récupère un nouveau JWT et rejoue la requête.
10. Permissions de l’utilisateur
Le frontend reçoit les permissions pendant la connexion. Il doit adapter les boutons :
Permission	Élément visible
departments.read	Page et liste des départements
departments.create	Bouton « Ajouter »
departments.update	Bouton « Modifier »
departments.deactivate	Bouton « Désactiver »


Exemple :
const canCreate = user.permissions.includes('departments.create');
const canUpdate = user.permissions.includes('departments.update');
const canDeactivate = user.permissions.includes(
  'departments.deactivate',
);
Les permissions servent à adapter l’interface, mais le backend les contrôle également.
11. Composition recommandée de la page
La page devrait contenir :
- le titre « Départements » ;
- un bouton « Ajouter un département » ;
- une zone de recherche ;
- un tableau avec Code, Nom, Description et Actions ;
- un bouton de modification ;
- un bouton de désactivation ;
- un formulaire de création/modification ;
- une confirmation de désactivation ;
- les états « chargement », « liste vide » et « erreur ».
C’est cet ensemble que vous pouvez transmettre tel quel au développeur frontend.

## Postes

La page « Postes » gère le catalogue des fonctions professionnelles de l’entreprise. Un poste n’est ni un rôle de sécurité ni un compte utilisateur :

- le **poste** décrit le métier de l’employé, par exemple « Développeur backend » ;
- le **rôle** détermine les permissions de son compte, par exemple RH ou ADMINISTRATEUR.

### Postes créés par défaut

La migration et le seed préparent les postes suivants :

| Code | Nom |
|---|---|
| DEV_BACKEND | Développeur backend |
| DEV_FRONTEND | Développeur frontend |
| ADMIN_SYSTEME | Administrateur système |
| RESPONSABLE_RH | Responsable RH |
| CHEF_PROJET | Chef de projet |
| RESPONSABLE_RESEAU | Responsable réseau |
| ASSISTANT_ADMINISTRATIF | Assistant administratif |

L’administrateur peut ensuite ajouter, modifier ou désactiver d’autres postes.

### Interface TypeScript

~~~ts
export interface Position {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    employees: number;
  };
}
~~~

**_count.employees** représente le nombre d’employés actifs utilisant le poste.

### Lister et consulter

~~~http
GET /positions
GET /positions/:id
Authorization: Bearer ACCESS_TOKEN
~~~

Exemple de réponse de GET /positions :

~~~json
[
  {
    "id": "11111111-1111-4111-8111-111111111111",
    "code": "DEV_BACKEND",
    "name": "Développeur backend",
    "description": "Développement des services backend et des API.",
    "isActive": true,
    "createdAt": "2026-08-24T10:00:00.000Z",
    "updatedAt": "2026-08-24T10:00:00.000Z",
    "_count": {
      "employees": 3
    }
  }
]
~~~

La liste ne contient que les postes actifs et elle est triée par nom.

### Créer

~~~http
POST /positions
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
~~~

~~~json
{
  "code": "DATA_ANALYST",
  "name": "Data analyst",
  "description": "Analyse et valorisation des données"
}
~~~

**code** est obligatoire, limité à 30 caractères et automatiquement transformé en majuscules. **name** est obligatoire et limité à 150 caractères. **description** et **isActive** sont facultatifs.

### Modifier et désactiver

~~~http
PATCH /positions/:id
DELETE /positions/:id
~~~

Exemple de modification partielle :

~~~json
{
  "name": "Analyste de données",
  "description": "Analyse des données métier"
}
~~~

Le backend refuse les doublons de code ou de nom. Il refuse aussi de désactiver un poste encore attribué à au moins un employé actif :

~~~json
{
  "statusCode": 409,
  "message": "Ce poste est encore attribué à un ou plusieurs employés actifs.",
  "error": "Conflict"
}
~~~

Il faut d’abord changer le poste de ces employés ou les désactiver.

### Permissions et page frontend

| Permission | Action |
|---|---|
| positions.read | Afficher la liste et alimenter le sélecteur des employés |
| positions.create | Ajouter un poste |
| positions.update | Modifier un poste |
| positions.deactivate | Désactiver un poste |

La page devrait afficher le code, le nom, la description, le nombre d’employés actifs et les actions autorisées. Elle doit demander une confirmation avant la désactivation.

## Employes

### Rôle du domaine

Un employé représente une personne travaillant dans l’entreprise. Les domaines associés restent distincts :

- Employee : identité et informations professionnelles ;
- Position : fonction professionnelle choisie dans le catalogue ;
- User : compte de connexion, rôle et mot de passe ;
- Supervisor : qualité d’encadreur ajoutée à un employé ;
- Authority : qualité d’autorité signataire ajoutée à un employé.

Créer un employé ne crée pas automatiquement son compte utilisateur.

### Interfaces TypeScript

~~~ts
export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
}

export interface PositionSummary {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  positionId: string;
  departmentId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department: DepartmentSummary;
  position: PositionSummary;
}
~~~

Le champ libre **jobTitle** n’est plus accepté par les API employés. Le frontend doit envoyer l’UUID **positionId**. Le nom lisible du poste arrive dans **employee.position.name**.

### Liste et détail

~~~http
GET /employees
GET /employees/:id
Authorization: Bearer ACCESS_TOKEN
~~~

~~~json
[
  {
    "id": "22222222-2222-4222-8222-222222222222",
    "employeeNumber": "EMP-001",
    "firstName": "Moussa",
    "lastName": "Traoré",
    "email": "moussa.traore@entreprise.ml",
    "phone": "+22370000000",
    "positionId": "11111111-1111-4111-8111-111111111111",
    "departmentId": "33333333-3333-4333-8333-333333333333",
    "isActive": true,
    "createdAt": "2026-08-24T10:00:00.000Z",
    "updatedAt": "2026-08-24T10:00:00.000Z",
    "position": {
      "id": "11111111-1111-4111-8111-111111111111",
      "code": "DEV_BACKEND",
      "name": "Développeur backend"
    },
    "department": {
      "id": "33333333-3333-4333-8333-333333333333",
      "code": "DSI",
      "name": "Direction des systèmes d’information"
    }
  }
]
~~~

La liste contient uniquement les employés actifs, triés par nom puis par prénom, avec leur département et leur poste.

### Préparer le formulaire

Le frontend doit charger les deux catalogues :

~~~ts
const [departmentsResponse, positionsResponse] = await Promise.all([
  api.get<DepartmentSummary[]>('/departments'),
  api.get<Position[]>('/positions'),
]);
~~~

Le formulaire affiche les noms mais envoie les identifiants :

~~~json
{
  "employeeNumber": "EMP-001",
  "firstName": "Moussa",
  "lastName": "Traoré",
  "email": "moussa.traore@entreprise.ml",
  "phone": "+22370000000",
  "positionId": "11111111-1111-4111-8111-111111111111",
  "departmentId": "33333333-3333-4333-8333-333333333333"
}
~~~

### Créer, modifier et désactiver

~~~http
POST /employees
PATCH /employees/:id
DELETE /employees/:id
~~~

Une modification envoie seulement les champs concernés :

~~~json
{
  "positionId": "44444444-4444-4444-8444-444444444444",
  "departmentId": "55555555-5555-4555-8555-555555555555",
  "phone": "+22371000000"
}
~~~

La désactivation est logique. Elle révoque aussi les sessions actives du compte utilisateur lié à l’employé.

### Validation

| Champ | Création | Validation |
|---|---|---|
| employeeNumber | Obligatoire | Texte, maximum 50 caractères, normalisé en majuscules |
| firstName | Obligatoire | Texte, maximum 100 caractères |
| lastName | Obligatoire | Texte, maximum 100 caractères |
| email | Obligatoire | Email valide, maximum 255 caractères, normalisé en minuscules |
| phone | Facultatif | Texte, maximum 30 caractères ; vide devient null |
| positionId | Obligatoire | UUID d’un poste actif |
| departmentId | Obligatoire | UUID d’un département actif |
| isActive | Facultatif | Booléen, true par défaut |

Les principales erreurs sont le doublon de matricule ou d’email (409), le poste inactif (404), le département inactif (404) et l’employé introuvable (404).

### Permissions et composition de la page

| Permission | Action |
|---|---|
| employees.read | Afficher la liste et le détail |
| employees.create | Créer un employé |
| employees.update | Modifier un employé |
| employees.deactivate | Désactiver un employé |
| departments.read | Alimenter le sélecteur de départements |
| positions.read | Alimenter le sélecteur de postes |

La page devrait proposer une recherche locale, des filtres par département et poste, les colonnes Matricule, Nom, Email, Téléphone, Poste, Département et Actions, ainsi que les états chargement, vide et erreur.


##  Encadreurs
La page suivante est « Encadreurs ». Dans le backend, le terme technique utilisé est Supervisor et certains messages parlent de « maître de stage » : ils désignent la même chose.
1. Rôle de la page
Un encadreur est obligatoirement un employé existant de l’entreprise.
Le processus est donc :
Créer l’employé
      ↓
Sélectionner cet employé
      ↓
Créer son profil d’encadreur
Un employé ne peut posséder qu’un seul profil d’encadreur.
2. Interfaces TypeScript
export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  positionId: string;
  position: {
    id: string;
    code: string;
    name: string;
  };
  departmentId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department: Department;
}

export interface Supervisor {
  id: string;
  employeeId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: Employee;
}
3. Afficher les encadreurs
GET /supervisors
Authorization: Bearer JWT
Réponse :
[
  {
    "id": "3a5833ab-7130-4d66-ab25-bd96612d3f28",
    "employeeId": "35ea0722-57ef-44bc-ae99-bbed5762a307",
    "isActive": true,
    "createdAt": "2026-08-22T10:00:00.000Z",
    "updatedAt": "2026-08-22T10:00:00.000Z",
    "employee": {
      "id": "35ea0722-57ef-44bc-ae99-bbed5762a307",
      "employeeNumber": "EMP-001",
      "firstName": "Moussa",
      "lastName": "Traoré",
      "email": "moussa.traore@entreprise.ml",
      "phone": "+22370000000",
      "positionId": "uuid-poste",
      "position": {
        "id": "uuid-poste",
        "code": "CHEF_PROJET",
        "name": "Chef de projet"
      },

      "departmentId": "5f5cb995-d8aa-4575-b873-135b898c5356",
      "isActive": true,
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-20T10:00:00.000Z",
      "department": {
        "id": "5f5cb995-d8aa-4575-b873-135b898c5356",
        "name": "DSI Plateau Aile Gauche",
        "code": "DSI-PAG",
        "description": "Département informatique",
        "isActive": true,
        "createdAt": "2026-08-19T10:00:00.000Z",
        "updatedAt": "2026-08-19T10:00:00.000Z"
      }
    }
  }
]
La liste contient uniquement les encadreurs actifs, triés par nom de famille de l’employé.
4. Charger les employés sélectionnables
Le formulaire doit charger les employés :
GET /employees
Il est préférable de charger également les encadreurs existants afin d’éviter de proposer deux fois le même employé :
const [employeesResponse, supervisorsResponse] = await Promise.all([
  api.get<Employee[]>('/employees'),
  api.get<Supervisor[]>('/supervisors'),
]);

const usedEmployeeIds = new Set(
  supervisorsResponse.data.map((supervisor) => supervisor.employeeId),
);

const availableEmployees = employeesResponse.data.filter(
  (employee) => !usedEmployeeIds.has(employee.id),
);
Dans le sélecteur, afficher par exemple :
EMP-001 — Moussa Traoré — Chef de projet — DSI-PAG
Mais envoyer uniquement l’identifiant :
{
  "employeeId": "35ea0722-57ef-44bc-ae99-bbed5762a307"
}
5. Créer un encadreur
POST /supervisors
Authorization: Bearer JWT
Content-Type: application/json
Corps :
{
  "employeeId": "35ea0722-57ef-44bc-ae99-bbed5762a307"
}
isActive est facultatif et vaut true par défaut.
Le backend renvoie le profil créé avec les informations de l’employé et de son département.
6. Consulter un encadreur
GET /supervisors/:id
Attention : :id correspond à l’identifiant du profil Supervisor, pas à l’identifiant de l’employé.
const response = await api.get<Supervisor>(
  `/supervisors/${supervisorId}`,
);
7. Modifier un encadreur
PATCH /supervisors/:id
Exemple :
{
  "employeeId": "nouvel-uuid-employe"
}
Le backend permet également :
{
  "isActive": true
}
Tous les champs sont facultatifs pendant la modification.
Dans l’interface, il est préférable de ne changer l’employé associé que pour corriger une erreur. Normalement, l’identité d’un profil d’encadreur ne devrait pas changer.
8. Désactiver un encadreur
DELETE /supervisors/:id
Le backend refuse la désactivation si l’encadreur possède encore un stage :
- PLANNED ;
- ou ONGOING.
Réponse en cas de réussite :
{
  "id": "3a5833ab-7130-4d66-ab25-bd96612d3f28",
  "employeeId": "35ea0722-57ef-44bc-ae99-bbed5762a307",
  "isActive": false,
  "employee": {
    "firstName": "Moussa",
    "lastName": "Traoré"
  }
}
9. Erreurs possibles
Employé inexistant ou désactivé
{
  "statusCode": 404,
  "message": "L’employé indiqué est introuvable ou inactif.",
  "error": "Not Found"
}
Employé déjà encadreur
{
  "statusCode": 409,
  "message": "Cet employé possède déjà un profil de maître de stage.",
  "error": "Conflict"
}
Encadreur introuvable
{
  "statusCode": 404,
  "message": "Maître de stage introuvable.",
  "error": "Not Found"
}
Encadreur encore associé à un stage actif
{
  "statusCode": 409,
  "message": "Ce maître de stage possède encore un stage planifié ou en cours.",
  "error": "Conflict"
}
10. Permissions
Permission	Action
supervisors.read	Afficher les encadreurs
supervisors.create	Ajouter un encadreur
supervisors.update	Modifier un encadreur
supervisors.deactivate	Désactiver un encadreur
employees.read	Charger les employés dans le sélecteur


11. Composition recommandée
La page devrait contenir :
- une recherche par nom, matricule ou département ;
- un bouton « Ajouter un encadreur » ;
- les colonnes Matricule, Nom complet, Email, Poste, Département et Actions ;
- un sélecteur d’employé dans le formulaire ;
- une confirmation avant désactivation ;
- un message spécial si des stages empêchent la désactivation ;
- les états chargement, erreur et liste vide.
Limitation actuelle : les encadreurs désactivés ne sont pas retournés par GET /supervisors. La réactivation d’un ancien profil ne peut donc pas encore être facilement proposée par le frontend.

## Autorite de tutelle
La page suivante est « Autorités de tutelle ». Dans le backend, le domaine est appelé Authority.
1. Point métier important
Actuellement, une autorité doit obligatoirement correspondre à un employé actif de l’entreprise.
Une autorité contient ensuite :
- l’employé correspondant ;
- un nom d’affichage ou de signature ;
- un email ;
- un titre de signature ;
- éventuellement un département.
Si les autorités peuvent être des personnes externes à l’entreprise, il faudra modifier le backend, car employeeId est actuellement obligatoire.
2. Interfaces TypeScript
export interface AuthorityEmployee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  positionId: string;
  position: {
    id: string;
    code: string;
    name: string;
  };
  departmentId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorityDepartment {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Authority {
  id: string;
  employeeId: string;
  departmentId: string | null;
  name: string;
  email: string;
  signingTitle: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: AuthorityEmployee;
  department: AuthorityDepartment | null;
}
3. Liste des autorités
GET /authorities
Authorization: Bearer JWT
Réponse :
[
  {
    "id": "7a76a0b6-4944-41ea-b6f5-00a00cc7af45",
    "employeeId": "35ea0722-57ef-44bc-ae99-bbed5762a307",
    "departmentId": "5f5cb995-d8aa-4575-b873-135b898c5356",
    "name": "Moussa Traoré",
    "email": "moussa.traore@entreprise.ml",
    "signingTitle": "Directeur des Systèmes d’Information",
    "isActive": true,
    "createdAt": "2026-08-22T10:00:00.000Z",
    "updatedAt": "2026-08-22T10:00:00.000Z",
    "employee": {
      "id": "35ea0722-57ef-44bc-ae99-bbed5762a307",
      "employeeNumber": "EMP-001",
      "firstName": "Moussa",
      "lastName": "Traoré",
      "email": "moussa.traore@entreprise.ml",
      "phone": "+22370000000",
      "positionId": "uuid-poste",
      "position": {
        "id": "uuid-poste",
        "code": "CHEF_DEPARTEMENT",
        "name": "Chef de département"
      },

      "departmentId": "5f5cb995-d8aa-4575-b873-135b898c5356",
      "isActive": true,
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-20T10:00:00.000Z"
    },
    "department": {
      "id": "5f5cb995-d8aa-4575-b873-135b898c5356",
      "name": "DSI Plateau Aile Gauche",
      "code": "DSI-PAG",
      "description": "Département informatique",
      "isActive": true,
      "createdAt": "2026-08-19T10:00:00.000Z",
      "updatedAt": "2026-08-19T10:00:00.000Z"
    }
  }
]
La liste contient uniquement les autorités actives, classées par nom.
4. Données nécessaires au formulaire
Le formulaire doit charger :
GET /employees
GET /departments
GET /authorities
- /employees alimente le sélecteur d’employé ;
- /departments alimente le sélecteur facultatif de département ;
- /authorities permet d’éviter de proposer un employé déjà utilisé.
const [employeesResponse, departmentsResponse, authoritiesResponse] =
  await Promise.all([
    api.get<Employee[]>('/employees'),
    api.get<Department[]>('/departments'),
    api.get<Authority[]>('/authorities'),
  ]);
Un employé peut être encadreur et autorité en même temps. En revanche, il ne peut avoir qu’un seul profil d’autorité.
5. Création
POST /authorities
Authorization: Bearer JWT
Content-Type: application/json
Corps :
{
  "employeeId": "35ea0722-57ef-44bc-ae99-bbed5762a307",
  "departmentId": "5f5cb995-d8aa-4575-b873-135b898c5356",
  "name": "Moussa Traoré",
  "email": "moussa.traore@entreprise.ml",
  "signingTitle": "Directeur des Systèmes d’Information"
}
Le département est facultatif :
{
  "employeeId": "35ea0722-57ef-44bc-ae99-bbed5762a307",
  "departmentId": null,
  "name": "Moussa Traoré",
  "email": "moussa.traore@entreprise.ml",
  "signingTitle": "Directeur Général"
}
Lorsque l’utilisateur sélectionne un employé, le frontend peut préremplir :
setForm({
  employeeId: employee.id,
  name: `${employee.firstName} ${employee.lastName}`,
  email: employee.email,
  departmentId: employee.departmentId,
  signingTitle: employee.position.name,
});
Ces valeurs restent modifiables avant l’enregistrement.
6. Consulter une autorité
GET /authorities/:id
:id correspond à l’identifiant du profil d’autorité, pas à celui de l’employé.
7. Modifier une autorité
PATCH /authorities/:id
Exemple :
{
  "signingTitle": "Directeur Général Adjoint",
  "departmentId": null
}
Tous les champs sont facultatifs pendant la modification.
8. Désactiver une autorité
DELETE /authorities/:id
La désactivation est refusée si l’autorité est encore liée à un stage :
- planifié : PLANNED ;
- en cours : ONGOING.
En cas de réussite, le backend renvoie l’autorité avec :
{
  "isActive": false
}
Elle disparaît ensuite de GET /authorities.
9. Validation
Champ	Obligatoire	Validation
employeeId	Oui	UUID d’un employé actif
departmentId	Non	UUID d’un département actif ou null
name	Oui	Texte, maximum 200 caractères
email	Oui	Email valide, maximum 255 caractères
signingTitle	Oui	Texte, maximum 150 caractères
isActive	Non	Booléen, true par défaut


Le backend :
- transforme l’email en minuscules ;
- retire les espaces inutiles ;
- refuse un employé déjà associé à une autorité ;
- refuse un email déjà utilisé par une autorité.
10. Erreurs possibles
Employé ou email déjà utilisé
{
  "statusCode": 409,
  "message": "Une autorité avec cet employé ou cet email existe déjà.",
  "error": "Conflict"
}
Employé invalide
{
  "statusCode": 404,
  "message": "L’employé indiqué est introuvable ou inactif.",
  "error": "Not Found"
}
Département invalide
{
  "statusCode": 404,
  "message": "Le département indiqué est introuvable ou inactif.",
  "error": "Not Found"
}
Autorité liée à un stage
{
  "statusCode": 409,
  "message": "Cette autorité est encore associée à un stage planifié ou en cours.",
  "error": "Conflict"
}
11. Permissions
Permission	Action
authorities.read	Afficher la page
authorities.create	Ajouter une autorité
authorities.update	Modifier une autorité
authorities.deactivate	Désactiver une autorité
employees.read	Charger le sélecteur d’employés
departments.read	Charger le sélecteur de départements


12. Composition recommandée
La page devrait contenir :
- une recherche par nom, email ou titre ;
- un filtre par département ;
- un bouton « Ajouter une autorité » ;
- les colonnes Nom, Email, Titre de signature, Employé, Département et Actions ;
- un sélecteur d’employé ;
- un sélecteur facultatif de département ;
- une confirmation de désactivation ;
- un message spécifique lorsqu’un stage empêche la désactivation ;
- les états chargement, liste vide et erreur.

## Utilisateur
La page suivante est « Utilisateurs ». Elle sert à gérer les comptes de connexion, et non les informations professionnelles des employés.
1. Différence Employé / Utilisateur
Employee
  └─ identité professionnelle :
     nom, email, matricule, poste, département

User
  └─ compte de connexion :
     mot de passe, rôle, état du compte, dernière connexion
Un utilisateur doit obligatoirement être associé à un employé actif. Un employé ne peut avoir qu’un seul compte utilisateur.
L’adresse utilisée pour se connecter est l’email de l’employé.
2. Interface TypeScript
export interface UserRole {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface UserEmployee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  positionId: string;
  position: {
    id: string;
    code: string;
    name: string;
  };
  isActive: boolean;
  department: {
    id: string;
    name: string;
    code: string;
  };
}

export interface UserAccount {
  id: string;
  employeeId: string;
  roleId: string;
  mustChangePassword: boolean;
  passwordChangedAt: string | null;
  lastLoginAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: UserEmployee;
  role: UserRole;
}
Le backend ne renvoie jamais :
- le mot de passe ;
- le hash du mot de passe ;
- le refresh token ;
- le hash du refresh token.
3. Liste des utilisateurs
GET /users
Authorization: Bearer JWT
Réponse :
[
  {
    "id": "11c01e02-a593-457c-a2c3-d137ff4cb371",
    "employeeId": "35ea0722-57ef-44bc-ae99-bbed5762a307",
    "roleId": "6e235a54-eb45-4440-b478-ca440ead5893",
    "mustChangePassword": false,
    "passwordChangedAt": "2026-08-20T10:00:00.000Z",
    "lastLoginAt": "2026-08-23T08:30:00.000Z",
    "isActive": true,
    "createdAt": "2026-08-01T10:00:00.000Z",
    "updatedAt": "2026-08-23T08:30:00.000Z",
    "employee": {
      "id": "35ea0722-57ef-44bc-ae99-bbed5762a307",
      "employeeNumber": "EMP-001",
      "firstName": "Moussa",
      "lastName": "Traoré",
      "email": "moussa.traore@entreprise.ml",
      "positionId": "uuid-poste",
      "position": {
        "id": "uuid-poste",
        "code": "CHEF_PROJET",
        "name": "Chef de projet"
      },

      "isActive": true,
      "department": {
        "id": "5f5cb995-d8aa-4575-b873-135b898c5356",
        "name": "DSI Plateau Aile Gauche",
        "code": "DSI-PAG"
      }
    },
    "role": {
      "id": "6e235a54-eb45-4440-b478-ca440ead5893",
      "name": "ADMINISTRATEUR",
      "description": "Administrateur du système",
      "isActive": true
    }
  }
]
Contrairement aux autres listes, GET /users renvoie les comptes actifs et désactivés. Cela permet d’afficher et de réactiver les anciens comptes.
4. Données du formulaire
Pour créer un utilisateur, le frontend doit charger :
GET /employees
GET /roles
GET /users
Il faut retirer du sélecteur les employés qui possèdent déjà un compte :
const usedEmployeeIds = new Set(
  users.map((user) => user.employeeId),
);

const availableEmployees = employees.filter(
  (employee) => !usedEmployeeIds.has(employee.id),
);
Même un compte désactivé empêche de créer un deuxième compte pour le même employé. Il faut réactiver le compte existant.
5. Créer un utilisateur
POST /users
Authorization: Bearer JWT
Content-Type: application/json
{
  "employeeId": "35ea0722-57ef-44bc-ae99-bbed5762a307",
  "roleId": "6e235a54-eb45-4440-b478-ca440ead5893",
  "password": "MotDePasseTemporaire@2026",
  "confirmPassword": "MotDePasseTemporaire@2026",
  "mustChangePassword": true
}
Valeurs recommandées :
{
  "mustChangePassword": true,
  "isActive": true
}
Le mot de passe temporaire doit être communiqué de manière sécurisée à l’utilisateur. Il n’est pas renvoyé dans la réponse.
6. Premier changement de mot de passe
Si mustChangePassword vaut true, l’utilisateur peut se connecter, mais les autres pages sont bloquées.
Le frontend doit le rediriger vers :
/changer-mot-de-passe
Endpoint utilisé :
PATCH /auth/change-password
Authorization: Bearer JWT
{
  "currentPassword": "MotDePasseTemporaire@2026",
  "newPassword": "NouveauMotDePasse@2026",
  "confirmNewPassword": "NouveauMotDePasse@2026"
}
Après le changement, toutes ses sessions sont révoquées et il doit se reconnecter avec le nouveau mot de passe.
7. Modifier le rôle ou l’état
PATCH /users/:id
Changer le rôle :
{
  "roleId": "nouvel-uuid-role"
}
Désactiver :
{
  "isActive": false
}
Réactiver :
{
  "isActive": true
}
Seuls roleId et isActive sont acceptés par cet endpoint.
Le changement de rôle et de permissions est appliqué par le backend dès les requêtes suivantes.
8. Réinitialiser le mot de passe
PATCH /users/:id/reset-password
{
  "newPassword": "NouveauMotDePasse@2026",
  "confirmNewPassword": "NouveauMotDePasse@2026",
  "mustChangePassword": true
}
Conséquences :
- le nouveau mot de passe remplace l’ancien ;
- toutes les sessions de l’utilisateur sont révoquées ;
- tous ses JWT deviennent immédiatement inutilisables ;
- il devra se reconnecter ;
- avec mustChangePassword: true, il devra ensuite choisir son propre mot de passe.
Un compte désactivé doit être réactivé avant la réinitialisation.
9. Désactiver un compte
DELETE /users/:id
Le backend applique isActive: false et révoque toutes les sessions.
Il est interdit :
- de désactiver son propre compte ;
- de désactiver le dernier administrateur actif.
10. Validation du mot de passe
Champ	Obligatoire	Validation
password	Oui à la création	Entre 15 et 128 caractères
confirmPassword	Oui	Doit être identique
newPassword	Oui à la réinitialisation	Entre 15 et 128 caractères
confirmNewPassword	Oui	Doit être identique


La création et la réinitialisation doivent être effectuées uniquement en HTTPS en production.
11. Erreurs importantes
Employé déjà associé à un compte
{
  "statusCode": 409,
  "message": "Un compte utilisateur existe déjà pour cet employé.",
  "error": "Conflict"
}
Employé ou rôle invalide
{
  "statusCode": 404,
  "message": "Employé actif introuvable.",
  "error": "Not Found"
}
{
  "statusCode": 404,
  "message": "Rôle actif introuvable.",
  "error": "Not Found"
}
Désactivation de son propre compte
{
  "statusCode": 409,
  "message": "Vous ne pouvez pas désactiver votre propre compte.",
  "error": "Conflict"
}
Dernier administrateur
{
  "statusCode": 409,
  "message": "Impossible de désactiver ou rétrograder le dernier administrateur actif.",
  "error": "Conflict"
}
Réutilisation du même mot de passe
{
  "statusCode": 400,
  "message": "Le nouveau mot de passe doit être différent de l'ancien.",
  "error": "Bad Request"
}
12. Permissions
Permission	Action
users.read	Consulter les comptes
users.create	Créer un compte
users.update	Modifier le rôle ou réactiver un compte
users.deactivate	Désactiver un compte
users.reset-password	Réinitialiser un mot de passe
employees.read	Charger les employés
roles.read	Charger les rôles


13. Composition recommandée
La page devrait contenir :
- une recherche par nom, email ou matricule ;
- des filtres par rôle, état et obligation de changer le mot de passe ;
- un bouton « Créer un utilisateur » ;
- les colonnes Employé, Email, Département, Rôle, État, Dernière connexion et Actions ;
- les actions Modifier le rôle, Réinitialiser le mot de passe, Désactiver ou Réactiver ;
- un badge « Changement de mot de passe requis » ;
- une protection visuelle empêchant l’administrateur de se désactiver lui-même.

## Roles et permissions
La page suivante est « Rôles et permissions ». Elle permet de créer les types d’utilisateurs et de déterminer précisément leurs droits.
1. Principe
Utilisateur
    ↓ possède
Rôle
    ↓ contient
Permissions
Exemple :
Rôle : RH
Permissions :
- employees.read
- employees.create
- employees.update
- interns.read
- interns.create
Les permissions du rôle sont vérifiées par le backend à chaque requête. Une modification devient donc effective immédiatement, sans attendre l’expiration du JWT.
2. Interfaces TypeScript
export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
}
3. Charger les rôles et permissions
GET /roles
GET /permissions
Authorization: Bearer JWT
Exemple :
const [rolesResponse, permissionsResponse] = await Promise.all([
  api.get<Role[]>('/roles'),
  api.get<Permission[]>('/permissions'),
]);

setRoles(rolesResponse.data);
setPermissions(permissionsResponse.data);
Réponse de /roles
[
  {
    "id": "6e235a54-eb45-4440-b478-ca440ead5893",
    "name": "RH",
    "description": "Gestion des ressources humaines",
    "isActive": true,
    "createdAt": "2026-08-01T10:00:00.000Z",
    "updatedAt": "2026-08-01T10:00:00.000Z",
    "permissions": [
      {
        "id": "591cf462-9b05-488c-b347-a9004022ac98",
        "code": "employees.read",
        "name": "Consulter les employés",
        "description": "Consulte la liste et le détail des employés.",
        "category": "employees",
        "isActive": true,
        "createdAt": "2026-08-01T09:00:00.000Z",
        "updatedAt": "2026-08-01T09:00:00.000Z"
      }
    ]
  }
]
Réponse de /permissions
[
  {
    "id": "591cf462-9b05-488c-b347-a9004022ac98",
    "code": "employees.read",
    "name": "Consulter les employés",
    "description": "Consulte la liste et le détail des employés.",
    "category": "employees",
    "isActive": true,
    "createdAt": "2026-08-01T09:00:00.000Z",
    "updatedAt": "2026-08-01T09:00:00.000Z"
  }
]
Les permissions sont classées par catégorie, puis par code.
4. Créer un rôle
POST /roles
Authorization: Bearer JWT
Content-Type: application/json
{
  "name": "CHEF_PROJET",
  "description": "Responsable du suivi des projets"
}
Le backend transforme automatiquement le nom en majuscules.
La réponse contient le rôle créé :
{
  "id": "uuid-role",
  "name": "CHEF_PROJET",
  "description": "Responsable du suivi des projets",
  "isActive": true,
  "createdAt": "2026-08-23T10:00:00.000Z",
  "updatedAt": "2026-08-23T10:00:00.000Z",
  "permissions": []
}
La création du rôle n’attribue aucune permission. Il faut ensuite enregistrer ses permissions.
5. Attribuer les permissions
PUT /roles/:id/permissions
Authorization: Bearer JWT
Content-Type: application/json
{
  "permissionIds": [
    "uuid-permission-employees-read",
    "uuid-permission-projects-read",
    "uuid-permission-dashboard-read"
  ]
}
Attention : cet endpoint remplace entièrement les permissions du rôle.
Exemple :
Permissions actuelles : A, B, C
Corps envoyé          : A, D
Résultat final         : A, D
Il ne faut donc pas envoyer uniquement la nouvelle permission. Il faut envoyer toutes les permissions cochées.
La réponse contient le rôle complet avec sa nouvelle liste de permissions.
6. Préparer les cases à cocher
const selectedPermissionIds = new Set(
  selectedRole.permissions.map((permission) => permission.id),
);
Pour enregistrer :
await api.put(`/roles/${selectedRole.id}/permissions`, {
  permissionIds: Array.from(selectedPermissionIds),
});
Pour un rôle autre qu’ADMINISTRATEUR, un tableau vide est accepté :
{
  "permissionIds": []
}
7. Regrouper les permissions par domaine
const permissionsByCategory = permissions.reduce(
  (groups, permission) => {
    groups[permission.category] ??= [];
    groups[permission.category].push(permission);
    return groups;
  },
  {} as Record<string, Permission[]>,
);
Affichage recommandé :
Départements
☑ Consulter les départements
☑ Créer les départements
☐ Modifier les départements
☐ Désactiver les départements

Employés
☑ Consulter les employés
☐ Créer les employés
...
8. Modifier un rôle
PATCH /roles/:id
{
  "name": "RESPONSABLE_PROJET",
  "description": "Responsable du suivi des projets"
}
La modification du nom ou de la description ne change pas les permissions.
9. Désactiver un rôle
DELETE /roles/:id
La désactivation est refusée si :
- le rôle est ADMINISTRATEUR ;
- le rôle est encore attribué à un utilisateur actif ;
- le rôle est déjà désactivé.
Il faut d’abord attribuer un autre rôle aux utilisateurs concernés.
10. Protection du rôle ADMINISTRATEUR
Le rôle ADMINISTRATEUR :
- ne peut pas être renommé ;
- ne peut pas être désactivé ;
- doit toujours conserver toutes les permissions actives.
Le frontend devrait afficher toutes ses permissions cochées et désactiver leurs cases :
const isProtectedAdministrator =
  selectedRole.name === 'ADMINISTRATEUR';
11. Validation
Champ	Obligatoire	Validation
name	Oui à la création	Texte, maximum 50 caractères
description	Non	Texte
isActive	Non	Booléen
permissionIds	Oui lors de l’attribution	Tableau d’UUID sans doublons


12. Erreurs possibles
Rôle déjà existant
{
  "statusCode": 409,
  "message": "Ce rôle existe déjà.",
  "error": "Conflict"
}
Permissions incorrectes
{
  "statusCode": 400,
  "message": "Une ou plusieurs permissions sont introuvables ou inactives.",
  "error": "Bad Request"
}
Protection administrateur
{
  "statusCode": 409,
  "message": "Le rôle ADMINISTRATEUR doit conserver toutes les permissions actives.",
  "error": "Conflict"
}
Rôle encore attribué
{
  "statusCode": 409,
  "message": "Ce rôle est encore attribué à un ou plusieurs utilisateurs actifs.",
  "error": "Conflict"
}
13. Permissions nécessaires à cette page
Permission	Action
roles.read	Consulter les rôles
roles.create	Créer un rôle
roles.update	Modifier un rôle
roles.deactivate	Désactiver un rôle
roles.permissions.manage	Attribuer les permissions
permissions.read	Charger le catalogue de permissions


14. Composition recommandée
La page devrait avoir deux zones :
┌─────────────────────┬─────────────────────────────┐
│ Liste des rôles     │ Permissions du rôle choisi │
│                     │                             │
│ ADMINISTRATEUR      │ Dashboard                  │
│ RH                  │ ☑ Consulter                │
│ ENCADREUR           │ ☑ Modifier                 │
│ DIRECTION           │                             │
└─────────────────────┴─────────────────────────────┘
Ajouter :
- un bouton « Nouveau rôle » ;
- une recherche de rôle ;
- le nombre de permissions par rôle ;
- les permissions groupées par catégorie ;
- des cases « Tout sélectionner » par catégorie ;
- un bouton « Enregistrer les permissions » ;
- une alerte avant de retirer une permission importante.
Important : PUT /roles/:id/permissions est actuellement absent de la liste des méthodes CORS autorisées. Il faudra ajouter PUT dans src/main.ts avant que cette action fonctionne depuis un navigateur sur un autre PC.

## Journal d'audit
La page suivante est « Journal d’audit ». Elle permet de savoir qui a effectué une action, sur quelle ressource, à quelle date, depuis quelle adresse et si l’action a réussi.
1. Types d’actions
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET';

export type AuditOutcome = 'SUCCESS' | 'FAILURE';
Libellés recommandés :
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression/Désactivation',
  LOGIN: 'Connexion',
  PASSWORD_CHANGE: 'Changement de mot de passe',
  PASSWORD_RESET: 'Réinitialisation du mot de passe',
};

export const AUDIT_OUTCOME_LABELS: Record<AuditOutcome, string> = {
  SUCCESS: 'Réussie',
  FAILURE: 'Échouée',
};
2. Interfaces TypeScript
export interface AuditActor {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: AuditAction;
  outcome: AuditOutcome;
  resource: string;
  resourceId: string | null;
  entityLabel: string | null;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: AuditActor | null;
}

export interface AuditPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogPage {
  items: AuditLog[];
  pagination: AuditPagination;
}
3. Afficher le journal
GET /audit-logs
Authorization: Bearer JWT
Paramètres par défaut :
page=1
limit=20
Réponse :
{
  "items": [
    {
      "id": "769b91d2-2c13-40e2-bbae-92a6f4bf7040",
      "userId": "11c01e02-a593-457c-a2c3-d137ff4cb371",
      "action": "CREATE",
      "outcome": "SUCCESS",
      "resource": "departments",
      "resourceId": "5f5cb995-d8aa-4575-b873-135b898c5356",
      "entityLabel": "DSI Plateau Aile Gauche",
      "method": "POST",
      "path": "/departments",
      "statusCode": 201,
      "ipAddress": "10.175.2.61",
      "userAgent": "Mozilla/5.0 ...",
      "metadata": {
        "requestBody": {
          "code": "DSI-PAG",
          "name": "DSI Plateau Aile Gauche"
        },
        "query": {},
        "durationMs": 34
      },
      "createdAt": "2026-08-23T10:30:00.000Z",
      "user": {
        "id": "11c01e02-a593-457c-a2c3-d137ff4cb371",
        "employee": {
          "firstName": "Administrateur",
          "lastName": "Système",
          "email": "admin@entreprise.ml"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 56,
    "totalPages": 3
  }
}
4. Pagination frontend
const response = await api.get<AuditLogPage>('/audit-logs', {
  params: {
    page: 1,
    limit: 20,
  },
});

setAuditLogs(response.data.items);
setPagination(response.data.pagination);
La limite :
- minimum : 1 ;
- maximum : 100 ;
- valeur par défaut : 20.
Les événements sont classés du plus récent au plus ancien.
5. Filtres disponibles
Paramètre	Exemple
page	1
limit	20
action	CREATE
outcome	SUCCESS
resource	departments
userId	UUID utilisateur
dateFrom	Date ISO de début
dateTo	Date ISO de fin


Exemple :
GET /audit-logs?page=1&limit=20&action=CREATE&outcome=SUCCESS&resource=departments
Avec Axios :
const response = await api.get<AuditLogPage>('/audit-logs', {
  params: {
    page,
    limit,
    action: selectedAction || undefined,
    outcome: selectedOutcome || undefined,
    resource: selectedResource || undefined,
    userId: selectedUserId || undefined,
    dateFrom: dateFrom
      ? `${dateFrom}T00:00:00.000Z`
      : undefined,
    dateTo: dateTo
      ? `${dateTo}T23:59:59.999Z`
      : undefined,
  },
});
Il est préférable d’envoyer la fin de journée dans dateTo. Envoyer seulement 2026-08-23 correspondrait à minuit et pourrait exclure les événements du reste de la journée.
6. Ressources possibles
Le champ resource correspond généralement au premier segment de l’endpoint :
export const AUDIT_RESOURCE_LABELS = {
  auth: 'Authentification',
  departments: 'Départements',
  positions: 'Postes',
  employees: 'Employés',
  users: 'Utilisateurs',
  roles: 'Rôles',
  interns: 'Stagiaires',
  supervisors: 'Encadreurs',
  authorities: 'Autorités',
  internships: 'Stages',
  projects: 'Projets',
  'project-assignments': 'Affectations',
};
Le filtre resource effectue actuellement une correspondance exacte.
7. Consulter le détail
GET /audit-logs/:id
Cette réponse permet d’afficher une fenêtre de détail contenant :
- l’utilisateur ;
- l’action ;
- la ressource ;
- l’identifiant de la ressource ;
- le chemin HTTP ;
- le code HTTP ;
- l’adresse IP ;
- le navigateur ;
- les métadonnées ;
- la date et l’heure.
8. Afficher l’utilisateur
L’utilisateur peut être null, notamment lorsqu’une tentative de connexion échoue avant que le compte soit identifié.
function getActorName(log: AuditLog): string {
  if (!log.user) {
    return 'Utilisateur non identifié';
  }

  return `${log.user.employee.firstName} ${log.user.employee.lastName}`;
}
9. Couleurs recommandées
const outcomeColor = {
  SUCCESS: 'green',
  FAILURE: 'red',
};

const actionColor = {
  CREATE: 'blue',
  UPDATE: 'orange',
  DELETE: 'red',
  LOGIN: 'purple',
  PASSWORD_CHANGE: 'yellow',
  PASSWORD_RESET: 'yellow',
};
10. Protection des données sensibles
Le backend masque automatiquement les clés contenant notamment :
- password ;
- token ;
- authorization.
Exemple :
{
  "requestBody": {
    "email": "admin@entreprise.ml",
    "password": "[REDACTED]"
  }
}
Le frontend ne doit néanmoins pas afficher automatiquement tout le contenu de metadata. Il est préférable de l’afficher uniquement dans une fenêtre de détail réservée aux utilisateurs autorisés.
11. Actions actuellement enregistrées
Le backend journalise automatiquement les requêtes :
- POST ;
- PATCH ;
- DELETE.
Les consultations GET ne sont pas enregistrées afin d’éviter de remplir inutilement le journal.
Le journal enregistre les réussites et les échecs. Un problème d’écriture dans le journal ne bloque pas l’opération métier principale.
12. Permission nécessaire
audit-logs.read
Cette permission donne accès à :
GET /audit-logs
GET /audit-logs/:id
Elle devrait normalement être réservée à :
- l’administrateur ;
- la direction ;
- les responsables autorisés.
13. Composition recommandée
La page devrait contenir :
- des filtres par action, résultat, ressource, utilisateur et période ;
- les colonnes Date, Utilisateur, Action, Ressource, Élément, Résultat et Adresse IP ;
- une pagination serveur ;
- un badge vert pour SUCCESS ;
- un badge rouge pour FAILURE ;
- un panneau de détail pour les métadonnées ;
- un bouton de réinitialisation des filtres ;
- aucun bouton de création, modification ou suppression.
14. Améliorations backend détectées
Deux événements ne sont pas encore parfaitement traités :
- PUT /roles/:id/permissions n’est pas journalisé, car l’intercepteur n’écoute pas encore la méthode PUT ;
- POST /auth/logout est actuellement classé comme une création générique, car l’action LOGOUT n’existe pas encore dans l’énumération.
Ces deux points devront être corrigés pour obtenir un journal d’audit totalement complet.

## Tableau de bord
La page suivante est le « Tableau de bord ». Elle utilise un seul endpoint qui fournit toutes les statistiques et activités nécessaires.
1. Endpoint
GET /dashboard
Authorization: Bearer JWT
Avec Axios :
const response = await api.get<DashboardResponse>('/dashboard');
const dashboard = response.data;
Aucun paramètre n’est nécessaire.
2. Interfaces TypeScript
export type InternshipStatus =
  | 'PLANNED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProjectStatus =
  | 'PLANNED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET';

export interface DashboardResponse {
  generatedAt: string;

  summary: {
    activeInterns: number;
    internsAddedThisMonth: number;
    activeInternships: number;
    ongoingInternships: number;
    activeProjects: number;
    ongoingProjects: number;
    activeSupervisors: number;
    activeDepartments: number;
  };

  statusBreakdown: {
    internships: {
      PLANNED: number;
      ONGOING: number;
      COMPLETED: number;
      CANCELLED: number;
    };
    projects: {
      PLANNED: number;
      ONGOING: number;
      COMPLETED: number;
      CANCELLED: number;
      ON_HOLD: number;
    };
  };

  recentInterns: DashboardRecentIntern[];
  internshipTracking: DashboardInternshipTracking[];
  recentActivities: DashboardActivity[];
}
Types complémentaires :
export interface DashboardDepartment {
  id: string;
  name: string;
  code: string;
}

export interface DashboardRecentIntern {
  id: string;
  registrationCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  createdAt: string;
  latestInternship: {
    id: string;
    status: InternshipStatus;
    startDate: string;
    endDate: string;
    department: DashboardDepartment;
  } | null;
}

export interface DashboardInternshipTracking {
  id: string;
  title: string;
  status: InternshipStatus;
  startDate: string;
  endDate: string;
  intern: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };
  department: DashboardDepartment;
  supervisor: {
    id: string;
    fullName: string;
  };
  project: {
    id: string;
    name: string;
    status: ProjectStatus;
  } | null;
}

export interface DashboardActivity {
  id: string;
  action: AuditAction;
  resource: string;
  resourceId: string | null;
  entityLabel: string | null;
  occurredAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  } | null;
}
3. Exemple de réponse
{
  "generatedAt": "2026-08-23T10:30:00.000Z",
  "summary": {
    "activeInterns": 25,
    "internsAddedThisMonth": 4,
    "activeInternships": 21,
    "ongoingInternships": 12,
    "activeProjects": 8,
    "ongoingProjects": 5,
    "activeSupervisors": 10,
    "activeDepartments": 6
  },
  "statusBreakdown": {
    "internships": {
      "PLANNED": 5,
      "ONGOING": 12,
      "COMPLETED": 3,
      "CANCELLED": 1
    },
    "projects": {
      "PLANNED": 2,
      "ONGOING": 5,
      "COMPLETED": 1,
      "CANCELLED": 0,
      "ON_HOLD": 0
    }
  },
  "recentInterns": [
    {
      "id": "uuid-stagiaire",
      "registrationCode": "STG-2026-001",
      "firstName": "Amadou",
      "lastName": "Diallo",
      "fullName": "Amadou Diallo",
      "createdAt": "2026-08-22T09:00:00.000Z",
      "latestInternship": {
        "id": "uuid-stage",
        "status": "ONGOING",
        "startDate": "2026-08-01T00:00:00.000Z",
        "endDate": "2026-12-31T00:00:00.000Z",
        "department": {
          "id": "uuid-departement",
          "name": "DSI",
          "code": "DSI"
        }
      }
    }
  ],
  "internshipTracking": [
    {
      "id": "uuid-stage",
      "title": "Stage de développement",
      "status": "ONGOING",
      "startDate": "2026-08-01T00:00:00.000Z",
      "endDate": "2026-12-31T00:00:00.000Z",
      "intern": {
        "id": "uuid-stagiaire",
        "firstName": "Amadou",
        "lastName": "Diallo",
        "fullName": "Amadou Diallo"
      },
      "department": {
        "id": "uuid-departement",
        "name": "DSI",
        "code": "DSI"
      },
      "supervisor": {
        "id": "uuid-encadreur",
        "fullName": "Moussa Traoré"
      },
      "project": {
        "id": "uuid-projet",
        "name": "Gestion des stagiaires",
        "status": "ONGOING"
      }
    }
  ],
  "recentActivities": [
    {
      "id": "uuid-audit",
      "action": "CREATE",
      "resource": "departments",
      "resourceId": "uuid-departement",
      "entityLabel": "DSI Plateau Aile Gauche",
      "occurredAt": "2026-08-23T10:20:00.000Z",
      "actor": {
        "id": "uuid-utilisateur",
        "firstName": "Administrateur",
        "lastName": "Système",
        "fullName": "Administrateur Système"
      }
    }
  ]
}
4. Signification des statistiques
Champ	Signification
activeInterns	Nombre total de stagiaires actifs
internsAddedThisMonth	Stagiaires actifs ajoutés pendant le mois UTC actuel
activeInternships	Nombre total de stages dont isActive=true
ongoingInternships	Stages ayant le statut ONGOING
activeProjects	Nombre total de projets dont isActive=true
ongoingProjects	Projets ayant le statut ONGOING
activeSupervisors	Encadreurs actifs dont l’employé est actif
activeDepartments	Départements actifs


Attention : activeInternships et activeProjects comptent toutes les lignes actives, y compris celles terminées ou annulées si isActive reste à true. Les champs ongoing... comptent uniquement les éléments en cours.
5. Répartition par statut
Les valeurs sont toujours présentes, même lorsqu’elles valent zéro.
Le frontend peut créer :
- un graphique circulaire pour les stages ;
- un graphique circulaire ou en barres pour les projets.
const internshipChartData = [
  dashboard.statusBreakdown.internships.PLANNED,
  dashboard.statusBreakdown.internships.ONGOING,
  dashboard.statusBreakdown.internships.COMPLETED,
  dashboard.statusBreakdown.internships.CANCELLED,
];
Couleurs recommandées :
const statusColors = {
  PLANNED: '#3B82F6',
  ONGOING: '#F97316',
  COMPLETED: '#16A34A',
  CANCELLED: '#DC2626',
  ON_HOLD: '#CA8A04',
};
6. Stagiaires récents
recentInterns contient au maximum cinq stagiaires actifs, classés du plus récemment créé au plus ancien.
latestInternship peut être null :
if (intern.latestInternship) {
  // Afficher le stage et le département
} else {
  // Afficher « Aucun stage »
}
Un clic peut rediriger vers :
/stagiaires/:id
7. Suivi des stages
internshipTracking contient au maximum cinq stages actifs, classés par date de début décroissante.
Chaque élément fournit :
- le stage ;
- le stagiaire ;
- le département ;
- l’encadreur ;
- le projet le plus récemment affecté.
project peut être null. Dans ce cas, afficher :
Aucun projet affecté
8. Activités récentes
recentActivities contient les trois dernières actions réussies du journal d’audit.
actor peut être null, notamment pour certaines actions d’authentification.
Exemple d’affichage :
function activityText(activity: DashboardActivity): string {
  const actor = activity.actor?.fullName ?? 'Utilisateur inconnu';
  const entity = activity.entityLabel ?? activity.resource;

  return `${actor} — ${activity.action} — ${entity}`;
}
9. Permission
La page nécessite :
dashboard.read
Si cette permission n’est pas présente dans user.permissions, le frontend ne doit pas afficher le lien « Tableau de bord ».
Le backend retournera également 403 si un utilisateur non autorisé appelle directement l’endpoint.
10. Composition recommandée
La page peut être organisée ainsi :
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Stagiaires   │ Stages       │ Projets      │ Encadreurs   │
│ 25           │ 21           │ 8            │ 10           │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌───────────────────────────┬───────────────────────────────┐
│ Répartition des stages    │ Répartition des projets       │
└───────────────────────────┴───────────────────────────────┘

┌───────────────────────────┬───────────────────────────────┐
│ Stagiaires récents        │ Activités récentes            │
└───────────────────────────┴───────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ Suivi des stages                                          │
└───────────────────────────────────────────────────────────┘
Prévoir :
- un état de chargement global ;
- un bouton « Actualiser » ;
- l’heure de generatedAt ;
- des cartes cliquables vers les pages correspondantes ;
- des tableaux avec état vide ;
- un rafraîchissement après une création ou une modification importante.
Important : les fichiers actuels du dashboard comportent encore des modifications locales non committées. Le contrat ci-dessus correspond à l’état présent sur ce PC, mais cette version doit encore être validée et poussée sur GitHub avant que l’autre développeur puisse la récupérer.

## Stagiaire
La page suivante est « Stagiaires ». Elle contient les informations personnelles, scolaires et les contacts d’urgence du stagiaire.
1. Valeurs autorisées
Genre
export type Gender = 'MALE' | 'FEMALE';

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Homme',
  FEMALE: 'Femme',
};
Niveau d’études
export type EducationLevel = 'LICENCE' | 'MASTER';

export const EDUCATION_LEVEL_LABELS: Record<
  EducationLevel,
  string
> = {
  LICENCE: 'Licence',
  MASTER: 'Master',
};
Le backend n’accepte actuellement que LICENCE et MASTER.
2. Interface TypeScript
export interface Intern {
  id: string;
  registrationCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  email: string;
  phone: string;
  address: string | null;
  school: string;
  fieldOfStudy: string;
  educationLevel: EducationLevel;
  studyYear: number;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
Le nom complet doit être construit par le frontend :
const fullName = `${intern.firstName} ${intern.lastName}`;
3. Liste des stagiaires
GET /interns
Authorization: Bearer JWT
Réponse :
[
  {
    "id": "6f555fea-e23a-4639-94f2-d2e68c98f354",
    "registrationCode": "STG-2026-001",
    "firstName": "Amadou",
    "lastName": "Diallo",
    "dateOfBirth": "2002-06-15T00:00:00.000Z",
    "gender": "MALE",
    "email": "amadou.diallo@email.com",
    "phone": "+22370000000",
    "address": "Bamako, Mali",
    "school": "Université de Bamako",
    "fieldOfStudy": "Informatique",
    "educationLevel": "LICENCE",
    "studyYear": 3,
    "emergencyContactName": "Mamadou Diallo",
    "emergencyContactPhone": "+22371000000",
    "isActive": true,
    "createdAt": "2026-08-23T09:00:00.000Z",
    "updatedAt": "2026-08-23T09:00:00.000Z"
  }
]
La liste :
- contient uniquement les stagiaires actifs ;
- est classée par nom, puis par prénom ;
- ne contient pas encore les stages associés ;
- n’a pas encore de pagination ou recherche backend.
4. Créer un stagiaire
POST /interns
Authorization: Bearer JWT
Content-Type: application/json
{
  "registrationCode": "STG-2026-001",
  "firstName": "Amadou",
  "lastName": "Diallo",
  "dateOfBirth": "2002-06-15",
  "gender": "MALE",
  "email": "amadou.diallo@email.com",
  "phone": "+22370000000",
  "address": "Bamako, Mali",
  "school": "Université de Bamako",
  "fieldOfStudy": "Informatique",
  "educationLevel": "LICENCE",
  "studyYear": 3,
  "emergencyContactName": "Mamadou Diallo",
  "emergencyContactPhone": "+22371000000"
}
Le backend renvoie directement le stagiaire créé.
Après la création, le frontend peut proposer :
Stagiaire créé avec succès.
Voulez-vous maintenant créer son stage ?
Le stage sera créé séparément avec POST /internships.
5. Consulter un stagiaire
GET /interns/:id
:id correspond à l’identifiant UUID du stagiaire.
Attention : cette réponse ne contient actuellement pas ses stages. Elle renvoie uniquement ses informations personnelles et scolaires.
6. Modifier un stagiaire
PATCH /interns/:id
Envoyer uniquement les champs modifiés :
{
  "phone": "+22372000000",
  "address": "ACI 2000, Bamako",
  "studyYear": 4
}
Pour vider un champ facultatif, envoyez temporairement une chaîne vide :
{
  "address": "",
  "emergencyContactName": "",
  "emergencyContactPhone": ""
}
Le backend transformera ces chaînes vides en null.
Il vaut mieux ne pas envoyer null actuellement pendant une modification, car certains traitements utilisent directement .trim().
7. Désactiver un stagiaire
DELETE /interns/:id
La désactivation est logique :
{
  "isActive": false
}
Le stagiaire disparaît ensuite de GET /interns.
Limitation actuelle : le backend ne vérifie pas encore si le stagiaire possède un stage planifié ou en cours avant de le désactiver. Le frontend devrait afficher une confirmation forte, mais cette règle devra surtout être ajoutée au backend.
8. Validation
Champ	Obligatoire	Validation
registrationCode	Oui	Texte, maximum 30 caractères
firstName	Oui	Texte, maximum 100 caractères
lastName	Oui	Texte, maximum 100 caractères
dateOfBirth	Oui	Date ISO, pas dans le futur
gender	Oui	MALE ou FEMALE
email	Oui	Email valide, maximum 255 caractères
phone	Oui	Texte, maximum 30 caractères
address	Non	Texte
school	Oui	Texte, maximum 200 caractères
fieldOfStudy	Oui	Texte, maximum 200 caractères
educationLevel	Oui	LICENCE ou MASTER
studyYear	Oui	Entier entre 1 et 10
emergencyContactName	Non	Maximum 200 caractères
emergencyContactPhone	Non	Maximum 30 caractères
isActive	Non	Booléen, true par défaut


Le backend :
- transforme le code d’inscription en majuscules ;
- transforme l’email en minuscules ;
- retire les espaces inutiles ;
- refuse une date de naissance future ;
- refuse un matricule ou un email déjà utilisé.
9. Erreurs possibles
Matricule ou email déjà utilisé
{
  "statusCode": 409,
  "message": "Un stagiaire avec ce matricule ou cet email existe déjà.",
  "error": "Conflict"
}
Date de naissance future
{
  "statusCode": 400,
  "message": "La date de naissance ne peut pas être dans le futur.",
  "error": "Bad Request"
}
Stagiaire inexistant
{
  "statusCode": 404,
  "message": "Stagiaire introuvable.",
  "error": "Not Found"
}
Stagiaire déjà désactivé
{
  "statusCode": 409,
  "message": "Ce stagiaire est déjà désactivé.",
  "error": "Conflict"
}
10. Permissions
Permission	Action
interns.read	Afficher la liste et le détail
interns.create	Ajouter un stagiaire
interns.update	Modifier un stagiaire
interns.deactivate	Désactiver un stagiaire
internships.read	Consulter les stages associés
internships.create	Créer un stage après le stagiaire


11. Composition recommandée
La page de liste devrait contenir :
- une recherche par matricule, nom, email ou école ;
- des filtres par sexe, niveau d’études et année ;
- un bouton « Ajouter un stagiaire » ;
- les colonnes Matricule, Nom complet, Email, Téléphone, École, Filière, Niveau et Actions.
Le formulaire peut être divisé en trois sections :
1. Informations personnelles
   Nom, prénom, naissance, sexe, email, téléphone et adresse.
2. Informations scolaires
   École, filière, niveau et année d’étude.
3. Contact d’urgence
   Nom et téléphone du contact.
Pour afficher le stage actuel directement sur cette page, il faudra soit charger également GET /internships et faire la correspondance avec internId, soit améliorer GET /interns pour inclure le dernier stage.

## Stage
La page suivante est « Stages ». C’est le domaine central qui relie un stagiaire, un département, un encadreur et éventuellement une autorité.
1. Types et statuts
Type de stage
export type InternshipType = 'ACADEMIC' | 'PROFESSIONAL';

export const INTERNSHIP_TYPE_LABELS: Record<
  InternshipType,
  string
> = {
  ACADEMIC: 'Stage académique',
  PROFESSIONAL: 'Stage professionnel',
};
Statut
export type InternshipStatus =
  | 'PLANNED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED';

export const INTERNSHIP_STATUS_LABELS: Record<
  InternshipStatus,
  string
> = {
  PLANNED: 'Planifié',
  ONGOING: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};
2. Interface TypeScript
export interface Internship {
  id: string;
  referenceCode: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: InternshipStatus;
  internshipType: InternshipType;
  monthlyAllowance: string | number | null;
  currency: string;
  workLocation: string;
  internId: string;
  departmentId: string;
  supervisorId: string;
  authorityId: string | null;
  grade: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  intern: Intern;
  department: Department;

  supervisor: {
    id: string;
    employeeId: string;
    isActive: boolean;
    employee: Employee;
  };

  authority: {
    id: string;
    employeeId: string;
    name: string;
    email: string;
    signingTitle: string;
    employee: Employee;
  } | null;
}
L’indemnité MySQL est un Decimal. Selon la sérialisation, elle peut arriver sous forme de chaîne, par exemple "50000.00". Le frontend doit donc utiliser :
const allowance = Number(internship.monthlyAllowance ?? 0);
3. Liste des stages
GET /internships
Authorization: Bearer JWT
Réponse simplifiée :
[
  {
    "id": "5a2744cc-3825-4391-8378-5b6ead4408c8",
    "referenceCode": "STAGE-2026-001",
    "title": "Stage de développement backend",
    "description": "Développement des API",
    "startDate": "2026-08-01T00:00:00.000Z",
    "endDate": "2026-12-31T00:00:00.000Z",
    "status": "ONGOING",
    "internshipType": "ACADEMIC",
    "monthlyAllowance": "50000.00",
    "currency": "XOF",
    "workLocation": "Bamako",
    "internId": "uuid-stagiaire",
    "departmentId": "uuid-departement",
    "supervisorId": "uuid-encadreur",
    "authorityId": "uuid-autorite",
    "grade": null,
    "isActive": true,
    "createdAt": "2026-08-01T10:00:00.000Z",
    "updatedAt": "2026-08-23T10:00:00.000Z",
    "intern": {
      "id": "uuid-stagiaire",
      "registrationCode": "STG-2026-001",
      "firstName": "Amadou",
      "lastName": "Diallo"
    },
    "department": {
      "id": "uuid-departement",
      "name": "DSI",
      "code": "DSI"
    },
    "supervisor": {
      "id": "uuid-encadreur",
      "employeeId": "uuid-employe",
      "employee": {
        "firstName": "Moussa",
        "lastName": "Traoré",
        "email": "moussa.traore@entreprise.ml"
      }
    },
    "authority": {
      "id": "uuid-autorite",
      "name": "Directeur DSI",
      "signingTitle": "Directeur des Systèmes d’Information",
      "employee": {
        "firstName": "Boubacar",
        "lastName": "Coulibaly"
      }
    }
  }
]
La liste :
- contient uniquement les stages actifs ;
- est classée par date de début décroissante ;
- inclut le stagiaire, le département, l’encadreur et l’autorité ;
- n’a pas encore de pagination ou de recherche backend.
4. Données nécessaires au formulaire
Le frontend doit charger :
GET /interns
GET /departments
GET /supervisors
GET /authorities
Exemple :
const [
  internsResponse,
  departmentsResponse,
  supervisorsResponse,
  authoritiesResponse,
] = await Promise.all([
  api.get<Intern[]>('/interns'),
  api.get<Department[]>('/departments'),
  api.get<Supervisor[]>('/supervisors'),
  api.get<Authority[]>('/authorities'),
]);
L’autorité est facultative. Les trois autres relations sont obligatoires.
Attention : il faut envoyer l’identifiant du profil Supervisor, pas l’identifiant de son employé.
5. Créer un stage
POST /internships
Authorization: Bearer JWT
Content-Type: application/json
{
  "referenceCode": "STAGE-2026-001",
  "title": "Stage de développement backend",
  "description": "Développement des API",
  "startDate": "2026-08-01",
  "endDate": "2026-12-31",
  "status": "PLANNED",
  "internshipType": "ACADEMIC",
  "monthlyAllowance": 50000,
  "currency": "XOF",
  "workLocation": "Bamako",
  "internId": "uuid-stagiaire",
  "departmentId": "uuid-departement",
  "supervisorId": "uuid-encadreur",
  "authorityId": "uuid-autorite",
  "grade": null
}
Sans autorité :
{
  "authorityId": null
}
Champs facultatifs :
- description ;
- status, qui vaut PLANNED par défaut ;
- monthlyAllowance ;
- currency, qui vaut XOF par défaut ;
- authorityId ;
- grade ;
- isActive, qui vaut true par défaut.
6. Règle de chevauchement
Un stagiaire ne peut pas avoir deux stages actifs qui se chevauchent.
Exemple refusé :
Premier stage : 01 août → 31 décembre
Nouveau stage : 01 octobre → 31 janvier
                         ↑ chevauchement
Les stages ayant le statut CANCELLED ne bloquent pas une nouvelle période.
7. Note sur 20
La note est facultative et doit être un entier entre 0 et 20.
Le frontend peut utiliser un sélecteur :
const grades = Array.from({ length: 21 }, (_, index) => index);
Affichage :
Non noté
0/20
1/20
...
20/20
Il est préférable d’autoriser la saisie de la note seulement lorsque le stage est terminé :
const canGrade = internship.status === 'COMPLETED';
Cette restriction est recommandée côté interface, mais elle n’est pas encore imposée par le backend.
8. Indemnité mensuelle
interface AllowanceFields {
  monthlyAllowance: number | null;
  currency: string;
}
Validation :
- montant supérieur ou égal à zéro ;
- maximum deux décimales ;
- devise composée exactement de trois lettres ;
- devise automatiquement transformée en majuscules.
Exemples :
{
  "monthlyAllowance": 50000,
  "currency": "XOF"
}
{
  "monthlyAllowance": null,
  "currency": "XOF"
}
9. Consulter un stage
GET /internships/:id
La réponse contient les mêmes relations imbriquées que la liste.
Elle ne contient pas encore les projets affectés. Pour obtenir les projets du stage, il faut charger :
GET /project-assignments
Puis filtrer par internshipId.
10. Modifier un stage
PATCH /internships/:id
Commencer un stage :
{
  "status": "ONGOING"
}
Terminer et noter :
{
  "status": "COMPLETED",
  "grade": 16
}
Annuler :
{
  "status": "CANCELLED"
}
Changer l’encadreur :
{
  "supervisorId": "nouvel-uuid-encadreur"
}
Retirer l’autorité :
{
  "authorityId": null
}
Le backend contrôle de nouveau toutes les relations et les périodes.
11. Désactiver un stage
DELETE /internships/:id
Le backend refuse de désactiver un stage ayant le statut ONGOING.
Il faut d’abord le passer en :
- COMPLETED ;
- ou CANCELLED.
La réponse du DELETE ne contient pas les relations imbriquées. Après réussite, le frontend doit retirer la ligne ou recharger la liste.
12. Erreurs principales
Référence déjà utilisée
{
  "statusCode": 409,
  "message": "Cette référence de stage existe déjà.",
  "error": "Conflict"
}
Période invalide
{
  "statusCode": 400,
  "message": "La date de fin doit être postérieure ou égale à la date de début.",
  "error": "Bad Request"
}
Chevauchement
{
  "statusCode": 409,
  "message": "Ce stagiaire possède déjà un stage sur cette période.",
  "error": "Conflict"
}
Encadreur invalide
{
  "statusCode": 404,
  "message": "Le maître de stage indiqué est introuvable ou inactif.",
  "error": "Not Found"
}
Autorité invalide
{
  "statusCode": 404,
  "message": "L’autorité signataire indiquée est introuvable ou inactive.",
  "error": "Not Found"
}
Désactivation d’un stage en cours
{
  "statusCode": 409,
  "message": "Un stage en cours doit être terminé ou annulé avant sa désactivation.",
  "error": "Conflict"
}
13. Permissions
Permission	Action
internships.read	Afficher la liste et le détail
internships.create	Créer un stage
internships.update	Modifier le stage, le statut ou la note
internships.deactivate	Désactiver un stage
interns.read	Charger les stagiaires
departments.read	Charger les départements
supervisors.read	Charger les encadreurs
authorities.read	Charger les autorités
project-assignments.read	Charger les projets affectés


14. Composition recommandée
La page devrait contenir :
- une recherche par référence, titre ou stagiaire ;
- des filtres par statut, type, département et encadreur ;
- un bouton « Créer un stage » ;
- les colonnes Référence, Stagiaire, Titre, Type, Période, Département, Encadreur, Statut, Note et Actions ;
- un formulaire organisé en sections ;
- des actions rapides « Commencer », « Terminer », « Noter » et « Annuler » ;
- un badge coloré par statut ;
- un détail montrant l’autorité et l’indemnité ;
- une confirmation avant désactivation.

## Suivi paginé des stages

Cette API alimente une page de pilotage plus avancée que la liste simple des stages.

### Endpoint et paramètres

~~~http
GET /internships/tracking
Authorization: Bearer ACCESS_TOKEN
~~~

| Paramètre | Type | Défaut | Utilisation |
|---|---|---|---|
| q | chaîne, maximum 120 caractères | — | Recherche dans la référence, le titre, le stagiaire et les projets |
| departmentId | UUID | — | Filtre par département |
| internshipStatus | PLANNED, ONGOING, COMPLETED ou CANCELLED | — | Filtre par statut du stage |
| projectStatus | PLANNED, ONGOING, COMPLETED, CANCELLED ou ON_HOLD | — | Garde les stages affectés à un projet ayant ce statut |
| page | entier supérieur ou égal à 1 | 1 | Page demandée |
| limit | entier de 1 à 100 | 20 | Nombre de lignes par page |

Exemple Axios :

~~~ts
const response = await api.get<InternshipTrackingResponse>(
  '/internships/tracking',
  {
    params: {
      q: search || undefined,
      departmentId: selectedDepartmentId || undefined,
      internshipStatus: selectedInternshipStatus || undefined,
      projectStatus: selectedProjectStatus || undefined,
      page,
      limit: 20,
    },
  },
);
~~~

### Réponse

~~~ts
export interface InternshipTrackingResponse {
  summary: {
    ongoingInternships: number;
    plannedInternships: number;
    activeProjects: number;
  };
  items: Internship[];
  filters: {
    departments: Array<{
      id: string;
      code: string;
      name: string;
    }>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
~~~

~~~json
{
  "summary": {
    "ongoingInternships": 8,
    "plannedInternships": 3,
    "activeProjects": 5
  },
  "items": [
    {
      "id": "uuid-stage",
      "referenceCode": "STAGE-2026-001",
      "title": "Stage backend",
      "status": "ONGOING",
      "intern": {
        "id": "uuid-stagiaire",
        "registrationCode": "STG-2026-001",
        "firstName": "Amadou",
        "lastName": "Diallo"
      },
      "department": {
        "id": "uuid-departement",
        "code": "DSI",
        "name": "Direction des systèmes d’information"
      },
      "projectAssignments": [
        {
          "id": "uuid-affectation",
          "status": "IN_PROGRESS",
          "project": {
            "id": "uuid-projet",
            "projectCode": "PRJ-001",
            "name": "Portail interne",
            "status": "ONGOING"
          }
        }
      ]
    }
  ],
  "filters": {
    "departments": [
      {
        "id": "uuid-departement",
        "code": "DSI",
        "name": "Direction des systèmes d’information"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
~~~

Les indicateurs de summary sont globaux et ne changent pas avec les filtres de la liste. Les éléments de items, le total et le nombre de pages tiennent compte des filtres. Le frontend peut utiliser directement filters.departments pour le sélecteur de cette page.

## Projets

Un projet est une activité de l’entreprise, rattachée à un département. Il peut accueillir un ou plusieurs stages grâce aux affectations.

### Types et interface

~~~ts
export type ProjectStatus =
  | 'PLANNED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD';

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  description: string | null;
  gitlabLink: string | null;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  departmentId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department: DepartmentSummary;
  _count?: {
    projectAssignments: number;
  };
}
~~~

### API

~~~http
GET    /projects
GET    /projects/:id
POST   /projects
PATCH  /projects/:id
DELETE /projects/:id
~~~

La liste ne contient que les projets actifs, elle est triée par date de début décroissante et elle renvoie le département ainsi que le nombre d’affectations. Le détail renvoie aussi projectAssignments avec le stage et le stagiaire associés.

### Création

~~~json
{
  "projectCode": "PRJ-PORTAIL-001",
  "name": "Portail interne",
  "description": "Développement du portail de l’entreprise",
  "gitlabLink": "https://gitlab.example.com/equipe/portail",
  "startDate": "2026-09-01",
  "endDate": "2026-12-31",
  "status": "PLANNED",
  "departmentId": "uuid-departement"
}
~~~

| Champ | Création | Validation |
|---|---|---|
| projectCode | Obligatoire | Maximum 30 caractères, normalisé en majuscules, unique |
| name | Obligatoire | Maximum 200 caractères |
| description | Facultatif | Texte ou null |
| gitlabLink | Facultatif | URL complète HTTP/HTTPS, maximum 500 caractères, ou null |
| startDate | Obligatoire | Date ISO |
| endDate | Obligatoire | Date ISO supérieure ou égale à startDate |
| status | Facultatif | PLANNED par défaut |
| departmentId | Obligatoire | UUID d’un département actif |
| isActive | Facultatif | true par défaut |

### Modification, statuts et désactivation

PATCH envoie uniquement les champs modifiés :

~~~json
{
  "status": "ONGOING",
  "gitlabLink": "https://gitlab.example.com/equipe/portail"
}
~~~

Un projet ONGOING doit d’abord devenir COMPLETED ou CANCELLED avant sa désactivation. Le backend refuse également la désactivation tant que des affectations ASSIGNED ou IN_PROGRESS existent.

### Permissions et page frontend

| Permission | Action |
|---|---|
| projects.read | Afficher la liste et le détail |
| projects.create | Créer un projet |
| projects.update | Modifier le projet ou son statut |
| projects.deactivate | Désactiver un projet |
| departments.read | Charger le sélecteur de départements |

La page devrait proposer une recherche locale, des filtres par statut et département, un lien GitLab ouvrant un nouvel onglet avec rel=noopener noreferrer, le nombre d’affectations et des actions de changement de statut.

## Affectations de projets

Une affectation relie un stage à un projet. Elle précise le rôle confié au stagiaire et la période réelle de son travail sur ce projet.

### Types et interface

~~~ts
export type AssignmentStatus =
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REMOVED';

export interface ProjectAssignment {
  id: string;
  internshipId: string;
  projectId: string;
  role: string;
  assignedAt: string;
  startDate: string;
  endDate: string;
  status: AssignmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  internship: Internship & {
    intern: Intern;
  };
  project: Project;
}
~~~

### API

~~~http
GET    /project-assignments
GET    /project-assignments/:id
POST   /project-assignments
PATCH  /project-assignments/:id
DELETE /project-assignments/:id
~~~

GET /project-assignments exclut les affectations REMOVED et trie les résultats par date d’affectation décroissante.

### Création

~~~json
{
  "internshipId": "uuid-stage",
  "projectId": "uuid-projet",
  "role": "Développeur backend",
  "startDate": "2026-09-01",
  "endDate": "2026-11-30",
  "status": "ASSIGNED",
  "notes": "Développement des API du portail"
}
~~~

Le statut est facultatif et vaut ASSIGNED par défaut. Le rôle est obligatoire et limité à 150 caractères. Les notes sont facultatives.

### Règles métier importantes

- Le stage doit être actif et avoir le statut PLANNED ou ONGOING.
- Le projet doit être actif et avoir le statut PLANNED ou ONGOING.
- La période d’affectation doit être entièrement comprise dans la période du stage.
- La période d’affectation doit être entièrement comprise dans la période du projet.
- Un même stage ne peut être affecté qu’une fois au même projet.
- DELETE ne supprime pas la ligne : son statut devient REMOVED.

Exemples d’erreurs :

~~~json
{
  "statusCode": 409,
  "message": "Ce stage est déjà affecté à ce projet.",
  "error": "Conflict"
}
~~~

~~~json
{
  "statusCode": 400,
  "message": "La période d’affectation doit être comprise dans la période du stage.",
  "error": "Bad Request"
}
~~~

### Permissions et page frontend

| Permission | Action |
|---|---|
| project-assignments.read | Afficher les affectations |
| project-assignments.create | Affecter un stage à un projet |
| project-assignments.update | Modifier le rôle, la période ou le statut |
| project-assignments.deactivate | Retirer l’affectation |
| internships.read | Charger les stages sélectionnables |
| projects.read | Charger les projets sélectionnables |

La page peut être indépendante ou intégrée au détail d’un stage et d’un projet. Le formulaire doit filtrer les stages et projets terminés, annulés ou inactifs, puis afficher clairement les périodes autorisées.


## Connexion
La page suivante est « Connexion ». Elle doit gérer la connexion initiale, la session, le renouvellement automatique du JWT et les redirections selon le compte.
1. Endpoint de connexion
POST /auth/login
Content-Type: application/json
{
  "email": "admin@entreprise.ml",
  "password": "MotDePasse@2026!"
}
L’email est automatiquement nettoyé et transformé en minuscules.
2. Interfaces TypeScript
export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  position: {
    id: string;
    code: string;
    name: string;
  };
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
  role: string;
  permissions: string[];
  mustChangePassword: boolean;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
  user: AuthenticatedUser;
}
3. Exemple de réponse
{
  "accessToken": "JWT_ACCESS_TOKEN",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshExpiresIn": 604800,
  "user": {
    "id": "11c01e02-a593-457c-a2c3-d137ff4cb371",
    "employeeId": "35ea0722-57ef-44bc-ae99-bbed5762a307",
    "employeeNumber": "EMP-001",
    "firstName": "Administrateur",
    "lastName": "Système",
    "email": "admin@entreprise.ml",
    "jobTitle": "Administrateur système",
    "position": {
      "id": "uuid-poste",
      "code": "ADMIN_SYSTEME",
      "name": "Administrateur système"
    },

    "department": {
      "id": "uuid-departement",
      "name": "DSI",
      "code": "DSI"
    },
    "role": "ADMINISTRATEUR",
    "permissions": [
      "dashboard.read",
      "departments.read",
      "departments.create",
      "users.read"
    ],
    "mustChangePassword": false
  }
}
Le refresh token n’apparaît pas dans le JSON. Il est placé dans un cookie sécurisé HttpOnly.
4. Appel frontend
const response = await api.post<LoginResponse>(
  '/auth/login',
  {
    email,
    password,
  },
  {
    withCredentials: true,
  },
);

const { accessToken, user } = response.data;
La configuration Axios doit contenir :
export const api = axios.create({
  baseURL: 'http://IP_DU_BACKEND:3000',
  withCredentials: true,
});
5. Conservation de l’état
Conserver :
- le JWT d’accès ;
- les informations de l’utilisateur ;
- les permissions.
Le JWT d’accès est de préférence conservé en mémoire, dans un store React, Angular ou Vue.
interface AuthState {
  accessToken: string | null;
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
}
Éviter de conserver le refresh token dans localStorage. Le cookie HttpOnly est géré automatiquement par le navigateur.
6. Ajouter le JWT aux requêtes
api.interceptors.request.use((config) => {
  const accessToken = authStore.getState().accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});
L’en-tête envoyé sera :
Authorization: Bearer JWT_ACCESS_TOKEN
7. Redirection après connexion
if (response.data.user.mustChangePassword) {
  navigate('/changer-mot-de-passe');
} else {
  navigate('/tableau-de-bord');
}
Logique complète :
Connexion réussie
       ↓
mustChangePassword ?
   ├─ true  → Page de changement de mot de passe
   └─ false → Tableau de bord
Lorsque mustChangePassword=true, les autres pages protégées sont bloquées par le backend.
8. Renouvellement automatique
Lorsque le JWT expire, le backend retourne :
{
  "statusCode": 401,
  "code": "ACCESS_TOKEN_EXPIRED",
  "message": "Le jeton d’accès a expiré."
}
Le frontend doit appeler :
POST /auth/refresh
Content-Type: application/json
{}
Avec Axios :
const response = await api.post<{
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
}>('/auth/refresh', {});
Puis :
1. remplacer le JWT ;
2. rejouer la requête initiale ;
3. ne pas rediriger l’utilisateur vers la connexion.
9. Éviter plusieurs refresh simultanés
Plusieurs appels ne doivent pas renouveler la session en même temps.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh', {})
      .then((response) => {
        const token = response.data.accessToken;
        authStore.getState().setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
Un seul refresh doit être exécuté, même si plusieurs requêtes échouent simultanément.
10. Restauration après actualisation
Si le JWT est conservé uniquement en mémoire, il disparaît lors d’un rechargement de page. Le frontend doit alors essayer :
POST /auth/refresh
Au démarrage de l’application :
async function initializeAuth() {
  try {
    const response = await api.post('/auth/refresh', {});

    authStore.getState().setAccessToken(
      response.data.accessToken,
    );

    const profile = await api.get('/auth/me');
    authStore.getState().setUser(profile.data);
  } catch {
    authStore.getState().clearAuth();
  }
}
Pendant cette opération, afficher un écran de chargement afin d’éviter de rediriger trop tôt vers /login.
11. Déconnexion
POST /auth/logout
Content-Type: application/json
{}
Puis :
try {
  await api.post('/auth/logout', {});
} finally {
  authStore.getState().clearAuth();
  navigate('/login');
}
La session est immédiatement révoquée. Même l’ancien JWT devient inutilisable.
12. Erreurs de connexion
Email ou mot de passe incorrect
{
  "statusCode": 401,
  "message": "Email ou mot de passe incorrect.",
  "error": "Unauthorized"
}
Le même message est utilisé lorsque :
- l’email n’existe pas ;
- le mot de passe est incorrect ;
- le compte est désactivé ;
- l’employé est désactivé ;
- le rôle est désactivé.
Cela empêche de révéler quels comptes existent.
Email invalide
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
Le mot de passe de connexion doit contenir entre 8 et 128 caractères. Les nouveaux comptes utilisent toutefois un minimum de 15 caractères lors de leur création.
13. Erreurs de session
Code	Réaction
ACCESS_TOKEN_EXPIRED	Faire un refresh silencieux
REFRESH_TOKEN_INVALID_OR_EXPIRED	Retourner à /login
TOKEN_REVOKED	Retourner à /login
ACCESS_TOKEN_INVALID	Retourner à /login
ACCOUNT_UNAVAILABLE	Retourner à /login
PASSWORD_CHANGE_REQUIRED	Aller à /changer-mot-de-passe


Ne pas déclencher de refresh en boucle pour toutes les erreurs 401. Seul ACCESS_TOKEN_EXPIRED doit lancer le renouvellement.
14. Affichage du menu
Le menu doit dépendre des permissions :
const canSeeDashboard =
  user.permissions.includes('dashboard.read');

const canSeeDepartments =
  user.permissions.includes('departments.read');

const canSeeUsers =
  user.permissions.includes('users.read');
Le rôle peut être affiché sous le nom :
Administrateur Système
ADMINISTRATEUR
Mais les autorisations doivent être calculées avec permissions, pas seulement avec le nom du rôle.
15. Composition recommandée
La page devrait contenir :
- le logo Orange Mali ;
- le titre « Gestion des stagiaires » ;
- un champ email ;
- un champ mot de passe ;
- un bouton afficher/masquer le mot de passe ;
- un bouton « Se connecter » ;
- un indicateur de chargement ;
- un message d’erreur général ;
- éventuellement un avertissement concernant les majuscules du clavier.
Il n’existe pas encore de fonction autonome « Mot de passe oublié ». La réinitialisation doit être effectuée par un administrateur depuis la page Utilisateurs.
16. Frontend sur un autre PC
L’origine exacte du frontend doit être dans le .env du backend :
FRONTEND_ORIGINS=http://IP_DU_FRONTEND:4200
En développement HTTP sur deux PC, utiliser de préférence un proxy frontend. En production, utiliser HTTPS avec :
AUTH_COOKIE_SAME_SITE=none
AUTH_COOKIE_SECURE=true

## changement de mot de passe
La page suivante est « Changement de mot de passe ». Elle sert dans deux situations :
1. changement obligatoire après la première connexion ;
2. changement volontaire depuis le menu du profil.
1. Endpoint
PATCH /auth/change-password
Authorization: Bearer JWT_ACTUEL
Content-Type: application/json
Cette route reste accessible même lorsque mustChangePassword=true.
2. Interface TypeScript
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
  mustChangePassword: false;
  requiresLogin: true;
}
3. Requête
{
  "currentPassword": "MotDePasseTemporaire@2026!",
  "newPassword": "NouveauMotDePasse@2026!",
  "confirmNewPassword": "NouveauMotDePasse@2026!"
}
Avec Axios :
const response = await api.patch<ChangePasswordResponse>(
  '/auth/change-password',
  {
    currentPassword,
    newPassword,
    confirmNewPassword,
  },
);
Le JWT est automatiquement ajouté par l’intercepteur Axios.
4. Réponse réussie
{
  "message": "Mot de passe modifié avec succès.",
  "mustChangePassword": false,
  "requiresLogin": true
}
requiresLogin=true signifie que l’utilisateur doit obligatoirement retourner à la page de connexion.
Toutes ses sessions sont immédiatement révoquées :
- JWT actuel ;
- JWT des autres navigateurs ;
- sessions sur les autres ordinateurs ;
- refresh tokens.
5. Traitement frontend après réussite
async function handlePasswordChange(
  values: ChangePasswordInput,
) {
  await api.patch('/auth/change-password', values);

  try {
    // Permet aussi de supprimer le cookie HttpOnly du navigateur.
    await api.post('/auth/logout', {});
  } catch {
    // La session est déjà révoquée par le changement de mot de passe.
  } finally {
    authStore.getState().clearAuth();
    navigate('/login', {
      state: {
        message:
          'Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.',
      },
    });
  }
}
Le frontend ne doit pas tenter de renouveler le JWT après cette réponse.
6. Règles de validation
Champ	Validation
currentPassword	Obligatoire, maximum 128 caractères
newPassword	Entre 15 et 128 caractères
confirmNewPassword	Entre 15 et 128 caractères
Confirmation	Doit être identique au nouveau mot de passe
Nouveau mot de passe	Doit être différent du mot de passe actuel


Validation frontend :
function validatePasswordForm(
  values: ChangePasswordInput,
): string | null {
  if (!values.currentPassword) {
    return 'Le mot de passe actuel est obligatoire.';
  }

  if (values.newPassword.length < 15) {
    return 'Le nouveau mot de passe doit contenir au moins 15 caractères.';
  }

  if (values.newPassword.length > 128) {
    return 'Le nouveau mot de passe ne doit pas dépasser 128 caractères.';
  }

  if (values.newPassword !== values.confirmNewPassword) {
    return 'La confirmation ne correspond pas.';
  }

  if (values.newPassword === values.currentPassword) {
    return 'Le nouveau mot de passe doit être différent de l’ancien.';
  }

  return null;
}
7. Erreurs possibles
Mot de passe actuel incorrect
{
  "statusCode": 401,
  "message": "Le mot de passe actuel est incorrect.",
  "error": "Unauthorized"
}
Confirmation incorrecte
{
  "statusCode": 400,
  "message": "La confirmation du nouveau mot de passe ne correspond pas.",
  "error": "Bad Request"
}
Nouveau mot de passe identique
{
  "statusCode": 400,
  "message": "Le nouveau mot de passe doit être différent de l’ancien.",
  "error": "Bad Request"
}
Mot de passe trop court
{
  "statusCode": 400,
  "message": [
    "newPassword must be longer than or equal to 15 characters"
  ],
  "error": "Bad Request"
}
Session déjà révoquée
{
  "statusCode": 401,
  "code": "TOKEN_REVOKED",
  "message": "Votre session a expiré ou a été révoquée. Reconnectez-vous."
}
8. Redirection obligatoire
Après la connexion :
if (loginResponse.user.mustChangePassword) {
  navigate('/changer-mot-de-passe', {
    replace: true,
  });
} else {
  navigate('/tableau-de-bord', {
    replace: true,
  });
}
L’utilisateur ne doit pas pouvoir revenir au tableau de bord avec le bouton précédent du navigateur.
9. Protection des autres routes
Si l’utilisateur tente d’accéder à une autre page avant le changement :
{
  "statusCode": 403,
  "code": "PASSWORD_CHANGE_REQUIRED",
  "message": "Vous devez modifier votre mot de passe avant de continuer."
}
L’intercepteur doit rediriger :
if (
  error.response?.status === 403 &&
  error.response?.data?.code ===
    'PASSWORD_CHANGE_REQUIRED'
) {
  navigate('/changer-mot-de-passe', {
    replace: true,
  });
}
Les seules routes protégées accessibles pendant ce blocage sont :
GET /auth/me
PATCH /auth/change-password
10. Changement volontaire
Depuis le menu du profil, l’utilisateur peut ouvrir la même page.
La différence est uniquement le titre :
const pageTitle = user.mustChangePassword
  ? 'Créez votre nouveau mot de passe'
  : 'Changer mon mot de passe';
Dans les deux cas, une reconnexion est obligatoire après réussite.
11. Composition recommandée
La page devrait contenir :
- le titre adapté au contexte ;
- une explication lorsque le changement est obligatoire ;
- le champ « Mot de passe actuel » ;
- le champ « Nouveau mot de passe » ;
- le champ « Confirmer le nouveau mot de passe » ;
- un bouton afficher/masquer pour chaque mot de passe ;
- un compteur de caractères ;
- une indication « minimum 15 caractères » ;
- un bouton « Enregistrer le nouveau mot de passe » ;
- un message précisant qu’une reconnexion sera obligatoire.
Ne jamais afficher les mots de passe dans les logs, les messages techniques ou le stockage permanent du navigateur.

## Mon profil
La page suivante est « Mon profil » ou le menu utilisateur. Elle permet d’afficher l’identité de la personne connectée, ses permissions, son rôle et les actions de sécurité.
1. Endpoint du profil
GET /auth/me
Authorization: Bearer JWT
Cette route est accessible même lorsque mustChangePassword=true.
2. Interface TypeScript
export interface CurrentUserProfile {
  id: string;
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string;
  position: {
    id: string;
    code: string;
    name: string;
  };
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
  role: string;
  permissions: string[];
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}
3. Exemple de réponse
{
  "id": "11c01e02-a593-457c-a2c3-d137ff4cb371",
  "employeeId": "35ea0722-57ef-44bc-ae99-bbed5762a307",
  "employeeNumber": "EMP-001",
  "firstName": "Administrateur",
  "lastName": "Système",
  "email": "admin@entreprise.ml",
  "phone": "+22370000000",
  "jobTitle": "Administrateur système",
  "position": {
    "id": "uuid-poste",
    "code": "ADMIN_SYSTEME",
    "name": "Administrateur système"
  },

  "department": {
    "id": "5f5cb995-d8aa-4575-b873-135b898c5356",
    "name": "DSI Plateau Aile Gauche",
    "code": "DSI-PAG"
  },
  "role": "ADMINISTRATEUR",
  "permissions": [
    "dashboard.read",
    "departments.read",
    "departments.create",
    "users.read"
  ],
  "mustChangePassword": false,
  "lastLoginAt": "2026-08-23T08:30:00.000Z"
}
4. Chargement du profil
const response = await api.get<CurrentUserProfile>(
  '/auth/me',
);

authStore.getState().setUser(response.data);
Le profil doit être chargé :
- au démarrage après un refresh réussi ;
- après une nouvelle connexion ;
- éventuellement après une modification du rôle ou des permissions.
5. Affichage dans l’en-tête
const initials =
  `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    .toUpperCase();
Exemple :
AS
Administrateur Système
ADMINISTRATEUR
Le menu déroulant peut contenir :
- Mon profil ;
- Changer mon mot de passe ;
- Se déconnecter.
6. Page complète du profil
Informations recommandées :
Informations personnelles
- Nom complet
- Matricule
- Email
- Téléphone

Informations professionnelles
- Poste
- Département
- Rôle

Sécurité
- Dernière connexion
- Changement de mot de passe requis
- Bouton « Changer mon mot de passe »
Les permissions peuvent être affichées dans une section réservée aux administrateurs ou dans un panneau de diagnostic.
7. Changer le mot de passe
Le bouton redirige vers :
/changer-mot-de-passe
La page utilise :
PATCH /auth/change-password
Après réussite, une nouvelle connexion est obligatoire.
8. Déconnexion
POST /auth/logout
Content-Type: application/json
{}
Implémentation :
async function logout() {
  try {
    await api.post('/auth/logout', {});
  } finally {
    authStore.getState().clearAuth();

    navigate('/login', {
      replace: true,
    });
  }
}
Réponse :
{
  "message": "Déconnexion effectuée avec succès."
}
Après la déconnexion :
- la session est révoquée dans MySQL ;
- le cookie est supprimé ;
- l’ancien JWT devient inutilisable ;
- le frontend supprime l’utilisateur et le JWT de son store.
9. Mise à jour du profil
Il n’existe pas encore d’endpoint permettant à l’utilisateur de modifier lui-même :
- son email ;
- son téléphone ;
- son nom ;
- son poste ;
- son département ;
- sa photo.
Ces informations sont gérées administrativement par :
PATCH /employees/:employeeId
Le bouton « Modifier mon profil » ne doit donc pas encore être affiché.
10. Avatar
Le backend ne gère pas encore les photos de profil. Le frontend doit utiliser les initiales :
function getInitials(
  firstName: string,
  lastName: string,
): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`
    .toUpperCase();
}
11. Permissions et menu
Le profil permet de construire dynamiquement le menu :
function hasPermission(code: string): boolean {
  return user.permissions.includes(code);
}
Exemple :
const menuItems = [
  {
    label: 'Tableau de bord',
    path: '/dashboard',
    permission: 'dashboard.read',
  },
  {
    label: 'Départements',
    path: '/departments',
    permission: 'departments.read',
  },
  {
    label: 'Utilisateurs',
    path: '/users',
    permission: 'users.read',
  },
].filter(
  (item) =>
    !item.permission ||
    hasPermission(item.permission),
);
12. Gestion des erreurs
Session révoquée
{
  "statusCode": 401,
  "code": "TOKEN_REVOKED",
  "message": "Votre session a expiré ou a été révoquée. Reconnectez-vous."
}
Compte indisponible
{
  "statusCode": 401,
  "code": "ACCOUNT_UNAVAILABLE",
  "message": "Compte utilisateur introuvable, désactivé ou indisponible."
}
Dans ces cas :
authStore.getState().clearAuth();
navigate('/login', { replace: true });
13. Permissions nécessaires
GET /auth/me, PATCH /auth/change-password et POST /auth/logout ne nécessitent aucune permission métier particulière.
Elles nécessitent seulement une session valide, sauf logout qui utilise le refresh token du cookie.
Avec cette page, toutes les pages métier et d’authentification principales ont maintenant été expliquées. Il reste éventuellement les pages techniques d’interface :
- Accès interdit 403 ;
- Page introuvable 404 ;
- Session expirée ;
- Erreur serveur ;
- États vides et écrans de chargement.