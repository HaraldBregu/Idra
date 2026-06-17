import { jsx as _jsx } from "react/jsx-runtime";
import { RouterProvider } from 'react-router-dom';
import { AppProvider } from './contexts';
import { ErrorBoundary } from './components/app/base/ErrorBoundary';
import { router } from './router';
import './index.css';
const App = () => {
    return (_jsx(ErrorBoundary, { level: "root", children: _jsx(AppProvider, { children: _jsx(RouterProvider, { router: router }) }) }));
};
export default App;
