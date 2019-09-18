import h from 'react-hyperscript';
import { useState } from 'react';
import helpers from 'hyperscript-helpers';
import { adminTools } from '../../acl';
import { t } from '../../i18n';
const { section, h1, p, div, h2, a, span, h3, article } = helpers(h);
const { form, label, input, i } = helpers(h);

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

export function QuickstartView({ state, effects }) {
    const [update, setUpdate] = useState(false);

    return div('.current-article', [
        article([
            update === false &&
                h(Quickstart, { state, effects, update, setUpdate }),
            update === true &&
                h(QuickstartUpdate, { state, effects, update, setUpdate }),
        ]),
    ]);
}

function QuickstartActions({ state, update, setUpdate }) {
    const { user } = state.auth;

    if (update === true) {
        return div([
            a(
                '.dib.btn-icon.post-action',
                { onClick: () => setUpdate(false) },
                i('.icon-cancel')
            ),
        ]);
    }
    if (adminTools({ user })) {
        return div([
            a('.pointer.post-action', { onClick: () => setUpdate(true) }, [
                span('.dib.btn-icon.icon-edit', t`Editar`),
            ]),
        ]);
    }
    return null;
}

function QuickstartUpdate({ state, effects, update, setUpdate }) {
    const { site } = state;
    const quickstart = site.quickstart || {};
    const [updateStart, setUpdateStart] = useState({});
    const disabled =
        (updateStart.title == quickstart.headline || !updateStart.title) &&
        (updateStart.description == quickstart.description ||
            !updateStart.description);

    function onSubmit(event) {
        event.preventDefault();
        if (disabled == true) {
            return;
        }
        const updated = {
            ...quickstart,
            headline: updateStart.title,
            description: updateStart.description,
        };
        effects.updateQuickstart(updated).then(() => setUpdate(false));
    }

    return div([
        div('.flex.items-center', [
            div('.flex-auto', [h1(t`Configuración de inicio`)]),
            h(QuickstartActions, { state, effects, update, setUpdate }),
        ]),
        form('.pv3', { onSubmit }, [
            div('.form-group.pb2', [
                label('.b.form-label', t`Título o saludo de Bienvenida`),
                input('.form-input', {
                    name: 'title',
                    maxlenght: '40',
                    type: 'text',
                    value:
                        'title' in updateStart
                            ? updateStart.title
                            : quickstart.headline,
                    placeholder: t`Escribe un saludo de bienvenida o un título`,
                    onChange: event =>
                        setUpdateStart({
                            ...updateStart,
                            title: event.target.value,
                        }),
                }),
                p('.form-input-hint', t`Debe de contener minimo 5 caracteres`),
            ]),
            div('.form-group.pb2', [
                label('.b.form-label', t`Descripción de tu Anzu`),
                input('.form-input', {
                    name: 'description',
                    type: 'text',
                    value:
                        'description' in updateStart
                            ? updateStart.description
                            : quickstart.description,
                    onChange: event =>
                        setUpdateStart({
                            ...updateStart,
                            description: event.target.value,
                        }),
                    placeholder: t`Escribe aquí la descripció de tu sitio`,
                }),
            ]),
            input('.btn.btn-primary.btn-block', {
                disabled,
                type: 'submit',
                value: t`Guardar`,
            }),
        ]),
    ]);
}

function Quickstart({ state, effects, update, setUpdate }) {
    const { site } = state;
    const quickstart = site.quickstart || {};
    const links = quickstart.links || DEFAULT_LINKS;

    return div('.flex-auto', [
        section([
            div('.flex.items-center', [
                div('.flex-auto', [
                    h1(
                        quickstart.headline ||
                            t`Bienvenido a la comunidad de Anzu.`
                    ),
                ]),
                h(QuickstartActions, { state, effects, update, setUpdate }),
            ]),
            p([
                quickstart.description ||
                    t`Únete a la conversación y aporta ideas para el desarrollo de Anzu, una poderosa plataforma de foros y comunidades enfocada en la discusión e interacción entre usuarios en tiempo real.`,
            ]),
            div('.separator'),
            h2([t`Si eres nuevo por aquí`]),
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
