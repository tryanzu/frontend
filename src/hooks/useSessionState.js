import useStoredState from './useStoredState';

/**
 * A temporal sessionStorage persisted state hook.
 *
 * @param {String} name of the state container.
 * @param {Any} any default value to be stored.
 */
export default function useSessionState(name, any = null) {
    return useStoredState(name, any, 'sessionStorage');
}
