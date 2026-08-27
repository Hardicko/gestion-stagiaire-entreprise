# Gestion des stagiaires — backend entreprise

API NestJS connectée à MySQL avec Prisma. Elle gère l’authentification, les employés, les stagiaires, les stages, les projets, le tableau de bord et les ressources administratives associées.

Le document [Contrat d’intégration frontend](docs/CONTRAT_FRONTEND.md) rassemble les endpoints, réponses, permissions et règles nécessaires à chaque page. Le [Guide fonctionnel et technique du backend](docs/GUIDE_BACKEND.md) explique chaque domaine, ses routes, ses relations et les termes qui peuvent être confondus. Le document [Rôles et permissions](docs/ROLES_PERMISSIONS.md) décrit le contrôle d’accès dynamique. Le guide [Sessions JWT](docs/SESSIONS_JWT.md) explique le renouvellement automatique, la déconnexion immédiate et l’intégration frontend/Postman.

## Installation

```powershell
npm install
Copy-Item .env.example .env
npx prisma generate
npx prisma migrate deploy
```

Renseignez ensuite le mot de passe MySQL et un `JWT_SECRET` long et aléatoire dans `.env`. Les durées par défaut sont de 15 minutes pour le JWT d’accès et de 7 jours pour le refresh token.

## Démarrage

```powershell
npm run start:dev
```

Par défaut, l’API écoute sur `http://localhost:3000`.

## Documentation de l’API

- Interface Swagger     : `http://localhost:3000/api/docs`
- Contrat OpenAPI JSON  : `http://localhost:3000/api/docs-json`

Pour tester une route protégée dans Swagger :

1. exécutez `POST /auth/login` ;
2. copiez la valeur `accessToken` retournée ;
3. cliquez sur **Authorize** ;
4. collez uniquement le JWT, sans ajouter le mot `Bearer`.

Chaque route protégée exige maintenant une permission précise. Les réponses de connexion et de profil retournent le rôle et les codes de permissions destinés au frontend.

La connexion crée également une session MySQL. `POST /auth/refresh` renouvelle le JWT et `POST /auth/logout` révoque immédiatement la session. Postman conserve automatiquement le cookie de refresh lorsque son gestionnaire de cookies est actif.

## Journal d’audit

Les requêtes de modification `POST`, `PUT`, `PATCH` et `DELETE` sont journalisées automatiquement. Chaque événement indique notamment l’auteur, l’action, la ressource, le résultat, la date, l’adresse IP et des métadonnées nettoyées. Les mots de passe, jetons et en-têtes d’autorisation ne sont jamais conservés dans les métadonnées.

Le journal est en lecture seule dans l’API et exige la permission `audit-logs.read` :

- `GET /audit-logs`     : liste paginée, filtrable par action, résultat, ressource, utilisateur et période ;
- `GET /audit-logs/:id` : détail d’un événement.

Le tableau de bord utilise les événements réussis de ce journal pour fournir ses activités récentes.

## Principales ressources

| Domaine                 | Route                  |
| ----------------------- | ---------------------- |
| Authentification        | `/auth`                |
| Utilisateurs            | `/users`               |
| Rôles                   | `/roles`               |
| Permissions             | `/permissions`         |
| Départements            | `/departments`         |
| Postes                  | `/positions`           |
| Employés                | `/employees`           |
| Stagiaires              | `/interns`             |
| Encadreurs              | `/supervisors`         |
| Autorités               | `/authorities`         |
| Stages                  | `/internships`         |
| Projets                 | `/projects`            |
| Affectations de projets | `/project-assignments` |
| Tableau de bord         | `/dashboard`           |
| Journal d’audit         | `/audit-logs`          |
| Santé de la base        | `/health/database`     |

## Vérification

```powershell
npx prisma validate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Les tests utilisent des services Prisma simulés et ne modifient pas la base MySQL de l’entreprise.
