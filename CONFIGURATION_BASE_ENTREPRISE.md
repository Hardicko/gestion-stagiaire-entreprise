# Configuration de la base de donnees de l'entreprise

## Informations connues

- Moteur : MySQL
- Serveur : `10.172.1.202`
- Port : `6446`
- Base de donnees : `gestion-stagiaire`

URL JDBC complete sans identifiants :

```text
jdbc:mysql://10.172.1.202:6446/gestion-stagiaire
```

Modele d'URL Prisma :

```text
mysql://UTILISATEUR:MOT_DE_PASSE@10.172.1.202:6446/gestion-stagiaire
```

Le vrai mot de passe devra rester uniquement dans le fichier `.env` local.

## Etat de la verification

Le test TCP effectue depuis le poste actuel a expire. Il faudra donc confirmer
l'acces depuis le reseau interne de l'entreprise ou verifier les regles reseau.

## Informations encore necessaires

- nom de l'utilisateur MySQL ;
- confirmation que `gestion-stagiaire` est le nom reel de la base et pas
  seulement le nom affiche pour la connexion ;
- acces reseau au serveur ;
- autorisation de consultation du schema.

Ne pas executer de migration Prisma sur cette base avant l'inspection de sa
structure et la realisation d'une sauvegarde.
