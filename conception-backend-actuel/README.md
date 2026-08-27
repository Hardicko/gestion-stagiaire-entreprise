# Conception du backend actuel

Ce dossier décrit le backend réellement présent dans le dépôt
`gestion_stagiaire_entreprise`. Il ne décrit pas le futur backend simplifié et
ne doit pas être utilisé pour modifier automatiquement la base de données.

## Document principal

- [CONCEPTION_BACKEND_ACTUEL.md](./CONCEPTION_BACKEND_ACTUEL.md) : contexte,
  architecture, domaines, modèle de données, routes, sécurité, règles métier,
  audit, migrations et stratégie de tests.

## Sources de vérité

La conception est construite à partir des éléments suivants :

- `src/app.module.ts` pour les modules actifs ;
- `prisma/schema.prisma` pour le modèle de données ;
- les contrôleurs pour les routes et permissions ;
- les DTO pour les données acceptées ;
- les services pour les règles métier ;
- `prisma/seed.ts` pour les données initiales ;
- `prisma/migrations` pour l'historique de la base.

Toute évolution du code ou du schéma Prisma devra être reportée dans ce dossier.
