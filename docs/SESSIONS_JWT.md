# Sessions JWT, renouvellement et déconnexion

Ce document explique comment le backend maintient une connexion active tout en conservant des JWT d’accès courts.

## 1. Les deux jetons

| Élément       |              Durée par défaut | Rôle                                                          |
| ------------- | ----------------------------: | ------------------------------------------------------------- |
| JWT d’accès   | 900 secondes, soit 15 minutes | Autoriser les requêtes API protégées                          |
| Refresh token | 604800 secondes, soit 7 jours | Obtenir un nouveau JWT d’accès sans ressaisir le mot de passe |

Le JWT d’accès est envoyé dans l’en-tête :

```http
Authorization: Bearer JWT_ACCES
```

Le refresh token est un secret aléatoire de 384 bits. Le backend ne conserve jamais sa valeur en clair dans MySQL : seul son hash SHA-256 est enregistré dans `auth_sessions.refresh_token_hash`.

## 2. Table `auth_sessions`

Chaque connexion crée une ligne indépendante contenant notamment :

- l’utilisateur ;
- le hash du refresh token ;
- la date d’expiration ;
- la date de dernière utilisation ;
- la date de révocation ;
- l’adresse IP et le navigateur, limités aux longueurs prévues par le schéma.

Le JWT d’accès contient un `sessionId`. Le guard vérifie cette session dans MySQL à chaque requête. Une session révoquée rend donc immédiatement son JWT inutilisable, même si le champ `exp` du JWT n’est pas encore atteint.

Plusieurs connexions sur plusieurs navigateurs ou ordinateurs créent plusieurs sessions distinctes.

## 3. Connexion

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@entreprise.ml",
  "password": "MotDePasse@2026!"
}
```

Réponse JSON par défaut :

```json
{
  "accessToken": "JWT_ACCES",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshExpiresIn": 604800,
  "user": {
    "id": "UUID",
    "role": "ADMINISTRATEUR",
    "permissions": ["dashboard.read"],
    "mustChangePassword": false
  }
}
```

Le refresh token est placé dans le cookie `gestion_stagiaire_refresh` avec les options `HttpOnly`, `SameSite` et `Secure` configurées par l’environnement. Le JavaScript du frontend ne lit pas ce cookie.

## 4. Renouvellement

```http
POST /auth/refresh
Content-Type: application/json
Cookie: gestion_stagiaire_refresh=REFRESH_TOKEN
```

Le corps peut être vide :

```json
{}
```

Le backend :

1. hache le refresh token reçu ;
2. retrouve la session active ;
3. vérifie le compte, l’employé, le rôle, l’expiration et les changements de mot de passe ;
4. remplace atomiquement le hash par celui d’un nouveau refresh token ;
5. renvoie un nouveau JWT d’accès ;
6. remplace le cookie.

L’ancien refresh token ne peut plus être réutilisé après cette rotation.

## 5. Déconnexion

```http
POST /auth/logout
Content-Type: application/json
Cookie: gestion_stagiaire_refresh=REFRESH_TOKEN
```

```json
{}
```

Le backend marque la session comme révoquée puis supprime le cookie. Toute réutilisation de l’ancien JWT d’accès retourne ensuite :

```json
{
  "statusCode": 401,
  "code": "TOKEN_REVOKED",
  "message": "Votre session a expiré ou a été révoquée. Reconnectez-vous."
}
```

Le changement de mot de passe, la réinitialisation administrative et la désactivation du compte révoquent toutes les sessions actives de l’utilisateur.

## 6. Codes utiles au frontend

| Statut | Code                               | Réaction                                                             |
| ------ | ---------------------------------- | -------------------------------------------------------------------- |
| 401    | `ACCESS_TOKEN_EXPIRED`             | Appeler une seule fois `POST /auth/refresh`, puis rejouer la requête |
| 401    | `ACCESS_TOKEN_INVALID`             | Supprimer l’état local et retourner à la connexion                   |
| 401    | `REFRESH_TOKEN_INVALID_OR_EXPIRED` | Retourner à la connexion                                             |
| 401    | `TOKEN_REVOKED`                    | Retourner à la connexion                                             |
| 401    | `ACCOUNT_UNAVAILABLE`              | Retourner à la connexion                                             |
| 403    | `PASSWORD_CHANGE_REQUIRED`         | Aller vers la page de changement de mot de passe                     |

Comme le refresh token tourne à chaque renouvellement, le frontend doit regrouper les erreurs simultanées derrière une seule requête de refresh. Deux refresh parallèles utilisant le même ancien token ne peuvent pas réussir ensemble.

## 7. Exemple d’intercepteur frontend

Toutes les requêtes d’authentification doivent activer les credentials :

```typescript
http.post('/auth/login', credentials, { withCredentials: true });
http.post('/auth/refresh', {}, { withCredentials: true });
http.post('/auth/logout', {}, { withCredentials: true });
```

Logique recommandée :

```text
Requête API
   ↓
401 + ACCESS_TOKEN_EXPIRED
   ↓
Un refresh unique est-il déjà en cours ?
   ├─ Oui : attendre son résultat
   └─ Non : POST /auth/refresh
                 ↓
          Nouveau accessToken
                 ↓
          Rejouer la requête
```

Les autres erreurs 401 ne doivent pas déclencher une boucle de refresh.

## 8. Frontend et backend sur deux PC

Le backend autorise les credentials CORS. L’origine exacte du frontend doit être ajoutée à `FRONTEND_ORIGINS`, par exemple :

```env
FRONTEND_ORIGINS=http://10.175.2.61:4200
```

Pour un cookie entre deux sites différents :

- en production, utiliser HTTPS avec `AUTH_COOKIE_SAME_SITE=none` et `AUTH_COOKIE_SECURE=true` ;
- en développement HTTP, utiliser de préférence le proxy du serveur frontend afin que le navigateur voie une origine unique ;
- uniquement pour un test temporaire sur deux PC, `AUTH_EXPOSE_REFRESH_TOKEN=true` ajoute le refresh token au JSON. Le frontend peut alors l’envoyer dans le corps de `/auth/refresh` et `/auth/logout`. Ce mode est moins sûr et doit rester désactivé en production.

## 9. Test avec Postman

1. Exécuter `POST /auth/login`.
2. Vérifier que Postman a enregistré le cookie `gestion_stagiaire_refresh`.
3. Utiliser `accessToken` comme Bearer token.
4. Exécuter `POST /auth/refresh` avec `{}`.
5. Remplacer le Bearer token par le nouveau `accessToken`.
6. Exécuter `POST /auth/logout` avec `{}`.
7. Réutiliser l’ancien JWT sur `GET /auth/me` : la réponse doit être `401 TOKEN_REVOKED`.

## 10. Variables d’environnement

```env
JWT_EXPIRES_IN_SECOND=900
JWT_REFRESH_EXPIRES_IN_SECOND=604800
AUTH_REFRESH_COOKIE_NAME=gestion_stagiaire_refresh
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAME_SITE=lax
AUTH_EXPOSE_REFRESH_TOKEN=false
```

Après la migration `4_add_auth_sessions`, les JWT créés par l’ancienne version ne possèdent pas de `sessionId`. Une reconnexion unique est donc obligatoire après le déploiement.
