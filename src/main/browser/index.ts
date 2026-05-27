import { BrowserService } from './service';
import { createBrowserTool } from './tool';

export { BrowserService } from './service';
export { createBrowserTool } from './tool';
export { validateUrl } from './policy';

const _service = new BrowserService();
export const browserTool = createBrowserTool(_service);
