import { useState } from 'react';
import classNames from 'classnames';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import Markdown from 'react-markdown';
import withState from '../fractals/board';
import { injectState } from 'freactal';
import { Redirect } from 'react-router-dom';
import { Account } from '../components/account';
import RichTextEditor from 'react-rte';
import { t } from '../../i18n';

const tags = helpers(h);
const { form, label, select, optgroup, option, input } = tags;
const { div, section, main, li, ul, ol } = tags;
const { h1, h2, h3, p, a, small, i, span, hr } = tags;

export function Publisher({ state, effects }) {
    const { publisher } = state;
    const { step } = publisher;

    return main('.publish.flex.flex-auto', [
        state.authenticated === false &&
            h(Account, { state, effects, alwaysOpen: true }),
        section('.fade-in.editor.flex.flex-column', [
            div(
                {},
                ul('.step', [
                    li(
                        {
                            onClick: () =>
                                step > 0 && effects.publisher({ step: 0 }),
                            className: classNames('step-item pointer', {
                                active: step == 0,
                            }),
                            dataset: { step: 0 },
                        },
                        a(t`Escribir nueva publicación`)
                    ),
                    li(
                        {
                            onClick: () =>
                                step > 1 && effects.publisher({ step: 1 }),
                            className: classNames('step-item pointer', {
                                active: step == 1,
                            }),
                            dataset: { step: 1 },
                        },
                        a(t`Revisión`)
                    ),
                ])
            ),
            (() => {
                switch (state.publisher.step) {
                    case 0:
                        return h(PostContent, { state, effects });
                    case 1:
                        return h(PostReview, { state, effects });
                }
            })(),
        ]),
        section(
            '.fade-in.guidelines.flex.flex-column',
            { style: { display: 'none' } },
            [
                h2('.f4', t`Recuerda estas reglas básicas`),
                div('.timeline', [
                    div('.timeline-item', [
                        div('.timeline-left', {}, a('.timeline-icon')),
                        div('.timeline-content', [
                            p(
                                '.b.lh-title.mb1',
                                'Las publicaciones deben ser relacionados a su categoría'
                            ),
                            p(
                                '.lh-copy.mb0',
                                'Si deseas colocar un tema que se salga muy abruptamente de las categorías de la comunidad, te pedimos que utilices la sección de Bar Spartano para hacerlo. Damos la bienvenida a temas de discusión general, pero los rechazamos en las otras secciones.'
                            ),
                        ]),
                    ]),
                    div('.timeline-item', [
                        div('.timeline-left', {}, a('.timeline-icon')),
                        div('.timeline-content', [
                            p(
                                '.b.lh-title.mb1',
                                'Utiliza títulos que expliquen tu publicación'
                            ),
                            p(
                                '.lh-copy.mb0',
                                'No publiques títulos poniendo solamente frases como “Ayuda”, “No sé qué hacer”, “xD”, “Recomendación”, o cualquier otra cosa que no explique tu tema. Nuestros algoritmos van a penalizar dichas publicaciones, incluso cuando en la descripción expliques perfectamente tu problema. La única excepción para publicar cualquier título es el Bar Spartano.'
                            ),
                        ]),
                    ]),
                    div('.timeline-item', [
                        div('.timeline-left', {}, a('.timeline-icon')),
                        div('.timeline-content', [
                            p(
                                '.b.lh-title.mb1',
                                'Explica y escribe bien tu tema, pregunta o aportación'
                            ),
                            p(
                                '.lh-copy.mb0',
                                'Haz un esfuerzo por leer una vez más el texto donde describes tu pregunta o comentario ANTES DE PUBLICAR. Procura que esté lo mejor explicado que puedas, que no esté incompleto, y que sea fácil de comprender. Todo eso ayuda a que los demás contribuyan y a que aumentes tu reputación en la comunidad.'
                            ),
                        ]),
                    ]),
                    div('.timeline-item', [
                        div('.timeline-left', {}, a('.timeline-icon')),
                        div('.timeline-content', [
                            p(
                                '.b.lh-title.mb1',
                                'Contenido ilegal (torrents, cracks, MP3, P2P, etc)'
                            ),
                            p(
                                '.lh-copy.mb0',
                                'Está prohibido cualquier mensaje de solicitud, ayuda o recomendación sobre contenido ilegal. Cualquier mensaje en foros, artículos, perfiles u otra sección pública de la comunidad SpartanGeek.com que contenga dicho material será removido y se evaluará suspender la cuenta.'
                            ),
                        ]),
                    ]),
                    div('.timeline-item', [
                        div('.timeline-left', {}, a('.timeline-icon')),
                        div(
                            '.timeline-content',
                            {},
                            a('.f5', 'Leer reglamento completo')
                        ),
                    ]),
                ]),
            ]
        ),
    ]);
}

function PostInfo({ state, effects }) {
    const { categories, publisher } = state;
    const { isQuestion, disabledComments, pinned, category } = publisher;
    const [title, setTitle] = useState(publisher.title);
    const ready = title.length > 0 && category !== false;

    function onSubmit(event) {
        event.preventDefault();
        effects.publisher({ step: 2, title });
    }

    return div([
        h1('.ma0.pv3.f6.f3-ns.tc', 'Completar publicación'),
        form('.pa4-ns.pv2.ph2.mh2.mh0-ns', { onSubmit }, [
            div('.form-group.pb2', [
                label('.b.form-label.pb0', '¿Es una pregunta?'),
                p(
                    '.ma0',
                    {},
                    small(
                        'De esta forma decidimos a quien mostrar tu publicación, a usuarios que responden o a usuarios que buscan respuestas.'
                    )
                ),
                div(
                    '.form-group',
                    {},
                    label('.form-switch.normal', [
                        input({
                            type: 'checkbox',
                            name: 'isQuestion',
                            checked: isQuestion,
                            onChange: event =>
                                effects.publisher(
                                    'isQuestion',
                                    event.target.checked
                                ),
                        }),
                        i('.form-icon'),
                        'Mi publicación es una pregunta',
                    ])
                ),
                div(
                    '.form-group',
                    {},
                    label('.form-switch.normal', [
                        input({
                            type: 'checkbox',
                            checked: disabledComments,
                            onChange: event =>
                                effects.publisher(
                                    'disabledComments',
                                    event.target.checked
                                ),
                        }),
                        i('.form-icon'),
                        t`No permitir comentarios en esta publicación`,
                    ])
                ),
                div(
                    '.form-group',
                    {},
                    label('.form-switch.normal', [
                        input({
                            type: 'checkbox',
                            name: 'pinned',
                            checked: pinned,
                            onChange: event =>
                                effects.publisher(
                                    'pinned',
                                    event.target.checked
                                ),
                        }),
                        i('.form-icon'),
                        t`Publicar como importante`,
                    ])
                ),
            ]),
            input('.btn.btn-primary.btn-block', {
                type: 'submit',
                value: 'Continuar',
                disabled: !ready,
            }),
        ]),
    ]);
}

function PostContent({ effects, state }) {
    const { categories, publisher } = state;
    const [title, setTitle] = useState(publisher.title);
    const [editor, setEditor] = useState(() => {
        return RichTextEditor.createValueFromString(
            publisher.content,
            'markdown'
        );
    });
    const ready = editor.toString('markdown').length > 30;
    function onSubmit(event) {
        event.preventDefault();
        effects.publisher({
            title,
            content: editor.toString('markdown'),
            step: 1,
        });
    }

    return div([
        form('.ph4-ns.pv3-ns.mt3.pv2.ph2.mh2.mh0-ns', { onSubmit }, [
            div('.form-group.pb2', [
                select(
                    '.form-select',
                    {
                        id: 'category',
                        required: true,
                        value: publisher.category,
                        onChange: event =>
                            effects.publisher('category', event.target.value),
                    },
                    [
                        option(
                            {
                                value: '',
                            },
                            'Escoge una categoría (requerido)'
                        ),
                    ].concat(
                        categories
                            .map(c => {
                                const list = c.subcategories.filter(
                                    sub => sub.writable || false
                                );
                                if (list.length === 0) {
                                    return false;
                                }
                                return optgroup(
                                    { label: c.name },
                                    list.map(s =>
                                        option({ value: s.id }, s.name)
                                    )
                                );
                            })
                            .filter(c => c !== false)
                    )
                ),
            ]),
            div('.form-group.pb2', [
                input('#title.form-input.title-input', {
                    type: 'text',
                    value: title,
                    onChange: event => setTitle(event.target.value),
                    placeholder: 'Escribe aquí un titulo...',
                    required: true,
                    autoFocus: true,
                }),
            ]),
            div('.form-group.pb2', [
                h(RichTextEditor, {
                    value: editor,
                    onChange: setEditor,
                }),
            ]),
            input('.btn.btn-primary.btn-block', {
                type: 'submit',
                value: t`Revisión y publicar`,
                disabled: !ready,
            }),
            div('.mt3', [
                h3(
                    '.f5.fw6',
                    'Sugerencias para obtener más y mejores respuestas y comentarios:'
                ),
                ol('.pa0.ma0.measure.lh-copy', [
                    li(
                        'Lee nuevamente tu publicación antes de enviarla. Procura que sea clara y entendible.'
                    ),
                    li(
                        'Si son varias preguntas, trata de empezar por las más importantes. Evita abrumar con mucha info y ve al punto.'
                    ),
                    li(
                        'Gana reputación agradeciendo a los que te ayuden o contribuyan a tu tema.'
                    ),
                ]),
            ]),
        ]),
    ]);
}

function PostReview({ state, effects }) {
    const { publisher } = state;
    const { title, category, content } = publisher;
    const subcategories = state.subcategories || {};

    // Categories are async loaded.
    const subcategory = subcategories.id[category] || {};
    function onSubmit(event) {
        event.preventDefault();
        effects.publishPost();
    }
    if (publisher.lastPost !== false) {
        const post = publisher.lastPost;
        return h(Redirect, { to: `/p/${post.slug}/${post.id}` });
    }
    return div([
        h1('.ma0.pv3.f6.f3-ns.tc', 'Un último vistazo antes de publicar'),
        form('.pa4-ns.pv2.ph2.mh2.mh0-ns', { onSubmit }, [
            h3('.mt0.f6', [subcategory.name, span('.icon-right-open.silver')]),
            h2('.mt0.mb3', title),
            hr(),
            div('.post-preview.pb2', {}, h(Markdown, { source: content })),
            input('.btn.btn-primary.btn-block', {
                type: 'submit',
                value: 'Publicar ahora',
                className: classNames({ loading: publisher.saving }),
            }),
        ]),
    ]);
}

export default withState(injectState(Publisher));
