import h from 'react-hyperscript';
import Modal from 'react-modal';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';

const tags = helpers(h);
const { div, img, i, nav, a, p } = tags;
const { span, h2, form, input, label, textarea } = tags;

export function ConfigModal({ state, setOpen }) {
    const { site } = state;
    const dirty = false;
    return h(
        Modal,
        {
            isOpen: true,
            onRequestClose: () => setOpen(false),
            ariaHideApp: false,
            contentLabel: t`Configuración`,
            className: 'config-modal',
            style: {
                overlay: {
                    zIndex: 301,
                    backgroundColor: 'rgba(0, 0, 0, 0.30)',
                },
            },
        },
        div('.modal-container.config.fade-in', { style: { width: '640px' } }, [
            div('.flex', [
                nav([
                    a([
                        img('.w3', {
                            src: '/images/anzu.svg',
                            alt: 'Anzu',
                        }),
                    ]),
                    a('.active', [i('.icon-cog.mr1'), 'General']),
                    a([i('.icon-th-list-outline.mr1'), 'Categorias']),
                    a([i('.icon-lock-open.mr1'), 'Permisos']),
                    a([i('.icon-picture-outline.mr1'), 'Diseño']),
                ]),
                div('.flex-auto', [
                    form({ id: 'update-site' }, [
                        div('.flex.items-center.header', [
                            h2('.flex-auto', 'General'),
                            dirty === true &&
                                span([
                                    input('.btn.btn-primary.btn-block', {
                                        type: 'submit',
                                        value: 'Guardar cambios',
                                    }),
                                ]),
                        ]),
                        div('.form-group', [
                            label('.b.form-label', 'Nombre del sitio'),
                            input('.form-input', {
                                name: 'name',
                                type: 'text',
                                placeholder: 'Ej. Comunidad de Anzu',
                                required: true,
                                value: site.name,
                            }),
                            p(
                                '.form-input-hint',
                                'Mostrado alrededor del sitio, el nombre de tu comunidad.'
                            ),
                        ]),
                        div('.form-group', [
                            label('.b.form-label', 'Descripción del sitio'),
                            textarea('.form-input', {
                                value: site.description,
                                name: 'description',
                                placeholder: '...',
                                rows: 3,
                            }),
                            p(
                                '.form-input-hint',
                                'Para metadatos, resultados de busqueda y dar a conocer tu comunidad.'
                            ),
                        ]),
                        div('.form-group', [
                            label('.b.form-label', 'Dirección del sitio'),
                            input('.form-input', {
                                name: 'url',
                                type: 'text',
                                placeholder: 'Ej. https://comunidad.anzu.io',
                                required: true,
                                value: site.url,
                            }),
                            p(
                                '.form-input-hint.lh-copy',
                                'URL absoluta donde vive la instalación de Anzu. Utilizar una dirección no accesible puede provocar no poder acceder al sitio.'
                            ),
                        ]),
                    ]),
                    form('.bt.b--light-gray.pt2', { id: 'links' }, [
                        div('.form-group', [
                            label('.b.form-label', 'Menu de navegación'),
                            p(
                                '.form-input-hint',
                                'Mostrado en la parte superior del sitio. (- = +)'
                            ),
                            div(
                                site.nav.map((link, k) => {
                                    return div(
                                        '.input-group.mb2.fade-in',
                                        { key: `link-${k}` },
                                        [
                                            span(
                                                '.input-group-addon',
                                                {},
                                                i('.icon-up-outline')
                                            ),
                                            span(
                                                '.input-group-addon',
                                                {},
                                                i('.icon-down-outline')
                                            ),
                                            input('.form-input', {
                                                dataset: { id: String(k) },
                                                name: 'name',
                                                type: 'text',
                                                placeholder: '...',
                                                value: link.name,
                                                required: true,
                                            }),
                                            input('.form-input', {
                                                dataset: { id: String(k) },
                                                name: 'href',
                                                type: 'text',
                                                placeholder: '...',
                                                value: link.href,
                                                required: true,
                                            }),
                                        ]
                                    );
                                })
                            ),
                        ]),
                    ]),
                ]),
            ]),
        ])
    );
}
