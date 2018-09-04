import Jed from 'jed';
import es from 'date-fns/locale/es';
import { format, distanceInWordsToNow } from 'date-fns';
import numberFormat from 'number-format.js';

export const i18n = new Jed({
    locale_data: {
        // This is the domain key
        messages: {
            '': {
                // Domain name
                domain: 'messages',

                // Language code
                lang: 'es',

                // Plural form function for language
                plural_forms: 'nplurals=2; plural=(n != 1);',
            },
        },
    },
    domain: 'messages',
});

export function t(str, ...values) {
    return i18n.translate(String.raw(str, ...values)).fetch();
}

export function dateToString(date, body = 'dddd, D MMMM YYYY') {
    return format(date, body, { locale: es });
}

export function ago(date, options = {}) {
    return distanceInWordsToNow(date, { locale: es, ...options });
}

export function number(n) {
    return numberFormat('#,###.', n);
}
