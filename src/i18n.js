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
            'Not enough permissions to post in this category.': [
                'No cuentas con permisos para publicar en esta categoría.',
            ],
            'User already exists.': [
                'El nombre de usuario o correo electrónico se encuentra ocupado.',
            ],
            "Couldn't find an account with those credentials.": [
                'No pudimos encontrar una cuenta con esas credenciales.',
            ],
            'Account credentials are not correct': [
                'Las credenciales de acceso no son correctas, verifica e intenta nuevamente.',
            ],
            "You're not trusted anymore to sign in. Contact site owner.": [
                'Tu acceso se encuentra restringido, contacta al administrador del sitio para más información.',
            ],
            'Not enough permissions to block comments in this post': [
                'No cuentas con permisos para bloquear los comentarios en esta publicación.',
            ],
            'Account credentials are not correct.': [
                'No pudimos verificar tu identidad. Revisa tus credenciales de acceso',
            ],
            'Not enough user reputation.': [
                'Aún no tienes la reputación suficiente para realizar esta acción.',
            ],
            'Cannot change username more than 2 times': [
                'No se puede cambiar el nombre de usuario más de 2 veces',
            ],
            'An email has been sent to this address with instructions on how to reset your password.': [
                'Se ha enviado un correo con instrucciones. Revisa tu bandeja de entrada.',
            ],
            'You just lost %d reputation points. =/': [
                'Acabar de perder %d puntos de tu reputación. :/',
                'Acabar de perder %d puntos de tu reputación. :/',
            ],
            'You just received a reputation point. Thanks for sharing.': [
                'Acabas de recibir un punto de reputación. Gracias por compartir!',
                'Acabas de recibir %d puntos de reputación. Gracias por contribuir a esta comunidad.',
            ],
            'Not allowed to perform this operation': [
                'No tienes permiso para realizar esta acción.',
            ],
            upvote: ['Me gusta'],
            downvote: ['No me gusta'],
            useful: ['Ùtil'],
            concise: ['Concreta'],
            offtopic: ['Fuera de lugar'],
            wordy: ['Confusa'],
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
    if (n === 0) {
        return '0';
    }
    return numberFormat('#,###.', n);
}
