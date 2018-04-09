import xs from 'xstream'
import { h, div, span, nav, a, img, i, h2, p, form, label, input, textarea } from '@cycle/dom'

export function ConfigModal({ fractal, DOM, HTTP }) {
    const siteFields$ = DOM.select('#update-site input').events('input')
        .map((event) => ({ [event.target.name]: event.target.value }))

    const reducers$ = xs.merge(
        siteFields$.map(changes => (state => ({
            ...state,
            config: {
                dirty: true,
                site: {
                    ...state.config.site,
                    ...changes
                }
            }
        })))
    )

    /**
     * View computation.
     */
    const vdom$ = fractal.state$.map(state => {
        const { config } = state
        const dirty = config.dirty || false
        const site = config.site || {}

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
                    form({ attrs: { id: 'update-site' } }, [
                        div('.flex', [
                            h2('.flex-auto', 'General'),
                            dirty !== false
                                ? div([
                                    input('.btn.btn-primary.btn-block', { attrs: { type: 'submit', value: 'Guardar ahora' } })
                                ])
                                : null
                        ]),
                        div('.form-group', [
                            label('.b.form-label', 'Nombre del sitio'),
                            input('.form-input', {
                                attrs: { 
                                    name: 'name',
                                    type: 'text', 
                                    placeholder: 'Ej. Comunidad de Anzu', 
                                    required: true,
                                    value: site.name
                                } 
                            }),
                            p('.form-input-hint', 'Mostrado alrededor del sitio, el nombre de tu comunidad.')
                        ]),
                        div('.form-group', [
                            label('.b.form-label', 'Descripción del sitio'),
                            textarea('.form-input', {
                                attrs: {
                                    name: 'description',
                                    placeholder: '...',
                                    rows: 3
                                }
                            }, site.description),
                            p('.form-input-hint', 'Para metadatos, resultados de busqueda y dar a conocer tu comunidad.')
                        ]),
                    ]),
                    form('.bt.b--light-gray.pt2', { attrs: { id: 'links' } }, [
                        div('.form-group', [
                            label('.b.form-label', 'Menu de navegación'),
                            p('.form-input-hint', 'Mostrado en la parte superior del sitio. (- = +)'),
                            div(
                                state.site.nav.map((link) => {
                                    return div('.input-group.mb2', { key: link.href }, [
                                        span('.input-group-addon', i('.icon-up-outline')),
                                        span('.input-group-addon', i('.icon-down-outline')),
                                        input('.form-input', { attrs: { type: 'text', placeholder: '...', value: link.name, required: true } }),
                                        input('.form-input', { attrs: { type: 'text', placeholder: '...', value: link.href, required: true } })
                                    ])
                                })
                            ),
                        ])
                    ])
                ])
            ])
        ])
    })

    return {
        DOM: vdom$,
        fractal: reducers$
    }
}