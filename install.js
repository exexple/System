let deferredPrompt;
let installButton;

// Wait for DOM to load
window.addEventListener('DOMContentLoaded', () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('Service Worker registered'))
      .catch((err) => console.log('Service Worker registration failed:', err));
  }

  // Create install button
  createInstallButton();

  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  // Listen for successful install
  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully!');
    hideInstallButton();
    deferredPrompt = null;
  });
});

function createInstallButton() {
  installButton = document.createElement('button');
  installButton.id = 'installBtn';
  installButton.textContent = '📱 Install App';
  installButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 15px 25px;
    background: linear-gradient(135deg, #9D00FF, #C77DFF);
    border: none;
    border-radius: 50px;
    color: white;
    font-weight: bold;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(157, 0, 255, 0.6);
    z-index: 1000;
    display: none;
    animation: pulse 2s infinite;
  `;
  
  installButton.addEventListener('click', installApp);
  document.body.appendChild(installButton);
  
  // Add pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `;
  document.head.appendChild(style);
}

function showInstallButton() {
  if (installButton) {
    installButton.style.display = 'block';
  }
}

function hideInstallButton() {
  if (installButton) {
    installButton.style.display = 'none';
  }
}

async function installApp() {
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    console.log('User accepted install');
  } else {
    console.log('User dismissed install');
  }
  
  deferredPrompt = null;
  hideInstallButton();
}