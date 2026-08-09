import { useEffect, useState } from 'react';
import {
	DefaultSidebar,
	Excalidraw,
	MainMenu,
	THEME,
	WelcomeScreen,
} from '@excalidraw/excalidraw';
import { app, isFriday, type AppThemeData } from '@friday/sdk';

const fallbackTheme: AppThemeData = {
	themeMode: 'light',
	isDark: false,
	colors: {},
};

export default function App() {
	const [theme, setTheme] = useState<AppThemeData>(fallbackTheme);

	useEffect(() => {
		if (!isFriday()) return;

		let active = true;
		app
			.getThemeData()
			.then((themeData) => {
				if (active) setTheme(themeData);
			})
			.catch(() => undefined);

		const unsubscribe = app.onThemeModeChanged((themeData) => {
			if (active) setTheme(themeData);
		});

		return () => {
			active = false;
			unsubscribe();
		};
	}, []);

	return (
		<main className="draw">
			<Excalidraw
				autoFocus
				handleKeyboardGlobally
				name="Draw"
				showDeprecatedFonts
				theme={theme.isDark ? THEME.DARK : THEME.LIGHT}
				UIOptions={{
					canvasActions: {
						changeViewBackgroundColor: true,
						clearCanvas: true,
						export: false,
						loadScene: false,
						saveAsImage: false,
						saveToActiveFile: false,
						toggleTheme: false,
					},
					tools: {
						image: true,
					},
				}}
			>
				<MainMenu>
					<MainMenu.DefaultItems.CommandPalette />
					<MainMenu.DefaultItems.SearchMenu />
					<MainMenu.DefaultItems.Help />
					<MainMenu.DefaultItems.ClearCanvas />
					<MainMenu.Separator />
					<MainMenu.DefaultItems.ChangeCanvasBackground />
				</MainMenu>
				<DefaultSidebar />
				<WelcomeScreen>
					<WelcomeScreen.Hints.MenuHint />
					<WelcomeScreen.Hints.ToolbarHint />
					<WelcomeScreen.Hints.HelpHint />
					<WelcomeScreen.Center>
						<WelcomeScreen.Center.Logo>Draw</WelcomeScreen.Center.Logo>
						<WelcomeScreen.Center.Heading>
							Sketch, connect, and explore ideas.
						</WelcomeScreen.Center.Heading>
						<WelcomeScreen.Center.Menu>
							<WelcomeScreen.Center.MenuItemHelp />
						</WelcomeScreen.Center.Menu>
					</WelcomeScreen.Center>
				</WelcomeScreen>
			</Excalidraw>
		</main>
	);
}
