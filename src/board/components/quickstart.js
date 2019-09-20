import h from 'react-hyperscript';
import RichTextEditor from 'react-rte';
import { MemoizedMarkdown } from '../utils';
import { useState } from 'react';
import helpers from 'hyperscript-helpers';
import { adminTools } from '../../acl';
import { t } from '../../i18n';

const { section, h1, p, div, h2, a, span, h3, article } = helpers(h);
const { form, label, input, button, textarea } = helpers(h);

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
    return div('.current-article', [
        article([h(Quickstart, { state, effects })]),
    ]);
}

function QuickstartLink({ link, onUpdate }) {
    const [updating, setUpdating] = useState(false);
    const [href, setHref] = useState(link.href);
    const [name, setName] = useState(link.name);
    const [description, setDescription] = useState(link.description);

    function onSubmit(event) {
        event.preventDefault();
        onUpdate({
            name,
            description,
            href,
        });
        return setUpdating(false);
    }
    return div('.tile-quickstart.di', [
        h3('.flex', {}, [
            updating === false &&
                a('.pointer.flex-auto', { href: link.href }, [
                    link.name + ' ',
                    span('.icon.icon-arrow-right'),
                ]),
            updating === true &&
                form('.pv3', { onSubmit }, [
                    div('.form-group.flex-auto', [
                        label('.b.form-label', t`Nombre de la sección`),
                        input('.form-input', {
                            name: 'link-name',
                            type: 'text',
                            value: name,
                            placeholder: t`Escribe un saludo de bienvenida o un título`,
                            onChange: event => setName(event.target.value),
                        }),
                        label('.b.form-label', t`Vínculo`),
                        input('.form-input', {
                            name: 'link-href',
                            type: 'text',
                            value: href,
                            placeholder: t`Escribe un saludo de bienvenida o un título`,
                            onChange: event => setHref(event.target.value),
                        }),
                        label('.b.form-label', t`Descripción`),
                        textarea('.form-input', {
                            name: 'link-des',
                            type: 'text',
                            value: description,
                            placeholder: t`Escribe un saludo de bienvenida o un título`,
                            onChange: event =>
                                setDescription(event.target.value),
                            rows: 4,
                        }),
                    ]),
                    div('.pv2', [
                        button(
                            '.btn.btn-primary.input-group-btn',
                            {
                                type: 'submit',
                            },
                            t`Guardar cambios`
                        ),
                        button(
                            '.btn.input-group-btn',
                            {
                                type: 'cancel',
                                onClick: () => setUpdating(false),
                            },
                            t`Cancelar`
                        ),
                    ]),
                ]),
            updating === false &&
                div('.tile-actions-q', [
                    a(
                        '.pointer.post-action',
                        { onClick: () => setUpdating(true) },
                        [span('.dib.icon-edit')]
                    ),
                ]),
        ]),
        updating === false && p(link.description),
    ]);
}

function Quickstart({ state, effects }) {
    const { user } = state.auth;
    const { site } = state;
    const quickstart = site.quickstart || {};
    const links = quickstart.links || DEFAULT_LINKS;
    const [title, setTitle] = useState(quickstart.headline);
    const [content, setContent] = useState(() =>
        RichTextEditor.createValueFromString(
            quickstart.description || '',
            'markdown'
        )
    );
    const [updating, setUpdating] = useState(false);

    function onUpdate(changes = {}) {
        const updated = {
            ...quickstart,
            ...changes,
        };
        effects.updateQuickstart(updated).then(() => setUpdating(false));
    }

    function onSubmit(event) {
        event.preventDefault();
        const markdown = content.toString('markdown');
        onUpdate({
            headline: title,
            description: markdown,
        });
    }

    return div('.flex-auto', [
        section([
            div('.flex.tile-quickstart.items-center', [
                div('.flex-auto', [
                    updating !== 'headline' &&
                        h1(
                            quickstart.headline ||
                                'Bienvenido a la comunidad de Anzu.'
                        ),
                    updating === 'headline' &&
                        form('.pv3', { onSubmit }, [
                            div('.form-group.pb2', [
                                label(
                                    '.b.form-label',
                                    t`Título o saludo de Bienvenida`
                                ),
                                input('.form-input', {
                                    name: 'title',
                                    maxlenght: '40',
                                    type: 'text',
                                    value: title,
                                    placeholder: t`Escribe un saludo de bienvenida o un título`,
                                    onChange: event =>
                                        setTitle(event.target.value),
                                }),
                            ]),
                            div('.pv2', [
                                button(
                                    '.btn.btn-primary.input-group-btn',
                                    {
                                        type: 'submit',
                                    },
                                    t`Guardar cambios`
                                ),
                                button(
                                    '.btn.input-group-btn',
                                    {
                                        type: 'cancel',
                                        onClick: () => setUpdating(false),
                                    },
                                    t`Cancelar`
                                ),
                            ]),
                        ]),
                ]),
                adminTools({ user }) &&
                    updating !== 'headline' &&
                    div('.tile-actions-q', [
                        a(
                            '.pointer.post-action',
                            { onClick: () => setUpdating('headline') },
                            [span('.dib.icon-edit')]
                        ),
                    ]),
            ]),
            div('.flex.tile-quickstart', [
                div('.flex-auto', [
                    updating !== 'description' &&
                        h(MemoizedMarkdown, {
                            content:
                                quickstart.description ||
                                'Únete a la conversación y aporta ideas para el desarrollo de Anzu, una poderosa plataforma de foros y comunidades enfocada en la discusión e interacción entre usuarios en tiempo real.',
                        }),
                    updating === 'description' &&
                        form('.pv3', { onSubmit }, [
                            div('.form-group.pb2', [
                                label('.b.form-label', t`Descripción`),
                                h(RichTextEditor, {
                                    value: content,
                                    onChange: setContent,
                                    placeholder: t`Escribe aquí la descripción de tu sitio.`,
                                }),
                            ]),
                            div('.pv2', [
                                button(
                                    '.btn.btn-primary.input-group-btn',
                                    {
                                        type: 'submit',
                                    },
                                    t`Guardar cambios`
                                ),
                                button(
                                    '.btn.input-group-btn',
                                    {
                                        type: 'cancel',
                                        onClick: () => setUpdating(false),
                                    },
                                    t`Cancelar`
                                ),
                            ]),
                        ]),
                ]),
                adminTools({ user }) &&
                    updating !== 'description' &&
                    div('.tile-actions-q', [
                        a(
                            '.pointer.post-action',
                            { onClick: () => setUpdating('description') },
                            [span('.dib.icon-edit')]
                        ),
                    ]),
            ]),
            div('.separator'),
            h2([t`Si eres nuevo por aquí`]),
            div(
                '.quick-guide',
                links.map((link, index) =>
                    h(QuickstartLink, {
                        link,
                        state,
                        effects,
                        onUpdate: link => {
                            onUpdate({
                                links: links.map(
                                    (one, k) => (k === index ? link : one)
                                ),
                            });
                        },
                    })
                )
            ),
        ]),
    ]);
}
