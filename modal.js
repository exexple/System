// ==================== STYLED MODAL SYSTEM ====================

function showModal(message, title = 'Info', icon = '') {
    let modal = document.getElementById('customModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customModal';
        modal.style = "position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(12,13,24,0.8);z-index:10000;display:flex;align-items:center;justify-content:center";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div style="background:linear-gradient(145deg,#13151f,#1a1c2e);padding:36px;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.6);max-width:420px;text-align:center;border:1px solid #2a2c3e">
            <div style="font-size:60px;margin-bottom:16px">${icon}</div>
            <h2 style="color:#32b8c6;font-size:26px;margin-bottom:12px;font-weight:600">${title}</h2>
            <p style="color:#c8cbd9;font-size:16px;line-height:1.6;margin-bottom:28px">${message}</p>
            <button onclick="closeModal()" style="background:linear-gradient(135deg,#32b8c6,#21808d);color:#fff;padding:14px 40px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.3s;box-shadow:0 4px 12px rgba(50,184,198,0.3)">
                Got it!
            </button>
        </div>
    `;
}

function closeModal() {
    const modal = document.getElementById('customModal');
    if (modal) modal.remove();
}