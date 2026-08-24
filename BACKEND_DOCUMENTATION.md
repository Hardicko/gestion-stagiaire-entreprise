# Documentation du backend — Gestion des stagiaires

## 1. Présentation

Ce projet est le backend de l’application de gestion des stagiaires d’une entreprise.
Il est développé avec NestJS 11 et TypeScript en mode strict.

Le backend devra permettre de gérer :

- les utilisateurs et leurs rôles ;
- les autorisations d’accès ;
- les départements de l’entreprise ;
- les superviseurs ;
- les stagiaires ;
- les stages ;
- les projets confiés aux stagiaires.

## 2. État actuel

Le squelette NestJS et les ressources CRUD sont installés. Les contrôleurs,
services, DTO et entités sont présents, mais la persistance des données n’est
pas encore implémentée.

Décisions prises :

- framework : NestJS ;
- langage : TypeScript ;
- base de données : MySQL ;
- branche Git principale : `main`.

L’ORM retenu et configuré est Prisma 7 avec l’adaptateur MySQL/MariaDB `@prisma/adapter-mariadb`.

## 3. Ressources métier

| Ressource    | Responsabilité prévue                              |
| ------------ | -------------------------------------------------- |
| `role`       | Définir les rôles attribuables aux utilisateurs    |
| `user`       | Gérer les comptes qui accèdent à l’application     |
| `department` | Représenter les départements de l’entreprise       |
| `supervisor` | Gérer les personnes responsables des stagiaires    |
| `authority`  | Définir les permissions et autorisations           |
| `project`    | Gérer les projets confiés pendant les stages       |
| `intern`     | Gérer les informations personnelles des stagiaires |
| `internship` | Gérer une période de stage et ses affectations     |

Toutes ces ressources sont importées dans `src/app.module.ts`.

## 4. Structure d’une ressource NestJS

Chaque dossier métier suit la même organisation :

```text
src/intern/
├── dto/
│   ├── create-intern.dto.ts
│   └── update-intern.dto.ts
├── entities/
│   └── intern.entity.ts
├── intern.controller.ts
├── intern.module.ts
└── intern.service.ts
```

### Module

Le fichier `*.module.ts` regroupe les composants de la ressource. Il déclare
notamment son contrôleur et son service, puis permet son importation dans le
module principal de l’application.

### Contrôleur

Le fichier `*.controller.ts` reçoit les requêtes HTTP, lit les paramètres et le
corps des requêtes, puis appelle le service approprié.

Les routes CRUD générées suivent ce modèle :

| Méthode  | Route         | Action                 |
| -------- | ------------- | ---------------------- |
| `POST`   | `/intern`     | Créer un stagiaire     |
| `GET`    | `/intern`     | Lister les stagiaires  |
| `GET`    | `/intern/:id` | Consulter un stagiaire |
| `PATCH`  | `/intern/:id` | Modifier un stagiaire  |
| `DELETE` | `/intern/:id` | Supprimer un stagiaire |

Le même modèle s’applique aux autres ressources en remplaçant `intern` par le
nom de la ressource.

### Service

Le fichier `*.service.ts` contient la logique métier. Il devra notamment :

- appliquer les règles de gestion ;
- vérifier les droits et les contraintes métier ;
- interroger MySQL à travers l’ORM ;
- créer, rechercher, modifier et supprimer les données.

Le contrôleur doit rester léger et déléguer la logique au service.

### DTO

DTO signifie **Data Transfer Object**. Un DTO décrit les données que l’API
accepte en entrée.

- `create-*.dto.ts` décrit les champs acceptés pendant une création ;
- `update-*.dto.ts` décrit les champs modifiables pendant une mise à jour.

Les DTO serviront aussi à valider les données avec des règles comme : champ
obligatoire, email valide, longueur minimale ou valeur autorisée.

### Entité

Le fichier `*.entity.ts` représente un objet du domaine métier. Si Prisma est
retenu, les modèles de base de données et leurs relations seront principalement
définis dans `prisma/schema.prisma`. Les entités TypeScript ne seront conservées
que si elles apportent une séparation métier utile.

## 5. Parcours d’une requête

Exemple de création d’un stagiaire :

```text
POST /intern
    ↓
CreateInternDto
    ↓
InternController
    ↓
InternService
    ↓
ORM
    ↓
MySQL
```

## 6. Pourquoi MySQL

MySQL a été retenu parce que les données du projet sont fortement
relationnelles. Il permet de garantir les liens entre utilisateurs, rôles,
départements, superviseurs, stagiaires, stages et projets avec des clés
étrangères et des contraintes.

Ses principaux avantages pour ce projet sont :

- transactions fiables ;
- relations et jointures performantes ;
- contraintes d’intégrité ;
- prise en charge des UUID, ENUM et JSONB ;
- système gratuit et open source ;
- bonne compatibilité avec NestJS, Prisma, Docker et les services cloud.

## 7. Rôle de Prisma

Prisma est l’intermédiaire entre les services NestJS et MySQL. Il permet
de définir les modèles et leurs relations, de générer un client TypeScript
fortement typé, puis de faire évoluer la structure de la base avec des
migrations versionnées.

Le projet contient :

- `prisma/schema.prisma` pour les futurs modèles de données ;
- `prisma.config.ts` pour la configuration de Prisma et des migrations ;
- `src/prisma/prisma.module.ts` pour rendre Prisma disponible dans NestJS ;
- `src/prisma/prisma.service.ts` pour exécuter les requêtes MySQL.

Après une modification du schéma :

```bash
npm run prisma:generate
```

## 8. Installation locale

Prérequis :

- Node.js ;
- npm ;
- Docker Desktop.

Installer les dépendances :

```bash
npm install
```

Créer la configuration locale :

```powershell
Copy-Item .env.example .env
```

Démarrer MySQL :

```bash
npm run db:up
```

Démarrer le serveur en développement :

```bash
npm run start:dev
```

Par défaut, l’application démarre sur :

```text
http://localhost:3000
```

## 9. Commandes disponibles

| Commande                     | Utilité                                        |
| ---------------------------- | ---------------------------------------------- |
| `npm run start`              | Démarrer l’application                         |
| `npm run start:dev`          | Démarrer avec rechargement automatique         |
| `npm run build`              | Compiler le backend pour la production         |
| `npm run start:prod`         | Exécuter la version compilée                   |
| `npm run lint`               | Vérifier et corriger le style du code          |
| `npm run format`             | Formater les fichiers TypeScript               |
| `npm test`                   | Exécuter les tests unitaires                   |
| `npm run test:e2e`           | Exécuter les tests de bout en bout             |
| `npm run test:cov`           | Produire le rapport de couverture des tests    |
| `npm run prisma:generate`    | Générer le client Prisma TypeScript            |
| `npm run prisma:validate`    | Vérifier le schéma Prisma                      |
| `npm run prisma:migrate:dev` | Créer et appliquer une migration locale        |
| `npm run prisma:studio`      | Ouvrir l’interface de consultation des données |
| `npm run db:up`              | Démarrer MySQL avec Docker Compose             |
| `npm run db:down`            | Arrêter MySQL                                  |
| `npm run db:logs`            | Suivre les journaux MySQL                      |
| `npm run db:status`          | Afficher l’état du conteneur MySQL             |

## 10. Variables d’environnement

Les secrets et paramètres propres à une machine devront être placés dans un
fichier `.env`, qui est exclu du dépôt Git.

La connexion MySQL utilise une variable similaire :

```env
DATABASE_URL="mysql://user_dev:mot_de_passe@10.172.1.202:6446/gestion_stagiaire"
PORT=3000
```

Les valeurs réelles ne doivent jamais être enregistrées dans Git. Le fichier
`.env.example` documente la configuration attendue sans contenir de secret.

## 11. MySQL avec Docker

Le fichier `compose.yaml` utilise l’image officielle `mysql:8.0`.
Le port MySQL est exposé sur `localhost:3306` et les données sont
conservées dans le volume nommé `gestion-stagiaire-mysql-data`.

`docker compose down` arrête le conteneur mais conserve les données. La
suppression du volume est destructive et réservée à une réinitialisation complète.

## 12. Git

Le dépôt local est initialisé avec la branche principale `main`.

Les éléments suivants sont exclus du dépôt :

- `node_modules/` ;
- `dist/` ;
- `coverage/` ;
- les fichiers `.env` ;
- les journaux et fichiers temporaires.

## 13. Prochaines étapes

1. Définir les champs et les relations des modèles.
2. Créer et appliquer la première migration MySQL.
3. Implémenter l’authentification et les autorisations.
4. Remplacer les réponses temporaires des services par la persistance réelle.
5. Documenter l’API avec Swagger/OpenAPI.
6. Ajouter les tests métier.

Cette documentation devra être mise à jour à chaque décision importante ou
modification de l’architecture du backend.
