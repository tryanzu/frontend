import { useState } from 'react';

/**
 * A temporal persisted state hook. (local/session storage).
 * Most likely this can be also stored in apollo cache. But let's have this a simplified solution.
 *
 * @param {String} name of the state container.
 * @param {Any} any default value to be stored.
 */
export default function useStoredState(
    name,
    any = null,
    storage = 'localStorage'
) {
    const key = `anzu.${name}`;
    const stored = window[storage].getItem(key) || null;
    const parsed = stored !== null ? JSON.parse(stored).value : any;
    const [value, setValue] = useState(parsed);

    function _setValue(value) {
        window[storage].setItem(key, JSON.stringify({ value }));
        return setValue(value);
    }

    // Return stored values.
    return [value, _setValue];
}
