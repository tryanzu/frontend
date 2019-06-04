import qs from 'query-string';
import { toast } from 'react-toastify';
import { t } from './i18n';

export function parseQuery(queryString) {
    var query = {};
    var pairs = (queryString[0] === '?'
        ? queryString.substr(1)
        : queryString
    ).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}

export function request(url, params = {}) {
    let init = { ...params };
    init.method = init.method || 'GET';
    init.headers = init.headers || {};
    const isFormData = init.body instanceof window.FormData;
    if ('body' in init && typeof init.body === 'object' && !isFormData) {
        init.body = JSON.stringify(init.body);
        init.headers['Content-Type'] = 'application/json';
    }
    if ('_authToken' in window && window._authToken !== false) {
        init.headers.Authorization = `Bearer ${window._authToken}`;
    }
    if ('query' in init) {
        url = url + '?' + qs.stringify(init.query);
        delete init.query;
    }

    let req = new window.Request(Anzu.layer + url, init);
    return window.fetch(req).then(response => {
        // Unauthorized response handler.
        if (response.status === 401 && (init.headers.Authorization || false)) {
            window._authToken = false;
            window.localStorage.removeItem('_auth');
            return request(url, params);
        }
        return response;
    });
}

/**
 * Try/catch error wrapper.
 * Allows to simplify exception handling on fractals.
 * @param {*} fn wrapped in try/catch
 * @param {*} errorCode shown error code on exception.
 */
export function attemptOR(fn, reducer = stopWorkingReducer) {
    try {
        return fn();
    } catch (message) {
        console.error(message);
        return showErrAndReduce(t`${message}`, reducer);
    }
}

/**
 * Dummy reducer that sets the working state property to false.
 */
export function stopWorkingReducer() {
    return state => ({ ...state, working: false });
}

export function showErrAndReduce(message, reducer) {
    toast.error(message);
    return reducer;
}

export function successAndReduce(message, reducer) {
    toast.success(message);
    return reducer;
}
