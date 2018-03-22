import { h, section, h1, p, div, h2, a, span, h3, input, i } from '@cycle/dom';

export function QuickstartView() {
    return div('.current-article', [
        section([
            h1('Bienvenido a la comunidad de Anzu.'),
            p('Únete a la conversación y aporta ideas para el desarrollo de Anzu, una poderosa plataforma de foros y comunidades enfocada en la discusión e interacción entre usuarios en tiempo real.'),
            div('.separator'),
            h2('Si eres nuevo por aquí'),
            div('.quick-guide', [
                div([
                    h3(a(['Código de conducta ', span('.icon.icon-arrow-right')])),
                    p('Si gustas de contribuir te compartimos los lineamientos que está comunidad sigue por el bien de todos.')
                ]),
                div([
                    h3(a(['Preguntas frecuentes ', span('.icon.icon-arrow-right')])),
                    p('Antes de preguntar algo te pedimos consultar está sección para saber si alguien más ya ha resuelto esa duda.')
                ]),
                div([
                    h3(a(['Desarrollo Libre ', span('.icon.icon-arrow-right')])),
                    p('Anzu es una plataforma de código abierto escrita por apasionados del software! Te invitamos a conocer nuestra misión y unirte.')
                ])
            ])
        ])
    ])
}