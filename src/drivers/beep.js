export function beepDriver(events$) {
	events$.addListener({
        next: event => {
        	const audio = new Audio('/sounds/notification.mp3');
        	audio.play();
        },
        error: err => console.error(err),
        complete: () => console.log('beep completed'),
    });
}
