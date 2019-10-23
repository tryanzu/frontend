import 'babel-polyfill';
import { render } from 'react-dom';
import h from 'react-hyperscript';
import Home from './board/containers/home';

function anzu(elm, props = {}) {
    return render(h(Home, { ...props }), elm);
}

document.addEventListener('DOMContentLoaded', function() {
    anzu(document.getElementById('react-anzu'));
});
