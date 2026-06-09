interface IpcError {
	success: false;
	error: {
		code: string;
		message: string;
		stack?: string;
	};
}

interface IpcSuccess<T> {
	success: true;
	data: T;
}

export type IpcResult<T> = IpcSuccess<T> | IpcError;
