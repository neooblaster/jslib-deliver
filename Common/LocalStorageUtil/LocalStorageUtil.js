function LocalStorageUtil ($sPrefix = '') {
    return {
        /**
         * Récupère la donnée stockée localement à l'aide de l'argument name
         *
         * @param {String} name  Nom de la donnée stockée.
         */
        get: function(name){
            return self.localStorage.getItem($sPrefix + name);
        },

        /**
         * Définit / Met à jour une donnée stockée localement.
         *
         * @param {String} name  Nom de la donnée à manipuler.
         * @param {mixed} value  Valeur à assigné à la donnée.
         *
         * @return {boolean}
         */
        set: function(name, value){
            self.localStorage.setItem($sPrefix + name, value);
            return true;
        },

        /**
         * Supprimer la donnée stockée localement
         *
         * @param {String} name  Nom de la donnée à supprimée.
         */
        del: function(name) {
            self.localStorage.removeItem($sPrefix + name);
        }
    }
}