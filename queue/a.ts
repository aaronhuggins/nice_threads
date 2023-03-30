import { NiceThread } from '../mod.ts';

const thread1 = new NiceThread(async (input: string) => {
	if (input === 'init' && !workerCache.has('channel')) {
		const channel = new BroadcastChannel('paint');
		channel.addEventListener('message', (event) => {
			console.log(event.data);
		});
		workerCache.set('channel', channel);
	} else {
		const channel: BroadcastChannel = workerCache.get('channel');
		await channel.postMessage(input);
	}
});
const thread2 = new NiceThread(async (input: string) => {
	if (input === 'init' && !workerCache.has('channel')) {
		const channel = new BroadcastChannel('paint');
		channel.addEventListener('message', (event) => {
			console.log(event.data);
		});
		workerCache.set('channel', channel);
	} else {
		const channel: BroadcastChannel = workerCache.get('channel');
		await channel.postMessage(input);
	}
});

await thread1.call('init');
await thread2.call('init');

await thread2.call('hello');
await thread1.call('world!');

setTimeout(() => {
	thread1.terminate();
	thread2.terminate();
}, 300);

/* const channel = new MessageChannel();

channel.port1.addEventListener('message', (event) => {
	console.log(event.data);
	setTimeout(() => {
		channel.port1.close();
	}, 300);
});

channel.port2.addEventListener('message', (event) => {
	console.log(event.data);
	setTimeout(() => {
		channel.port2.close();
	}, 300);
});

channel.port1.start();
channel.port2.start();

channel.port2.postMessage('hello');
channel.port1.postMessage('world!'); */
