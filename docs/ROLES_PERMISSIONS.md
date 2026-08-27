# Rôles et permissions

Ce document décrit le contrôle d’accès du backend. Il complète le [guide général](GUIDE_BACKEND.md).

## 1. Les quatre notions à distinguer

- **Employee** : la personne employée par l’entreprise et ses informations professionnelles.
- **User** : le compte qui permet à un employé de se connecter.
- **Role** : un ensemble de droits attribué à un ou plusieurs comptes.
- **Permission** : une action précise autorisée par l’API, par exemple `projects.read` ou `users.create`.

Le poste professionnel `Employee.position` n’accorde aucun accès. Les accès proviennent uniquement de `User.roleId`, puis des permissions associées à ce rôle.

## 2. Fonctionnement d’une requête protégée

1. Le frontend envoie le JWT dans `Authorization: Bearer <token>`.
2. `JwtAuthGuard` vérifie le JWT, puis recharge le compte, le rôle et les permissions actives depuis MySQL.
3. `PermissionsGuard` compare les permissions du rôle à celle exigée par la route.
4. La route est exécutée si le droit est présent.
5. Sinon, l’API répond `403` avec le code `MISSING_PERMISSION`.

Les permissions sont relues en base à chaque requête protégée. Une modification des droits prend donc effet immédiatement, sans attendre l’expiration du JWT.

## 3. Format des codes

Les codes sont stables et suivent généralement `ressource.action` :

- `departments.read`
- `interns.create`
- `internships.update`
- `projects.deactivate`
- `roles.permissions.manage`
- `users.reset-password`

Le frontend peut utiliser ces codes pour afficher ou masquer ses menus et boutons. Le backend reste cependant la source de vérité.

## 4. Rôles initiaux

| Rôle             | Accès initial                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `ADMINISTRATEUR` | Toutes les permissions actives.                                                              |
| `RH`             | Consultation métier, gestion des employés, stagiaires, encadreurs, autorités et stages.      |
| `ENCADREUR`      | Consultation des données métier nécessaires au suivi.                                        |
| `DIRECTION`      | Consultation métier, employés, tableau de bord et journal d’audit.                           |
| `UTILISATEUR`    | Consultation standard des départements, stagiaires, stages, projets et ressources associées. |

Cette matrice est initiale. L’administrateur peut créer d’autres rôles et modifier leurs permissions. Le rôle `ADMINISTRATEUR` est protégé : il ne peut pas être renommé, désactivé ou privé d’une permission active.

Le rôle `ENCADREUR` donne actuellement un accès de consultation. Le filtrage « uniquement mes stagiaires » et une permission dédiée à la notation constituent un prochain lot fonctionnel.

## 5. Routes d’administration

- `GET /permissions` : catalogue actif ;
- `GET /permissions/:id` : détail d’une permission ;
- `GET /roles` : rôles actifs avec leurs permissions ;
- `POST /roles` : créer un rôle sans permission ;
- `PUT /roles/:id/permissions` : remplacer les permissions du rôle ;
- `PATCH /roles/:id` : modifier un rôle ;
- `DELETE /roles/:id` : désactiver un rôle inutilisé ;
- `PATCH /users/:id` : attribuer un rôle actif à un compte.

Exemple pour attribuer deux permissions :

```json
{
  "permissionIds": [
    "UUID_DE_LA_PERMISSION_PROJECTS_READ",
    "UUID_DE_LA_PERMISSION_INTERNSHIPS_READ"
  ]
}
```

Le tableau `permissionIds` peut être vide pour un rôle personnalisé. Un rôle vide permet la connexion, mais aucune route métier protégée.

## 6. Réponse utilisée par le frontend

`POST /auth/login` et `GET /auth/me` retournent notamment :

```json
{
  "role": "RH",
  "permissions": ["dashboard.read", "employees.read", "interns.create"]
}
```

Après une modification de permissions, le frontend peut rappeler `GET /auth/me` pour actualiser immédiatement son interface.

## 7. Règles de sécurité

- Seuls les rôles actifs peuvent être attribués.
- Un rôle utilisé par un compte actif ne peut pas être désactivé.
- Le dernier administrateur actif reste protégé.
- Les permissions inactives ou inexistantes sont refusées.
- Les permissions ne sont pas stockées dans le JWT ; elles sont relues depuis MySQL.
- Les changements sont enregistrés par le journal d’audit des requêtes.

## 8. Installation sur le PC de l’entreprise

Après le `git pull` :

```powershell
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
npm test -- --runInBand
```

La migration `3_add_roles_and_permissions` crée `permissions` et `role_permissions`, ajoute les rôles initiaux manquants et attribue les droits de base. Elle ne supprime aucune donnée existante.

Il ne faut pas recopier les tables manuellement ni utiliser `prisma db push` sur la base d’entreprise pour ce lot.
