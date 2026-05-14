const shell = document.querySelector('.window-shell');
const maximizeButton = document.querySelector('[data-window-action="maximize"]');
const platformBadge = document.querySelector('[data-platform]');
const blurControl = document.querySelector('[data-control="blur"]');
const opacityControl = document.querySelector('[data-control="opacity"]');
const blurValue = document.querySelector('[data-blur-value]');
const opacityValue = document.querySelector('[data-opacity-value]');
const titlebar = document.querySelector('.titlebar');

function setMaximizedState(isMaximized) {
  shell?.classList.toggle('is-maximized', isMaximized);
  maximizeButton?.setAttribute('aria-label', isMaximized ? 'Restore' : 'Maximize');
}

document.querySelectorAll('[data-window-action]').forEach((button) => {
  button.addEventListener('click', async () => {
    const action = button.getAttribute('data-window-action');

    if (action === 'minimize') {
      await window.glassWindow.minimize();
      return;
    }

    if (action === 'maximize') {
      const isMaximized = await window.glassWindow.toggleMaximize();
      setMaximizedState(isMaximized);
      return;
    }

    if (action === 'close') {
      await window.glassWindow.close();
    }
  });
});

titlebar?.addEventListener('dblclick', async (event) => {
  if (event.target.closest('.window-controls')) return;

  const isMaximized = await window.glassWindow.toggleMaximize();
  setMaximizedState(isMaximized);
});

blurControl?.addEventListener('input', () => {
  document.documentElement.style.setProperty('--glass-blur', `${blurControl.value}px`);
  if (blurValue) blurValue.textContent = `${blurControl.value}px`;
});

opacityControl?.addEventListener('input', () => {
  const percent = Number(opacityControl.value);
  document.documentElement.style.setProperty('--glass-opacity', String(percent / 100));
  if (opacityValue) opacityValue.textContent = `${percent}%`;
});

if (opacityControl) {
  const initialOpacity = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--glass-opacity')
  );
  opacityControl.value = String(Math.round(initialOpacity * 100));
  if (opacityValue) opacityValue.textContent = `${opacityControl.value}%`;
}

window.glassWindow.onMaximizedChange(setMaximizedState);

window.glassWindow.isMaximized().then(setMaximizedState);

window.glassWindow.platform().then((details) => {
  shell?.classList.add(`platform-${details.platform}`);

  if (!platformBadge) return;

  const platformNames = {
    darwin: 'macOS',
    win32: 'Windows',
    linux: 'Linux'
  };

  platformBadge.textContent = platformNames[details.platform] ?? details.platform;
});
