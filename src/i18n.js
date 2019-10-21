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
            'The content will be discarded, continue?': [
                'El contenido se descartará, ¿Quieres continuar?',
            ],
            'Tu cuenta en': ['Tu cuenta en'],
            'Únete a la conversación': ['Únete a la conversación'],
            'Iniciar sesión': ['Iniciar sesión'],
            'Crear cuenta': ['Crear cuenta'],
            'Únete o inicia sesión, la conversación te necesita.': [
                'Únete o inicia sesión, la conversación te necesita.',
            ],
            'Necesitas estar identificado para continuar con tu publicación.': [
                'Necesitas estar identificado para continuar con tu publicación.',
            ],
            'Escribe el motivo de esta acción...': [
                'Escribe el motivo de esta acción...',
            ],
            Continuar: ['Continuar'],
            Publicó: ['Publicó'],
            'Avatar de ${author.username}': ['Avatar de ${author.username}'],
            hace: ['hace'],
            'Selecciona un motivo': ['Selecciona un motivo'],
            'Escribe el motivo...': ['Escribe el motivo...'],
            Comentó: ['Comentó'],
            Responder: ['Responder'],
            'Editar comentario': ['Editar comentario'],
            '¿Por qué quieres borrar este comentario?': [
                '¿Por qué quieres borrar este comentario?',
            ],
            'Describe el motivo...': ['Describe el motivo...'],
            'Borrar comentario': ['Borrar comentario'],
            'Reportar un comentario': ['Reportar un comentario'],
            Reportar: ['Reportar'],
            'Escribe aquí tu respuesta': ['Escribe aquí tu respuesta'],
            'Guardar comentario': ['Guardar comentario'],
            Cancelar: ['Cancelar'],
            'Esta respuesta fue considerada:': [
                'Esta respuesta fue considerada:',
            ],
            Configuración: ['Configuración'],
            General: ['General'],
            Categorías: ['Categorías'],
            Permisos: ['Permisos'],
            Diseño: ['Diseño'],
            'Guardar cambios': ['Guardar cambios'],
            'Nombre del sitio': ['Nombre el sitio'],
            'Ej. Comunidad de Anzu': ['Ej. Comunidad de Anzu'],
            'Mostrado alrededor del sitio, el nombre de tu comunidad.': [
                'Mostrado alrededor del sitio, el nombre de tu comunidad.',
            ],
            'Descripción del sitio': ['Descripción del sitio'],
            'Para metadatos, resultados de busqueda y dar a conocer tu comunidad.': [
                'Para metadatos, resultados de busqueda y dar a conocer tu comunidad.',
            ],
            'Dirección del sitio': ['Dirección del sitio'],
            'Ej. https://comunidad.anzu.io': ['Ej. https://comunidad.anzu.io'],
            'URL absoluta donde vive la instalación de Anzu. Utilizar una dirección no accesible puede provocar no poder acceder al sitio.': [
                'URL absoluta donde vive la instalación de Anzu. Utilizar una dirección no accesible puede provocar no poder acceder al sitio.',
            ],
            'Menú de navegación': ['Menú de navegación'],
            'Mostrado en la parte superior del sitio. (- = +)': [
                'Mostrado en la parte superior del sitio. (- = +)',
            ],
            Recientes: ['Recientes'],
            Populares: ['Populares'],
            Publicar: ['Publicar'],
            'Crear publicación': ['Crear publicación'],
            'No encontramos más publicaciones por cargar en este momento.': [
                'No encontramos más publicaciones por cargar en este momento.',
            ],
            'Buscando: ${feed.search}': ['Buscando: ${feed.search}'],
            'Todas las categorias': ['Todas las categorias'],
            'Recuperar contraseña': ['Recuperar contraseña'],
            'Recupera el acceso a tu cuenta proporcionando el correo electrónico que usaste en tu registro.': [
                'Recupera el acceso a tu cuenta proporcionando el correo electrónico que usaste en tu registro.',
            ],
            'Correo electrónico': ['Correo electrónico'],
            'Continuar con Facebook': ['Continuar con Facebook'],
            'ó con tu cuenta anzu': ['ó con tu cuenta anzu'],
            Contraseña: ['Contraseña'],
            ' Recordar mi sesión': ['Recordar mi sesión'],
            '¿Olvidaste tu contraseña?': ['¿Olvidaste tu contraseña?'],
            'Gestión y Herramientas': ['Gestión y Herramientas'],
            Reportes: ['Reportes'],
            'Gestión de usuarios': ['Gestión de usuarios'],
            'Buscar...': ['Buscar...'],
            'Buscar publicaciones...': ['Buscar publicaciones...'],
            'No tienes ninguna notificación por el momento.': [
                'No tienes ninguna notificación por el momento.',
            ],
            'Avatar de ${user.username}': ['Avatar de ${user.username}'],
            'Ver mi perfil': ['Ver mi perfil'],
            Reputación: ['Reputación'],
            Tributo: ['Tributo'],
            'Salir de mi cuenta': ['Salir de mi cuenta'],
            Únete: ['Únete'],
            'Crear una cuenta': ['Crear una cuenta'],
            Notificaciones: ['Notificaciones'],
            'Enviamos a tu correo las instrucciones necesarias para validar tu cuenta. Obtén acceso completo al sitio y únete a la conversación.': [
                'Enviamos a tu correo las instrucciones necesarias para validar tu cuenta. Obtén acceso completo al sitio y únete a la conversación.',
            ],
            'Reenviar correo electrónico': ['Reenviar correo electrónico'],
            'Powered by Anzu community': ['Powered by Anzu community'],
            'v0.1 alpha': ['v0.1 alpha'],
            '¡Vaya!, ¿cómo llegaste hasta aquí?': [
                '¡Vaya!, ¿cómo llegaste hasta aquí?',
            ],
            'Bueno, esto es raro, el contenido al que estas intentando acceder no existe ó ha sido eliminado recientemente.': [
                'Bueno, esto es raro, el contenido al que estas intentando acceder no existe ó ha sido eliminado recientemente.',
            ],
            'Volver al inicio': ['Volver al inicio'],
            'Editar publicación': ['Editar publicación'],
            '¿Por qué quieres borrar esta publicación?': [
                '¿Por qué quieres borrar esta publicación?',
            ],
            'Borrar publicación': ['Borrar publicación'],
            'Reportar una publicación': ['Reportar una publicación'],
            'Categoría principal': ['Categoría principal'],
            'Selecciona una categoría para la publicación': [
                'Selecciona una categoría para la publicación',
            ],
            'Título de la publicación': ['Título de la publicación'],
            'Escribe el titulo de tu publicación o pregunta...': [
                'Escribe el titulo de tu publicación o pregunta...',
            ],
            'Escribe aquí el contenido de tu publicación': [
                'Escribe aquí el contenido de tu publicación',
            ],
            'La publicación es una pregunta': [
                'La publicación es una pregunta',
            ],
            'No permitir comentarios en esta publicación': [
                'No permitir comentarios en esta publicación',
            ],
            'Publicar como importante': ['Publicar como importante'],
            'Guardar publicación': ['Guardar publicación'],
            'Esta publicación fue considerada:': [
                'Esta publicación fue considerada:',
            ],
            'Ordenar comentarios': ['Ordenar comentarios'],
            'Antiguos primero': ['Antiguos primero'],
            'Esta publicación bloqueó los comentarios': [
                'Esta publicación bloqueó los comentarios',
            ],
            'Nadie ha respondido aún': ['Nadie ha respondido aún'],
            'Los comentarios han sido deshabilitados en esta publicación.': [
                'Los comentarios han sido deshabilitados en esta publicación.',
            ],
            'Únete a la conversación y sé el primero en contestar.': [
                'Únete a la conversación y sé el primero en contestar.',
            ],
            'Escribir respuesta': ['Escribir respuesta'],
            'Arrastra una imagen para cambiar tu avatar': [
                'Arrastra una imagen para cambiar tu avatar',
            ],
            'Perfil de ${username}': ['Perfil de ${username}'],
            'Correo electrónico no validado.': [
                'Correo electrónico no validado.',
            ],
            'Perfíl confirmado': ['Perfíl confirmado'],
            'no ha escrito su biografía aún.': [
                'no ha escrito su biografía aún.',
            ],
            'Escribe tu nueva contraseña...': [
                'Escribe tu nueva contraseña...',
            ],
            'Aún no has escrito tu biografía. Ayuda a otros a conocer sobre ti escribiendo una en tu perfil.': [
                'Aún no has escrito tu biografía. Ayuda a otros a conocer sobre ti escribiendo una en tu perfil.',
            ],
            '${number(rest)} para el siguiente nivel': [
                '${number(rest)} para el siguiente nivel',
            ],
            Desconocido: ['Desconocido'],
            'Miembro hace ${ago(user.created_at)}': [
                'Miembro hace ${ago(user.created_at)}',
            ],
            publicaciones: ['publicaciones'],
            comentarios: ['comentarios'],
            'Ultimas publicaciones': ['Ultimas publicaciones'],
            'No encontramos ningúna publicación de este usuario': [
                'No encontramos ningúna publicación de este usuario',
            ],
            'Ultimos comentarios': ['Ultimos comentarios'],
            'No encontramos ningún comentario de este usuario': [
                'No encontramos ningún comentario de este usuario',
            ],
            'Comentado hace ': ['Comentado hace '],
            'Publicado hace ': ['Publicado hace '],
            'Cambios al perfil guardados': ['Cambios al perfil guardados'],
            'Confirma tu nueva contraseña': ['Confirma tu nueva contraseña'],
            'Escribir nueva publicación': ['Escribir nueva publicación'],
            Revisión: ['Revisión'],
            'Recuerda estas reglas básicas': ['Recuerda estas reglas básicas'],
            'Las publicaciones deben ser relacionados a su categoría': [
                'Las publicaciones deben ser relacionados a su categoría',
            ],
            'Si deseas colocar un tema que se salga muy abruptamente de las categorías de la comunidad, te pedimos que utilices la sección de Bar Spartano para hacerlo. Damos la bienvenida a temas de discusión general, pero los rechazamos en las otras secciones.': [
                'Si deseas colocar un tema que se salga muy abruptamente de las categorías de la comunidad, te pedimos que utilices la sección de Bar Spartano para hacerlo. Damos la bienvenida a temas de discusión general, pero los rechazamos en las otras secciones.',
            ],
            'Utiliza títulos que expliquen tu publicación': [
                'Utiliza títulos que expliquen tu publicación',
            ],
            'No publiques títulos poniendo solamente frases como “Ayuda”, “No sé qué hacer”, “xD”, “Recomendación”, o cualquier otra cosa que no explique tu tema. Nuestros algoritmos van a penalizar dichas publicaciones, incluso cuando en la descripción expliques perfectamente tu problema. La única excepción para publicar cualquier título es el Bar Spartano.': [
                'No publiques títulos poniendo solamente frases como “Ayuda”, “No sé qué hacer”, “xD”, “Recomendación”, o cualquier otra cosa que no explique tu tema. Nuestros algoritmos van a penalizar dichas publicaciones, incluso cuando en la descripción expliques perfectamente tu problema. La única excepción para publicar cualquier título es el Bar Spartano.',
            ],
            'Explica y escribe bien tu tema, pregunta o aportación': [
                'Explica y escribe bien tu tema, pregunta o aportación',
            ],
            'Haz un esfuerzo por leer una vez más el texto donde describes tu pregunta o comentario ANTES DE PUBLICAR. Procura que esté lo mejor explicado que puedas, que no esté incompleto, y que sea fácil de comprender. Todo eso ayuda a que los demás contribuyan y a que aumentes tu reputación en la comunidad.': [
                'Haz un esfuerzo por leer una vez más el texto donde describes tu pregunta o comentario ANTES DE PUBLICAR. Procura que esté lo mejor explicado que puedas, que no esté incompleto, y que sea fácil de comprender. Todo eso ayuda a que los demás contribuyan y a que aumentes tu reputación en la comunidad.',
            ],
            'Contenido ilegal (torrents, cracks, MP3, P2P, etc)': [
                'Contenido ilegal (torrents, cracks, MP3, P2P, etc)',
            ],
            'Está prohibido cualquier mensaje de solicitud, ayuda o recomendación sobre contenido ilegal. Cualquier mensaje en foros, artículos, perfiles u otra sección pública de la comunidad SpartanGeek.com que contenga dicho material será removido y se evaluará suspender la cuenta.': [
                'Está prohibido cualquier mensaje de solicitud, ayuda o recomendación sobre contenido ilegal. Cualquier mensaje en foros, artículos, perfiles u otra sección pública de la comunidad SpartanGeek.com que contenga dicho material será removido y se evaluará suspender la cuenta.',
            ],
            'Leer reglamento completo': ['Leer reglamento completo'],
            'Escoge una categoría (requerido)': [
                'Escoge una categoría (requerido)',
            ],
            'Escribe aquí un titulo...': ['Escribe aquí un titulo...'],
            'Revisión y publicar': ['Revisión y publicar'],
            'Sugerencias para obtener más y mejores respuestas y comentarios:': [
                'Sugerencias para obtener más y mejores respuestas y comentarios:',
            ],
            'Lee nuevamente tu publicación antes de enviarla. Procura que sea clara y entendible.': [
                'Lee nuevamente tu publicación antes de enviarla. Procura que sea clara y entendible.',
            ],
            'Si son varias preguntas, trata de empezar por las más importantes. Evita abrumar con mucha info y ve al punto.': [
                'Si son varias preguntas, trata de empezar por las más importantes. Evita abrumar con mucha info y ve al punto.',
            ],
            'Gana reputación agradeciendo a los que te ayuden o contribuyan a tu tema.': [
                'Gana reputación agradeciendo a los que te ayuden o contribuyan a tu tema.',
            ],
            'Un último vistazo antes de publicar': [
                'Un último vistazo antes de publicar',
            ],
            'Publicar ahora': ['Publicar ahora'],
            'Código de conducta': ['Código de conducta'],
            'Si gustas de contribuir te compartimos los lineamientos que está comunidad sigue por el bien de todos.': [
                'Si gustas de contribuir te compartimos los lineamientos que está comunidad sigue por el bien de todos.',
            ],
            'Preguntas frecuentes': ['Preguntas frecuentes'],
            'Antes de preguntar algo te pedimos consultar está sección para saber si alguien más ya ha resuelto esa duda.': [
                'Antes de preguntar algo te pedimos consultar está sección para saber si alguien más ya ha resuelto esa duda.',
            ],
            'Desarrollo libre': ['Desarrollo libre'],
            'Anzu es una plataforma de código abierto escrita por apasionados del software! Te invitamos a conocer nuestra misión y unirte.': [
                'Anzu es una plataforma de código abierto escrita por apasionados del software! Te invitamos a conocer nuestra misión y unirte.',
            ],
            'Bienvenido a la comunidad de Anzu.': [
                'Bienvenido a la comunidad de Anzu.',
            ],
            'Únete a la conversación y aporta ideas para el desarrollo de Anzu, una poderosa plataforma de foros y comunidades enfocada en la discusión e interacción entre usuarios en tiempo real.': [
                'Únete a la conversación y aporta ideas para el desarrollo de Anzu, una poderosa plataforma de foros y comunidades enfocada en la discusión e interacción entre usuarios en tiempo real.`',
            ],
            'Si eres nuevo por aquí': ['Si eres nuevo por aquí'],
            'Gracias por contribuir con tu respuesta!': [
                'Gracias por contribuir con tu respuesta!',
            ],
            'Asegúrate de ': ['Asegúrate de '],
            'responder la publicación principal ': [
                'responder la publicación principal ',
            ],
            'y proporcionar detalles suficientes en tu respuesta.': [
                'y proporcionar detalles suficientes en tu respuesta.',
            ],
            'Y trata de ': ['Y trata de '],
            evitar: ['evitar'],
            'Responder con otra pregunta.': ['Responder con otra pregunta.'],
            'Responder a otras respuestas.': ['Responder a otras respuestas.'],
            'Responder sólo tu opinión. Argumenta con referencias o tu experiencia personal.': [
                'Responder sólo tu opinión. Argumenta con referencias o tu experiencia personal.',
            ],
            'También puedes consultar nuestras recomendaciones sobre ': [
                'También puedes consultar nuestras recomendaciones sobre ',
            ],
            'cómo escribir buenas respuestas.': [
                'cómo escribir buenas respuestas.',
            ],
            'Publicar comentario': ['Publicar comentario'],
            'Publicar respuesta': ['Publicar respuesta'],
            'ó crea una cuenta con tu correo': [
                'ó crea una cuenta con tu correo',
            ],
            'Herramientas para Usuarios': ['Herramientas para Usuarios'],
            'Buscar usuario...': ['Buscar usuario...'],
            'Miembro desde hace': ['Miembro desde hace'],
            'Correo validado': ['Correo validado'],
            'Correo sin validar': ['Correo sin validar'],
            '¿Por qué quieres banear este usuario?': [
                '¿Por qué quieres banear este usuario?',
            ],
            'Banear cuenta': ['Banear cuenta'],
            spam: ['Spam'],
            rude: ['Comportamiento agresivo'],
            abuse: ['Abuso del sitio'],
            spoofing: ['Suplantación de identidad'],
            duplicate: ['Contenido duplicado'],
            needs_review: ['Necesita revisión'],
            other: ['Otros'],
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

export function translate(str, ...values) {
    return i18n.translate(String.raw(str, ...values));
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
