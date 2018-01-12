import xs from 'xstream'
import { main, section, ul, li, h1, h2, form, label, input, div, select, option, optgroup, textarea, p, small, i, a } from '@cycle/dom';
import autosize from 'autosize'
import sampleCombine from 'xstream/extra/sampleCombine';

const defaultState = {
    draft: true,
    isQuestion: false,
    disabledComments: false,
    pinned: false,
    hideGuidelines: false,
    title: '',
    content: '',
    category: false,
    step: 0
}

function intent({ DOM, fractal, props }) {
    const title$ = DOM.select('form input#title').events('input')
        .map(event => ({ field: 'title', value: event.target.value }))

    const category$ = DOM.select('form select#category').events('change')
        .map(event => ({ field: 'category', value: event.target.value }))
    
    const checkboxes$ = DOM.select('form input[type="checkbox"]').events('change')
        .map(event => ({ field: event.target.getAttribute('name'), value: event.target.checked }))

    const submit$ = DOM.select('form').events('submit', { preventDefault: true })
        .map(event => (event.currentTarget))

    const routeState$ = props.router$
        .filter(action => (action.page == 'publish'))
        .debug('publisher::intent')

    const form$ = xs.merge(
        title$,
        category$,
        checkboxes$,
    )

    const state$ = fractal.state$.map(state => (state.publisher))
    
    return { form$, submit$, state$, routeState$ }
}

function model(actions) {
    const reducers$ = xs.merge(
        // Default state reducer
        xs.of(state => (defaultState)),

        // Route state
        actions.routeState$.map(action => ({ publisher }) => ({ ...publisher, ...action.location.state})),

        // Map form changes to reducers.
        actions.form$.map(f => ({ publisher }) => ({ ...publisher, [f.field]: f.value })),

        // Next step submits
        actions.submit$.map(e => ({ publisher }) => ({ ...publisher, step: publisher.step + 1 }))
    )

    const history$ = actions.submit$
        .compose(sampleCombine(actions.state$))
        .map(([event, state]) => ({
            type: 'push',
            pathname: '/publicar',
            state
        }))
        .debug()

    return {
        fractal: reducers$,
        history: history$
    }
}

function view(state$) {
    return state$.map(state => {
        const { publisher } = state
        const { title, isQuestion, disabledComments, pinned, step, category } = publisher
        const categories = state.categories || []
        const ready = title.length > 0 && category !== false

        return main('.publish.flex.flex-auto', [
            section('.fade-in.editor.flex.flex-column', [
                ul('.step', [
                    li('.step-item.active', a('Publicación')),
                    li('.step-item', {class: {active: step > 0}}, a('Contenido')),
                    li('.step-item', {class: {active: step > 1}}, a('Revisión final'))
                ]),
                (state => {
                    switch (state.publisher.step) {
                        case 0:
                            return postInfo(state)
                        case 1:
                            return postContent(state)
                    }
                })(state),
            ]),
            section('.fade-in.guidelines.flex.flex-column', {style: {display: 'none'}}, [
                h2('.f4', 'Recuerda estas reglas básicas'),
                div('.timeline', [
                    div('.timeline-item', [
                        div('.timeline-left', a('.timeline-icon')),
                        div('.timeline-content', [
                            p('.b.lh-title.mb1', 'Las publicaciones deben ser relacionados a su categoría'),
                            p('.lh-copy.mb0', 'Si deseas colocar un tema que se salga muy abruptamente de las categorías de la comunidad, te pedimos que utilices la sección de Bar Spartano para hacerlo. Damos la bienvenida a temas de discusión general, pero los rechazamos en las otras secciones.')
                        ])
                    ]),
                    div('.timeline-item', [
                        div('.timeline-left', a('.timeline-icon')),
                        div('.timeline-content', [
                            p('.b.lh-title.mb1', 'Utiliza títulos que expliquen tu publicación'),
                            p('.lh-copy.mb0', 'No publiques títulos poniendo solamente frases como “Ayuda”, “No sé qué hacer”, “xD”, “Recomendación”, o cualquier otra cosa que no explique tu tema. Nuestros algoritmos van a penalizar dichas publicaciones, incluso cuando en la descripción expliques perfectamente tu problema. La única excepción para publicar cualquier título es el Bar Spartano.')
                        ])
                    ]),
                    div('.timeline-item', [
                        div('.timeline-left', a('.timeline-icon')),
                        div('.timeline-content', [
                            p('.b.lh-title.mb1', 'Explica y escribe bien tu tema, pregunta o aportación'),
                            p('.lh-copy.mb0', 'Haz un esfuerzo por leer una vez más el texto donde describes tu pregunta o comentario ANTES DE PUBLICAR. Procura que esté lo mejor explicado que puedas, que no esté incompleto, y que sea fácil de comprender. Todo eso ayuda a que los demás contribuyan y a que aumentes tu reputación en la comunidad.')
                        ])
                    ]),
                    div('.timeline-item', [
                        div('.timeline-left', a('.timeline-icon')),
                        div('.timeline-content', [
                            p('.b.lh-title.mb1', 'Contenido ilegal (torrents, cracks, MP3, P2P, etc)'),
                            p('.lh-copy.mb0', 'Está prohibido cualquier mensaje de solicitud, ayuda o recomendación sobre contenido ilegal. Cualquier mensaje en foros, artículos, perfiles u otra sección pública de la comunidad SpartanGeek.com que contenga dicho material será removido y se evaluará suspender la cuenta.')
                        ])
                    ]),
                    div('.timeline-item', [
                        div('.timeline-left', a('.timeline-icon')),
                        div('.timeline-content', a('.f5', 'Leer reglamento completo'))
                    ]),
                ])
            ])
        ])
    })
}

function postInfo({ categories, publisher }) {
    const { title, isQuestion, disabledComments, pinned, step, category } = publisher
    const ready = title.length > 0 && category !== false

    // Categories are async loaded.
    categories = categories || []

    return div([
        h1('.ma0.pv3.tc', 'Escribir nueva publicación'),
        form('.pv3', { attrs: { id: 'step1' } }, [
            div('.form-group.pb2', [
                label('.b.form-label', 'Titulo de la publicación'),
                input('#title.form-input', { attrs: { type: 'text', value: title, placeholder: 'Escribe el titulo de tu publicación o pregunta...', required: true } })
            ]),
            div('.form-group.pb2', [
                label('.b.form-label.pb0', '¿Es una pregunta?'),
                p('.ma0', small('De esta forma decidimos a quien mostrar tu publicación, a usuarios que responden o a usuarios que buscan respuestas.')),
                div('.form-group',
                    label('.form-switch.normal', [
                        input({ attrs: { type: 'checkbox', name: 'isQuestion', checked: isQuestion } }),
                        i('.form-icon'),
                        'Mi publicación es una pregunta'
                    ]),
                ),
                div('.form-group',
                    label('.form-switch.normal', [
                        input({ attrs: { type: 'checkbox', name: 'disabledComments', checked: disabledComments } }),
                        i('.form-icon'),
                        'No permitir comentarios en esta publicación'
                    ]),
                ),
                div('.form-group',
                    label('.form-switch.normal', [
                        input({ attrs: { type: 'checkbox', name: 'pinned', checked: pinned } }),
                        i('.form-icon'),
                        'Publicar como importante'
                    ]),
                )
            ]),
            div('.form-group.pb2', [
                label('.b.form-label', 'Categoría principal'),
                select('.form-select', { attrs: { id: 'category', required: true } },
                    [
                        option('Selecciona una categoría para tu publicación')
                    ].concat(categories.map(c =>
                        optgroup({ attrs: { label: c.name } },
                            c.subcategories.map(s => option({ attrs: { value: s.id } }, s.name))
                        )
                    ))
                )
            ]),
            input('.btn.btn-primary.btn-block', { attrs: { type: 'submit', value: 'Continuar', disabled: !ready } })
        ])
    ])
}

function postContent({ categories, publisher }) {
    const { title, category } = publisher
    const ready = title.length > 0 && category !== false

    return div([
        h1('.ma0.pv3.tc', 'Escribir nueva publicación'),
        form('.pv3.mt3', { attrs: { id: 'step2' } }, [
            h2('.mt0.mb3', title),
            div('.form-group.pb2', [
                textarea('#content.form-input', { 
                    attrs: { 
                        placeholder: 'Escribe aquí el contenido de tu publicación', 
                        required: true,
                        rows: 8
                    },
                    hook: {
                        insert: vnode => (autosize(vnode.elm))
                    }
                })
            ]),
            input('.btn.btn-primary.btn-block', { attrs: { type: 'submit', value: 'Continuar', disabled: !ready } })
        ])
    ])
}

export function Publisher(sources) {
    const actions = intent(sources)
    const effects = model(actions)
    const vtree$ = view(sources.fractal.state$)

    return {
        fractal: effects.fractal,
        history: effects.history,
        DOM: vtree$
    }
}