-- Étend le journal d'audit avec une action de déconnexion explicite.
ALTER TABLE `audit_logs`
    MODIFY `action` ENUM(
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'PASSWORD_CHANGE',
        'PASSWORD_RESET'
    ) NOT NULL;
