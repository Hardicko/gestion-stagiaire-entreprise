# Contrat d’intégration frontend

Ce document est le point d’entrée de l’équipe frontend. Il décrit l’adresse de l’API, l’authentification, les pages, les endpoints, les principaux corps JSON, les réponses et les permissions.

Les détails métier complémentaires sont disponibles dans [Guide backend](GUIDE_BACKEND.md), [Rôles et permissions](ROLES_PERMISSIONS.md) et [Sessions JWT](SESSIONS_JWT.md).

## 1. Adresses

En local sur le PC du backend :

```text
API       : http://localhost:3000
Swagger   : http://localhost:3000/api/docs
OpenAPI   : http://localhost:3000/api/docs-json
```

Depuis un autre PC, remplacer `localhost` par l’adresse IP du PC qui exécute NestJS. L’adresse `10.172.1.202:6446` est celle de MySQL, pas nécessairement celle de l’API.

L’origine exacte du frontend doit être déclarée dans le backend :

```env
FRONTEND_ORIGINS=http://IP_DU_FRONTEND:4200
```

## 2. Client HTTP

```typescript
const api = axios.create({
  baseURL: 'http://IP_DU_BACKEND:3000',
  withCredentials: true,
});
```

Le JWT d’accès est envoyé sur les routes protégées :

```http
Authorization: Bearer ACCESS_TOKEN
```

Le refresh token reste dans un cookie `HttpOnly`. Le JavaScript du frontend ne doit pas essayer de le lire.

## 3. Authentification

| Méthode | Endpoint                | Corps                          | Résultat                          |
| ------- | ----------------------- | ------------------------------ | --------------------------------- |
| POST    | `/auth/login`           | `{ email, password }`          | JWT, durée et utilisateur         |
| POST    | `/auth/refresh`         | `{}`                           | Nouveau JWT                       |
| POST    | `/auth/logout`          | `{}`                           | Révocation immédiate              |
| GET     | `/auth/me`              | Aucun                          | Profil et permissions             |
| PATCH   | `/auth/change-password` | Mot de passe actuel et nouveau | Révocation de toutes les sessions |

La connexion retourne notamment :

```json
{
  "accessToken": "JWT",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshExpiresIn": 604800,
  "user": {
    "id": "UUID",
    "employeeId": "UUID",
    "firstName": "Awa",
    "lastName": "Traoré",
    "email": "awa@entreprise.ml",
    "jobTitle": "Développeur backend",
    "position": {
      "id": "UUID_DU_POSTE",
      "code": "DEV_BACKEND",
      "name": "Développeur backend"
    },
    "department": {
      "id": "UUID_DU_DEPARTEMENT",
      "code": "DSI",
      "name": "Direction des systèmes d’information"
    },
    "role": "ADMINISTRATEUR",
    "permissions": ["dashboard.read"],
    "mustChangePassword": false
  }
}
```

`jobTitle` est conservé dans les réponses Auth pour la compatibilité avec les premiers écrans frontend ; sa valeur est calculée depuis `position.name`. Les nouveaux écrans doivent utiliser l’objet `position`.

Si `mustChangePassword=true`, rediriger vers `/changer-mot-de-passe`. Après un changement réussi, supprimer l’état local et retourner à la connexion.

Seul `ACCESS_TOKEN_EXPIRED` déclenche `POST /auth/refresh`. Les codes `TOKEN_REVOKED`, `ACCESS_TOKEN_INVALID`, `REFRESH_TOKEN_INVALID_OR_EXPIRED` et `ACCOUNT_UNAVAILABLE` imposent une nouvelle connexion.

## 4. Forme générale des CRUD

Pour la majorité des domaines :

| Action     | Méthode                | Réponse                 |
| ---------- | ---------------------- | ----------------------- |
| Lister     | GET `/resource`        | Tableau JSON            |
| Consulter  | GET `/resource/:id`    | Objet JSON              |
| Créer      | POST `/resource`       | Objet créé              |
| Modifier   | PATCH `/resource/:id`  | Objet modifié           |
| Désactiver | DELETE `/resource/:id` | Objet avec état inactif |

Les suppressions sont logiques. Les listes métier retournent généralement uniquement les éléments actifs. La liste `/users` retourne aussi les comptes désactivés pour permettre leur réactivation.

Les dates sont des chaînes ISO, par exemple `2026-08-23T10:00:00.000Z`.

## 5. Contrats par page

### Tableau de bord

`GET /dashboard` retourne :

- `generatedAt` ;
- `summary` avec les compteurs ;
- `statusBreakdown` pour les stages et projets ;
- `recentInterns` ;
- `internshipTracking` ;
- `recentActivities`.

Permission : `dashboard.read`.

### Départements

Base : `/departments`.

Création :

```json
{
  "code": "DSI-PAG",
  "name": "DSI Plateau Aile Gauche",
  "description": "Département informatique"
}
```

Le code est converti en majuscules. Le nom et le code sont uniques.

Permissions : `departments.read`, `departments.create`, `departments.update`, `departments.deactivate`.

### Postes

Base : `/positions`.

Cette page administre le catalogue des fonctions professionnelles disponibles dans l’entreprise.

Routes :

| Méthode | Endpoint         | Utilisation                                    |
| ------- | ---------------- | ---------------------------------------------- |
| GET     | `/positions`     | Liste les postes actifs par ordre alphabétique |
| GET     | `/positions/:id` | Consulte un poste                              |
| POST    | `/positions`     | Ajoute un poste                                |
| PATCH   | `/positions/:id` | Modifie ou réactive un poste                   |
| DELETE  | `/positions/:id` | Désactive un poste                             |

Corps de création :

```json
{
  "code": "DEV_MOBILE",
  "name": "Développeur mobile",
  "description": "Développement des applications mobiles"
}
```

Le code est normalisé en majuscules. Le code et le nom sont uniques. Chaque réponse contient `_count.employees`, qui représente le nombre d’employés actifs affectés au poste.

Un poste ne peut pas être désactivé tant qu’il est attribué à au moins un employé actif. Le frontend doit demander une confirmation avant `DELETE` et afficher le message métier retourné en cas de conflit `409`.

Les postes créés initialement par la migration sont :

- Développeur backend ;
- Développeur frontend ;
- Administrateur système ;
- Responsable RH ;
- Chef de projet ;
- Responsable réseau ;
- Assistant administratif.

Pour le formulaire employé, charger `GET /positions`, afficher `name` dans une liste déroulante et envoyer la valeur `id` dans `positionId`.

Permissions : `positions.read`, `positions.create`, `positions.update`, `positions.deactivate`.

### Employés

Base : `/employees`.

```json
{
  "employeeNumber": "EMP-001",
  "firstName": "Moussa",
  "lastName": "Traoré",
  "email": "moussa@entreprise.ml",
  "phone": "+22370000000",
  "positionId": "UUID_DU_POSTE",
  "departmentId": "UUID"
}
```

Le poste et le département sélectionnés doivent être actifs. La réponse inclut les objets `position` et `department`. La désactivation d’un employé révoque immédiatement les sessions de son éventuel compte utilisateur.

Permissions : `employees.read`, `employees.create`, `employees.update`, `employees.deactivate`.

### Encadreurs

Base : `/supervisors`.

```json
{
  "employeeId": "UUID"
}
```

Un encadreur est un profil lié à un employé actif. La réponse inclut `employee` et son département. Un encadreur avec un stage planifié ou en cours ne peut pas être désactivé.

Permissions : `supervisors.read`, `supervisors.create`, `supervisors.update`, `supervisors.deactivate`.

### Autorités

Base : `/authorities`.

```json
{
  "employeeId": "UUID",
  "departmentId": "UUID",
  "name": "Directeur DSI",
  "email": "direction@entreprise.ml",
  "signingTitle": "Directeur des Systèmes d’Information"
}
```

`departmentId` peut être `null`. Une autorité liée à un stage planifié ou en cours ne peut pas être désactivée.

Permissions : `authorities.read`, `authorities.create`, `authorities.update`, `authorities.deactivate`.

### Stagiaires

Base : `/interns`.

Champs principaux : `registrationCode`, `firstName`, `lastName`, `dateOfBirth`, `gender`, `email`, `phone`, `address`, `school`, `fieldOfStudy`, `educationLevel`, `studyYear` et contact d’urgence.

Valeurs :

- genre : `MALE`, `FEMALE` ;
- niveau : `LICENCE`, `MASTER` ;
- année : entier de 1 à 10.

Un stagiaire avec un stage planifié ou en cours ne peut pas être désactivé.

Permissions : `interns.read`, `interns.create`, `interns.update`, `interns.deactivate`.

### Stages

Base : `/internships`.

Champs principaux : référence, titre, dates, statut, type, indemnité, devise, lieu, stagiaire, département, encadreur, autorité facultative et note.

Valeurs :

- type : `ACADEMIC`, `PROFESSIONAL` ;
- statut : `PLANNED`, `ONGOING`, `COMPLETED`, `CANCELLED` ;
- note : entier de 0 à 20 ou `null` ;
- devise : trois lettres, `XOF` par défaut.

Un stagiaire ne peut pas avoir deux stages non annulés qui se chevauchent. Un stage en cours ou possédant une affectation active ne peut pas être désactivé.

Permissions : `internships.read`, `internships.create`, `internships.update`, `internships.deactivate`.

### Projets

Base : `/projects`.

Corps de `POST /projects` :

```json
{
  "name": "Gestion des stagiaires",
  "description": "Application interne",
  "gitlabLink": "https://gitlab.entreprise.ml/projet",
  "startDate": "2026-08-01",
  "endDate": "2026-12-31",
  "status": "PLANNED",
  "departmentId": "UUID"
}
```

Le frontend n’envoie jamais `projectCode`. Le backend le génère au format `PRJ-AAAA-NNNN` avec un compteur annuel transactionnel, vérifie que le candidat est libre et passe au numéro suivant s’il existe déjà. La réponse `201` contient le code généré. Ce code reste visible mais ne peut jamais être modifié ; l’envoyer dans un POST ou un PATCH provoque une réponse `400`.

La colonne `projects.project_code` reste protégée par une contrainte `UNIQUE`.

Statuts : `PLANNED`, `ONGOING`, `COMPLETED`, `CANCELLED`, `ON_HOLD`. La liste inclut `_count.projectAssignments`.

Permissions : `projects.read`, `projects.create`, `projects.update`, `projects.deactivate`.

### Affectations

Base : `/project-assignments`.

```json
{
  "internshipId": "UUID",
  "projectId": "UUID",
  "role": "Développeur backend",
  "startDate": "2026-08-15",
  "endDate": "2026-12-15",
  "status": "ASSIGNED",
  "notes": "Développement des API"
}
```

Statuts : `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `REMOVED`. La période doit être comprise dans celles du stage et du projet.

Permissions : `project-assignments.read`, `project-assignments.create`, `project-assignments.update`, `project-assignments.deactivate`.

### Utilisateurs

Base : `/users`.

Création :

```json
{
  "employeeId": "UUID",
  "roleId": "UUID",
  "password": "MotDePasseTemporaireLong",
  "confirmPassword": "MotDePasseTemporaireLong",
  "mustChangePassword": true
}
```

Le mot de passe contient entre 15 et 128 caractères. Un employé ne possède qu’un compte. Les mots de passe et leurs hash ne sont jamais renvoyés.

Actions particulières :

- `PATCH /users/:id/reset-password` ;
- `PATCH /users/:id` pour rôle ou état ;
- `DELETE /users/:id` pour désactiver.

La désactivation et la réinitialisation révoquent toutes les sessions. Le dernier administrateur actif est protégé.

### Rôles et permissions

Endpoints :

- `GET /roles` ;
- `POST /roles` ;
- `PATCH /roles/:id` ;
- `DELETE /roles/:id` ;
- `GET /permissions` ;
- `PUT /roles/:id/permissions`.

Le corps du `PUT` contient la liste complète des permissions cochées :

```json
{
  "permissionIds": ["UUID-1", "UUID-2"]
}
```

Cette liste remplace entièrement l’ancienne. Le rôle `ADMINISTRATEUR` conserve obligatoirement toutes les permissions actives.

### Journal d’audit

`GET /audit-logs` retourne :

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Filtres : `page`, `limit`, `action`, `outcome`, `resource`, `userId`, `dateFrom`, `dateTo`.

Actions : `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `PASSWORD_CHANGE`, `PASSWORD_RESET`.

Résultats : `SUCCESS`, `FAILURE`.

Permission : `audit-logs.read`.

## 6. Permissions dans l’interface

Le frontend masque les pages et boutons selon `user.permissions` :

```typescript
const canCreate = user.permissions.includes('departments.create');
```

Ce masquage améliore l’expérience, mais le backend reste l’autorité de sécurité. Une réponse `403` doit afficher un écran « Accès interdit ».

## 7. Erreurs

Forme NestJS classique :

```json
{
  "statusCode": 409,
  "message": "La ressource existe déjà.",
  "error": "Conflict"
}
```

Une validation peut retourner un tableau dans `message`. Le frontend doit accepter `string | string[]`.

Codes de session importants :

| Statut | Code                               | Réaction                           |
| ------ | ---------------------------------- | ---------------------------------- |
| 401    | `ACCESS_TOKEN_EXPIRED`             | Refresh silencieux puis rejeu      |
| 401    | `TOKEN_REVOKED`                    | Connexion obligatoire              |
| 401    | `ACCESS_TOKEN_INVALID`             | Connexion obligatoire              |
| 401    | `REFRESH_TOKEN_INVALID_OR_EXPIRED` | Connexion obligatoire              |
| 401    | `ACCOUNT_UNAVAILABLE`              | Connexion obligatoire              |
| 403    | `PASSWORD_CHANGE_REQUIRED`         | Page de changement de mot de passe |

## 8. Pages techniques

Prévoir :

- chargement initial de la session ;
- accès interdit `403` ;
- page introuvable `404` ;
- erreur serveur `500` ;
- session expirée ou révoquée ;
- états de chargement et listes vides ;
- confirmations avant désactivation.

## 9. Checklist d’intégration

- `withCredentials=true` sur le client HTTP ;
- JWT Bearer sur les routes protégées ;
- un seul refresh simultané ;
- pas de refresh token dans `localStorage` ;
- redirection forcée si `mustChangePassword=true` ;
- menus et boutons filtrés par permission ;
- dates envoyées en ISO ;
- UUID du profil encadreur, pas celui de son employé ;
- rechargement des listes après les mutations ;
- tests réalisés avec Swagger ou Postman avant branchement de chaque page.
