# Changement obligatoire de mot de passe et invalidation des JWT

Ce document décrit le fonctionnement de sécurité appliqué lors de la première connexion, après une réinitialisation administrative et après un changement de mot de passe.

## 1. Parcours complet

```text
Création du compte par un administrateur
        ↓
mustChangePassword = true par défaut
        ↓
Connexion avec le mot de passe temporaire
        ↓
JWT retourné avec la version du mot de passe
        ↓
GET /auth/me et PATCH /auth/change-password uniquement
        ↓
Changement du mot de passe
        ↓
mustChangePassword = false
passwordChangedAt = nouvelle date
        ↓
Ancien JWT rejeté avec TOKEN_REVOKED
        ↓
Nouvelle connexion obligatoire
        ↓
Accès aux pages correspondant au rôle
```

Le comportement est identique pour un compte `ADMINISTRATEUR` ou `UTILISATEUR`.

## 2. Création du compte

Lors de `POST /users`, `UserService` conserve ce comportement :

```typescript
mustChangePassword: createUserDto.mustChangePassword ?? true,
```

Si l’administrateur ne précise pas `mustChangePassword`, le changement est donc obligatoire par défaut.

## 3. Version du mot de passe dans le JWT

Lors de `POST /auth/login`, `AuthService` ajoute au JWT la date exacte du dernier changement de mot de passe :

```typescript
const accessToken = await this.jwtService.signAsync({
  sub: user.id,
  employeeId: user.employeeId,
  email: user.employee.email,
  role: user.role.name,
  passwordChangedAt: user.passwordChangedAt?.getTime() ?? null,
});
```

Cette valeur joue le rôle de version de sécurité. Elle évite d’ajouter une nouvelle colonne dans MySQL.

## 4. Vérification exécutée sur chaque route protégée

`JwtAuthGuard` ne vérifie plus seulement la signature du JWT. Il charge également l’état actuel du compte dans MySQL :

```typescript
const account = await this.prisma.user.findUnique({
  where: { id: payload.sub },
  select: {
    employeeId: true,
    isActive: true,
    mustChangePassword: true,
    passwordChangedAt: true,
    employee: {
      select: { email: true, isActive: true },
    },
    role: {
      select: { name: true, isActive: true },
    },
  },
});
```

La requête est refusée si le compte, l’employé ou le rôle est devenu inactif.

Le rôle et l’email utilisés par les autres guards sont remplacés par les valeurs actuelles de la base. Une ancienne valeur présente dans le JWT ne peut donc pas conserver un droit qui a été retiré dans MySQL.

## 5. Blocage avant le premier changement

Si `mustChangePassword` vaut `true`, toutes les routes protégées sont refusées sauf celles portant le décorateur :

```typescript
@AllowPasswordChangeRequired()
```

Ce décorateur est présent uniquement sur :

```text
GET /auth/me
PATCH /auth/change-password
```

Une autre route, par exemple `GET /dashboard`, retourne :

```json
{
  "statusCode": 403,
  "code": "PASSWORD_CHANGE_REQUIRED",
  "message": "Vous devez modifier votre mot de passe avant de continuer."
}
```

## 6. Invalidation exacte de l’ancien JWT

Le guard compare la version contenue dans le JWT avec `passwordChangedAt` dans MySQL :

```typescript
const currentPasswordChangedAt = account.passwordChangedAt?.getTime() ?? null;
const tokenPasswordChangedAt = payload.passwordChangedAt ?? null;

if (tokenPasswordChangedAt !== currentPasswordChangedAt) {
  throw new UnauthorizedException({
    statusCode: 401,
    code: 'TOKEN_REVOKED',
    message:
      'Votre session a été invalidée après un changement de mot de passe. Reconnectez-vous.',
  });
}
```

Après un changement personnel ou une réinitialisation administrative, `passwordChangedAt` reçoit une nouvelle valeur. Tous les JWT plus anciens deviennent immédiatement différents et sont rejetés, même s’ils ne sont pas encore arrivés à expiration.

## 7. Changement par l’utilisateur

```http
PATCH /auth/change-password
Authorization: Bearer JWT_ACTUEL
Content-Type: application/json
```

```json
{
  "currentPassword": "MotDePasseTemporaire@2026!",
  "newPassword": "NouveauMotDePasse@2026!",
  "confirmNewPassword": "NouveauMotDePasse@2026!"
}
```

Réponse réussie :

```json
{
  "message": "Mot de passe modifié avec succès.",
  "mustChangePassword": false,
  "requiresLogin": true
}
```

Le frontend doit alors supprimer l’ancien JWT et renvoyer l’utilisateur vers la page de connexion.

Toute tentative d’utiliser cet ancien JWT retourne ensuite :

```json
{
  "statusCode": 401,
  "code": "TOKEN_REVOKED",
  "message": "Votre session a été invalidée après un changement de mot de passe. Reconnectez-vous."
}
```

## 8. Réinitialisation par un administrateur

```http
PATCH /users/UUID_UTILISATEUR/reset-password
Authorization: Bearer JWT_ADMIN
Content-Type: application/json
```

```json
{
  "newPassword": "NouveauTemporaire@2026!",
  "confirmNewPassword": "NouveauTemporaire@2026!",
  "mustChangePassword": true
}
```

La réinitialisation :

- remplace le hash Argon2id ;
- place normalement `mustChangePassword` à `true` ;
- modifie `passwordChangedAt` ;
- invalide immédiatement tous les anciens JWT ;
- oblige l’utilisateur à se connecter avec le nouveau mot de passe temporaire.

## 9. Comportement attendu dans le frontend

Après `POST /auth/login` :

```typescript
if (response.user.mustChangePassword) {
  router.navigate(['/change-password']);
} else if (response.user.role === 'ADMINISTRATEUR') {
  router.navigate(['/admin']);
} else {
  router.navigate(['/dashboard']);
}
```

L’intercepteur HTTP du frontend doit également reconnaître :

```typescript
if (error.status === 403 && error.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
  router.navigate(['/change-password']);
}

if (error.status === 401 && error.error?.code === 'TOKEN_REVOKED') {
  authService.logout();
  router.navigate(['/login']);
}
```

Le frontend améliore l’expérience, mais la sécurité est imposée par le backend : modifier manuellement l’URL ne contourne pas le guard.

## 10. Fichiers concernés

| Fichier                                                                           | Modification                                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/auth/auth.service.ts`                                                        | Ajout de `passwordChangedAt` dans le JWT                                 |
| `src/auth/interfaces/jwt-payload.interface.ts`                                    | Déclaration de la version du mot de passe dans le contenu JWT            |
| `src/auth/guards/jwt-auth.guard.ts`                                               | Vérification du compte, blocage obligatoire et invalidation des JWT      |
| `src/auth/decorators/password-change/allow-password-change-required.decorator.ts` | Marquage explicite des rares routes autorisées                           |
| `src/auth/auth.controller.ts`                                                     | Autorisation de `/auth/me` et `/auth/change-password` pendant le blocage |
| `src/auth/auth.service.spec.ts`                                                   | Vérification de la version ajoutée au JWT lors de la connexion           |
| `src/auth/guards/jwt-auth.guard.spec.ts`                                          | Tests du blocage, de l’invalidation et du fonctionnement normal          |
| `src/auth/guards/jwt-auth.guard.invalid-payload.spec.ts`                          | Test d’un JWT signé mais mal formé                                       |

Cette fonctionnalité utilise le champ existant `passwordChangedAt`. Elle ne nécessite donc aucune nouvelle migration Prisma.
