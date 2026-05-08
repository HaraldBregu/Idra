import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { TasksDialog } from '@/components/app/dialogs/TasksDialog';
import { LogDialog } from '@/components/app/dialogs/LogDialog';
import { CronDialog } from '@/components/app/dialogs/CronDialog';

interface DebugDialogsContextValue {
	openTasksDialog: () => void;
	openLogDialog: () => void;
	openCronDialog: () => void;
}

const DebugDialogsContext = createContext<DebugDialogsContextValue | undefined>(undefined);

export function DebugDialogsProvider({ children }: { children: ReactNode }) {
	const [tasksOpen, setTasksOpen] = useState(false);
	const [logOpen, setLogOpen] = useState(false);
	const [cronOpen, setCronOpen] = useState(false);

	const openTasksDialog = useCallback(() => setTasksOpen(true), []);
	const openLogDialog = useCallback(() => setLogOpen(true), []);
	const openCronDialog = useCallback(() => setCronOpen(true), []);

	useEffect(() => {
		const unsubTasks =
			typeof window.app?.onOpenTasksDialog === 'function'
				? window.app.onOpenTasksDialog(openTasksDialog)
				: undefined;
		const unsubLogs =
			typeof window.app?.onOpenLogsDialog === 'function'
				? window.app.onOpenLogsDialog(openLogDialog)
				: undefined;
		const unsubCron =
			typeof window.app?.onOpenCronDialog === 'function'
				? window.app.onOpenCronDialog(openCronDialog)
				: undefined;
		return () => {
			unsubTasks?.();
			unsubLogs?.();
			unsubCron?.();
		};
	}, [openTasksDialog, openLogDialog, openCronDialog]);

	return (
		<DebugDialogsContext.Provider value={{ openTasksDialog, openLogDialog, openCronDialog }}>
			{children}
			<TasksDialog open={tasksOpen} onOpenChange={setTasksOpen} />
			<LogDialog open={logOpen} onOpenChange={setLogOpen} />
			<CronDialog open={cronOpen} onOpenChange={setCronOpen} />
		</DebugDialogsContext.Provider>
	);
}

export function useDebugDialogs(): DebugDialogsContextValue {
	const ctx = useContext(DebugDialogsContext);
	if (!ctx) throw new Error('useDebugDialogs must be used within DebugDialogsProvider');
	return ctx;
}
