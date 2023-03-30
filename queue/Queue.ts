import { NiceThread } from '../mod.ts';
import type { QueueInitInput, QueueJobInput, QueueWorkerInput } from './types.ts';

export class Queue {
	// deno-lint-ignore require-await
	#thread = new NiceThread(async (input: QueueInitInput | QueueJobInput) => {
		const messageHandler: (e: MessageEvent) => void = workerCache.get('messageHandler') ?? ((event: MessageEvent) => {
			const messageInput: QueueJobInput | QueueWorkerInput = event.data;
			switch (messageInput.category) {
				case 'JOB':
					jobHandler(messageInput);
					break;
				case 'WORKER':
					workerHandler(messageInput);
					break;
			}
		});
		workerCache.set('messageHandler', messageHandler);
		const queueHandler: (j: QueueInitInput) => void = workerCache.get('queueHandler') ??
			((queueInput: QueueInitInput) => {
				switch (queueInput.command) {
					case 'INIT': {
						if (workerCache.has(queueInput.name)) {
							workerCache.set(queueInput.name, true);
							const channel = new BroadcastChannel(queueInput.name);
							channel.addEventListener('message', messageHandler);
							workerCache.set('channel', channel);
						}
						break;
					}
					case 'TERMINATE': {
						if (workerCache.has(queueInput.name)) {
							const channel: BroadcastChannel = workerCache.get('channel');
							channel.removeEventListener('message', messageHandler);
							workerCache.delete('channel');
							workerCache.delete(queueInput.name);
						}
						break;
					}
				}
			});
		workerCache.set('queueHandler', queueHandler);
		const workerHandler: (j: QueueWorkerInput) => void = workerCache.get('workerHandler') ??
			((workerInput: QueueWorkerInput) => {
				switch (workerInput.command) {
					case 'SUBSCRIBE': {
						break;
					}
					case 'UNSUBSCRIBE': {
						break;
					}
				}
			});
		workerCache.set('workerHandler', workerHandler);
		const jobHandler: (j: QueueJobInput) => void = workerCache.get('jobHandler') ?? ((jobInput: QueueJobInput) => {
			switch (jobInput.command) {
				case 'ADD': {
					break;
				}
				case 'REMOVE': {
					break;
				}
			}
		});
		workerCache.set('jobHandler', jobHandler);
		switch (input.category) {
			case 'JOB':
				jobHandler(input);
				break;
			case 'QUEUE':
				queueHandler(input);
				break;
		}
	});
}
