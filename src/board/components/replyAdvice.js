import classNames from 'classnames';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';
import { useSessionState } from '../../hooks';

const tags = helpers(h);
const { div, p, ul, li } = tags;
const { a, i, strong } = tags;

export function ReplyAdvice(props) {
    const [hidden, hideRecommendations] = useSessionState(
        'replyRecommendations',
        false
    );
    return div(
        '.toast.toast-warning.context-help',
        {
            className: classNames({
                dn: props.hidden || hidden,
            }),
        },
        [
            a('.btn.btn-clear.float-right', {
                onClick: () => hideRecommendations(true),
            }),
            p(t`Gracias por contribuir con tu respuesta!`),
            ul([
                li([
                    t`Asegúrate de `,
                    i(t`responder la publicación principal `),
                    t`y proporcionar detalles suficientes en tu respuesta.`,
                ]),
            ]),
            p([t`Y trata de `, strong(t`evitar`), ':']),
            ul([
                li(t`Responder con otra pregunta.`),
                li(t`Responder a otras respuestas.`),
                li(
                    t`Responder sólo tu opinión. Argumenta con referencias o tu experiencia personal.`
                ),
            ]),
            p([
                t`También puedes consultar nuestras recomendaciones sobre `,
                a(t`cómo escribir buenas respuestas.`),
            ]),
        ]
    );
}
