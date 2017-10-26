import {h} from '@cycle/dom';

export function Quickstart() {
	return h('div.current-article', [
		h('section', [
			h('h1', 'Bienvenido a la comunidad de Anzu.'),
			h('p', 'Únete a la conversación y aporta ideas para el desarrollo de Anzu, una poderosa plataforma de foros y comunidades enfocada en la discusión e interacción entre usuarios en tiempo real.'),
			h('div.separator'),
			h('h2', 'Si eres nuevo por aquí'),
			h('div.quick-guide', [
				h('div', [
					h('h3', h('a', ['Código de conducta ', h('span.icon.icon-arrow-right')])),
					h('p', 'Si gustas de contribuir te compartimos los lineamientos que está comunidad sigue por el bien de todos.')
				]),
				h('div', [
					h('h3', h('a', ['Preguntas frecuentes ', h('span.icon.icon-arrow-right')])),
					h('p', 'Antes de preguntar algo te pedimos consultar está sección para saber si alguien más ya ha resuelto esa duda.')
				]),
				h('div', [
					h('h3', h('a', ['Desarrollo Libre ', h('span.icon.icon-arrow-right')])),
					h('p', 'Anzu es una plataforma de código abierto escrita por apasionados del software! Te invitamos a conocer nuestra misión y unirte.')
				])
			])
		])
	]);
}