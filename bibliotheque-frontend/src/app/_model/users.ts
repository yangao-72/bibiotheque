export class Users {
    userId: number;
    username: string;
    name: string;
    password: string;
    role: any;
    /**
     * Faux si le compte a été supprimé (suppression logique). Absent ou `null`
     * sur les comptes créés avant l'ajout du champ : ils sont actifs.
     */
    actif?: boolean;
    /** Trace d'audit de la suppression : date (`dd-MM-yyyy HH:mm`) et motif saisi. */
    dateDesactivation?: string;
    motifDesactivation?: string;
}
