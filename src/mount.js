import 'babel-polyfill';
import { render } from 'react-dom';
import h from 'react-hyperscript';
import Home from './board/containers/home';

export function anzu(elm, props = {}) {
    const params = new window.URLSearchParams(window.location.search);
    if (params.has('token')) {
        window.localStorage.setItem(
            '_auth',
            JSON.stringify({
                token: params.get('token'),
            })
        );
        window.location.href = window.location.pathname;
    }
    return render(h(Home, { ...props }), elm);
}
