/**
 * db functions: client data repository (and offline storage)
 *
 * db is a dispatcher class and holds the logic for deciding whether selfoss
 * is running online with access to the server or offline.
 *
 * dbOnline contains AJAX calls that provide access to the server db.
 *
 * dbOffline is the entry point for the offline database held in the client.
 */

import selfoss from './selfoss-base';
import { OfflineStorageNotAvailableError } from './errors';
import { ValueListenable } from './helpers/ValueListenable';

selfoss.db = {

    /** When an error occurs we disable the offline mode and mark the database as broken so it can be retried. */
    broken: false,
    storage: null,
    online: true,
    enableOffline: new ValueListenable(window.localStorage.getItem('enableOffline') === 'true'),
    entryStatusNames: ['unread', 'starred'],
    userWaiting: true,


    /**
     * last db timestamp known client side
     */
    lastUpdate: null,


    setOnline: function() {
        if (!selfoss.db.online) {
            selfoss.db.online = true;
            selfoss.db.sync();
            selfoss.reloadTags();
            selfoss.ui.setOnline();
        }
    },


    tryOnline: function() {
        return selfoss.db.sync(true);
    },


    setOffline: function() {
        if (selfoss.db.storage && !selfoss.db.broken) {
            selfoss.dbOnline._syncDone(false);
            selfoss.db.online = false;
            selfoss.ui.setOffline();

            return Promise.resolve();
        } else {
            let err = new OfflineStorageNotAvailableError();
            return Promise.reject(err);
        }
    },


    clear: function() {
        if (selfoss.db.storage) {
            window.localStorage.removeItem('offlineDays');
            var clearing = selfoss.db.storage.delete();
            selfoss.db.storage = null;
            selfoss.db.lastUpdate = null;
            return clearing;
        } else {
            return Promise.resolve();
        }
    },


    isValidTag: function(name) {
        return selfoss.tags.tags.find((tag) => tag.tag === name) !== undefined;
    },


    isValidSource: function(id) {
        return selfoss.sources.sources.find((source) => source.id === id) !== undefined;
    },


    lastSync: null,


    sync: function(force = false) {
        var lastUpdateIsOld = selfoss.db.lastUpdate === null || selfoss.db.lastSync === null || Date.now() - selfoss.db.lastSync > 5 * 60 * 1000;
        var shouldSync = force || selfoss.dbOffline.needsSync || lastUpdateIsOld;
        if (selfoss.loggedin.value && shouldSync) {
            if (selfoss.db.enableOffline.value) {
                return selfoss.dbOffline.sendNewStatuses();
            } else {
                return selfoss.dbOnline.sync();
            }
        } else {
            return Promise.resolve(); // ensure any chained function runs
        }
    }
};
