import xs from 'xstream'
import { h, div, span, nav, a, img, i, h2, p, form, label, input, textarea } from '@cycle/dom'

export function ConfigModal({ DOM, HTTP }) {
    /**
     * View computation.
     */
    const vdom$ = xs.of({ title: 'Anzu' }).map((state) => {
        return div('.modal-container.config', { style:  { width: '640px' } }, [
            div('.flex', [
                nav([
                    a(img('.w3', { attrs: { src: '/images/anzu.svg', alt: 'Anzu' } })),
                    a('.active', [i('.icon-cog.mr1'), 'General']),
                    a([i('.icon-th-list-outline.mr1'), 'Categorias']),
                    a([i('.icon-lock-open.mr1'), 'Permisos']),
                    a([i('.icon-picture-outline.mr1'), 'Diseño'])
                ]),
                div('.flex-auto', [
                    h2('General'),
                    form({ attrs: { id: 'update-post' } }, [
                        div('.form-group', [
                            label('.b.form-label', 'Nombre del sitio'),
                            input('#title.form-input', { attrs: { type: 'text', placeholder: 'Ej. Comunidad de Anzu', required: true } }),
                            p('.form-input-hint', 'Mostrado alrededor del sitio, el nombre de tu comunidad.')
                        ]),
                        div('.form-group', [
                            label('.b.form-label', 'Descripción del sitio'),
                            textarea('#content.form-input', {
                                attrs: {
                                    placeholder: '...',
                                    rows: 3
                                }
                            }),
                            p('.form-input-hint', 'Para metadatos, resultados de busqueda y dar a conocer tu comunidad.')
                        ]),
                    ]),
                    form('.bt.b--light-gray.pt2', { attrs: { id: 'links' } }, [
                        div('.form-group', [
                            label('.b.form-label', 'Menu de navegación'),
                            input('#title.form-input', { attrs: { type: 'text', placeholder: 'Ej. Comunidad de Anzu', required: true } }),
                            p('.form-input-hint', 'Mostrado alrededor del sitio, el nombre de tu comunidad.')
                        ])
                    ])
                ])
            ])
        ])
    })

    return {
        DOM: vdom$,
    }
}