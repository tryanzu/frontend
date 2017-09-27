export function ngDriver(ngCallback) {
	return function(ng$) {
		ng$.addListener({
			next: event => ngCallback(event),
			error: err => console.error(err),
			complete: () => console.log('location completed'),
		});
	}
};