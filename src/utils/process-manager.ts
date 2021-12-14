import { ChildProcessMessage } from '../types';
import { ChildProcess, fork } from 'child_process';
import { Observable, Subject } from 'rxjs';

export class ProcessManager {
	private activeProcesses: { [id: string]: ChildProcess } = {};

	run<T>(id: string, command: string): Observable<ChildProcessMessage<T>> {
		const data$ = new Subject<ChildProcessMessage<T>>();
		const commandArray = command.split(' ');

		const childProcess = fork(commandArray[0], commandArray.slice(1));
		this.activeProcesses[id] = childProcess;

		childProcess.on('message', (data: T) => {
			data$.next({
				process: childProcess,
				data,
			});
		});

		childProcess.on('exit', (code) => {
			console.info(`Process exit`, { code, id });
			delete this.activeProcesses[id];
			data$.complete();
		});

		return data$.asObservable();
	}

	isActive(id: string): boolean {
		return id in this.activeProcesses;
	}
}
