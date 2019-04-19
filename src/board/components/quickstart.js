import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';
const { section, h1, p, div, h2, a, span, h3 } = helpers(h);

const DEFAULT_LINKS = [
    {
        href: '/',
        name: t`Código de conducta`,
        description: t`Si gustas de contribuir te compartimos los lineamientos que está comunidad sigue por el bien de todos.`,
    },
    {
        href: '/',
        name: t`Preguntas frecuentes`,
        description: t`Antes de preguntar algo te pedimos consultar está sección para saber si alguien más ya ha resuelto esa duda.`,
    },
    {
        href: '/',
        name: t`Desarrollo libre`,
        description: t`Anzu es una plataforma de código abierto escrita por apasionados del software! Te invitamos a conocer nuestra misión y unirte.`,
    },
];

export function Quickstart({ state }) {
    const { site } = state;
    const quickstart = site.quickstart || {};
    const links = quickstart.links || DEFAULT_LINKS;
    return div('.current-article', [
        section([
            h1(quickstart.headline || t`Bienvenido a la comunidad de Anzu.`),
            p([
                quickstart.description ||
                    'Únete a la conversación y aporta ideas para el desarrollo de Anzu, una poderosa plataforma de foros y comunidades enfocada en la discusión e interacción entre usuarios en tiempo real.',
            ]),
            div('.separator'),
            h2(['Si eres nuevo por aquí']),
            div(
                '.quick-guide',
                links.map(link =>
                    div([
                        h3(
                            {},
                            a('.pointer', { href: link.href }, [
                                link.name + ' ',
                                span('.icon.icon-arrow-right'),
                            ])
                        ),
                        p(link.description),
                    ])
                )
            ),
        ]),
    ]);
}
