import { useState } from 'react';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';

const tags = helpers(h);
const { div, img, i, a, p } = tags;
const { span, h2, form, input, label, textarea } = tags;

export function GeneralConfig({ state, setOpen, effects }) {
    const { site } = state;
    const [nav, setNav] = useState(site.nav);
    const [changes, setChanges] = useState({});
    const dirty = Object.keys(changes).length > 0 || nav !== site.nav;

    function swapNavLink(from, to) {
        const a = nav[from];
        const b = nav[to];
        const copy = nav.slice();
        copy[from] = b;
        copy[to] = a;
        setNav(copy);
    }

    function newNavLink() {
        const link = {
            name: '',
            href: '',
        };
        setNav(nav.concat(link));
    }

    function deleteNavLink(index) {
        const filtered = nav.filter((_, k) => k !== index);
        setNav(filtered);
    }

    function updateNavLink(index, field, value) {
        const link = nav[index];
        const copy = nav.slice();
        copy[index] = {
            ...link,
            [field]: value,
        };
        setNav(copy);
    }

    function onSubmit(event) {
        event.preventDefault();
        const config = {
            ...changes,
            nav,
        };
        effects.updateSiteConfig(config);
        setOpen(false);
    }

    function cancelConfigEdition() {
        setChanges({});
        setNav(site.nav);
    }

    return form('.flex-auto.pa3.overflow-container', { onSubmit }, [
        div([
            div('.flex.header.justify-end', [
                h2('.flex-auto', t`General`),
                dirty === true &&
                    span('.fixed.z-9999', [
                        span([
                            input('.btn.btn-primary.mr2', {
                                type: 'submit',
                                value: t`Guardar cambios`,
                            }),
                        ]),
                        span([
                            input('.btn', {
                                type: 'button',
                                value: t`Cancelar`,
                                onClick: cancelConfigEdition,
                            }),
                        ]),
                    ]),
            ]),
            div('.form-group', [
                label('.b.form-label', t`Nombre del sitio`),
                input('.form-input', {
                    name: 'name',
                    type: 'text',
                    placeholder: t`Ej. Comunidad de Anzu`,
                    required: true,
                    value: 'name' in changes ? changes.name : site.name,
                    onChange: event =>
                        setChanges({
                            ...changes,
                            name: event.target.value,
                        }),
                }),
                p(
                    '.form-input-hint',
                    t`Mostrado alrededor del sitio, el nombre de tu comunidad.`
                ),
            ]),
            div('.form-group', [
                label('.b.form-label', t`Descripción del sitio`),
                textarea('.form-input', {
                    value:
                        'description' in changes
                            ? changes.description
                            : site.description,
                    onChange: event =>
                        setChanges({
                            ...changes,
                            description: event.target.value,
                        }),
                    name: 'description',
                    placeholder: '...',
                    rows: 3,
                }),
                p(
                    '.form-input-hint',
                    t`Para metadatos, resultados de busqueda y dar a conocer tu comunidad.`
                ),
            ]),
            div('.form-group', [
                label('.b.form-label', t`Dirección del sitio`),
                input('.form-input', {
                    name: 'url',
                    type: 'text',
                    placeholder: t`Ej. https://comunidad.anzu.io`,
                    required: true,
                    value: 'url' in changes ? changes.url : site.url,
                    onChange: event =>
                        setChanges({
                            ...changes,
                            url: event.target.value,
                        }),
                }),
                p(
                    '.form-input-hint.lh-copy',
                    'URL absoluta donde vive la instalación de Anzu. Utilizar una dirección no accesible puede provocar no poder acceder al sitio.'
                ),
            ]),
        ]),
        div('.bt.b--light-gray.pt2', [
            div('.form-group', [
                label('.b.form-label', t`Menú de navegación`),
                p(
                    '.form-input-hint',
                    t`Mostrado en la parte superior del sitio. (- = +)`
                ),
                div(
                    nav
                        .map((link, k) => {
                            return div(
                                '.input-group.mb2.fade-in',
                                { key: `link-${k}` },
                                [
                                    a(
                                        '.btn.btn-icon.pointer.mr1',
                                        {
                                            onClick: () =>
                                                k > 0 && swapNavLink(k, k - 1),
                                        },
                                        i('.icon-up-outline')
                                    ),
                                    a(
                                        '.btn.btn-icon.pointer.mr1',
                                        {
                                            onClick: () =>
                                                k < nav.length - 1 &&
                                                swapNavLink(k, k + 1),
                                        },
                                        i('.icon-down-outline')
                                    ),
                                    input('.form-input', {
                                        dataset: { id: String(k) },
                                        name: 'name',
                                        type: 'text',
                                        placeholder: '...',
                                        value: link.name,
                                        onChange: event =>
                                            updateNavLink(
                                                k,
                                                'name',
                                                event.target.value
                                            ),
                                        required: true,
                                    }),
                                    input('.form-input', {
                                        dataset: { id: String(k) },
                                        name: 'href',
                                        type: 'text',
                                        placeholder: '...',
                                        value: link.href,
                                        onChange: event =>
                                            updateNavLink(
                                                k,
                                                'href',
                                                event.target.value
                                            ),
                                        required: true,
                                    }),
                                    a(
                                        '.btn.btn-icon.pointer.ml1',
                                        {
                                            onClick: () =>
                                                nav.length > 1 &&
                                                deleteNavLink(k),
                                        },
                                        i('.icon-trash')
                                    ),
                                ]
                            );
                        })
                        .concat([
                            h('div.tc.mt2', {}, [
                                h([
                                    span(
                                        '.btn.btn-icon.pointer.mb3',
                                        { onClick: newNavLink },
                                        i('.icon-plus')
                                    ),
                                ]),
                            ]),
                        ])
                ),
            ]),
        ]),
    ]);
}
