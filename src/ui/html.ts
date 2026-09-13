/**
 * Returns the full HTML for the Polyglot Keeper visual locale editor SPA.
 * The entire UI (CSS + JS) is inlined so the server needs no static assets.
 */
export const getHtml = (): string => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Polyglot Keeper — Visual Editor</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0f1419;
  --surface:#161b22;
  --chrome:#1a1f26;
  --chrome-elevated:#212730;
  --surface-hover:rgba(255,255,255,0.06);
  --line:rgba(255,255,255,0.08);
  --line-strong:rgba(255,255,255,0.16);
  --text:#e6edf3;
  --muted:#8b949e;
  --dim:#6e7681;
  --error:#f87171;
  --error-dim:rgba(248,113,113,0.12);
  --warning:#fbbf24;
  --warning-dim:rgba(251,191,36,0.12);
  --success:#22c55e;
  --success-dim:rgba(34,197,94,0.12);
  --accent:#8b5cf6;
  --accent-hover:#9d74f7;
  --accent-dim:rgba(139,92,246,0.15);
  --accent-dim2:rgba(139,92,246,0.08);
  --accent-glow:rgba(139,92,246,0.3);
  --mono:#c9d1d9;
  --radius:8px;
  --radius-sm:6px;
  --radius-xs:4px;
}
html,body{
  height:100%;background:var(--bg);color:var(--text);
  font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
::selection{background:var(--accent-dim);color:var(--accent-hover)}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.14);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.22)}

/* ─── App Container ───────────────────────────────────────── */
#app{display:flex;flex-direction:column;height:100vh;overflow:hidden;background:var(--bg)}

/* ─── Header ─────────────────────────────────────────────── */
#header{
  display:flex;align-items:center;gap:14px;padding:0 20px;height:54px;
  background:var(--surface);border-bottom:1px solid var(--line);flex-shrink:0;z-index:20;
}
#header-logo{
  display:flex;align-items:center;gap:9px;font-weight:700;font-size:14px;
  color:var(--text);white-space:nowrap;letter-spacing:-0.2px;
}
#header-logo svg{color:var(--accent);flex-shrink:0}
#header-sep{width:1px;height:18px;background:var(--line);flex-shrink:0}
#header-path{
  font-size:12px;color:var(--muted);font-family:'JetBrains Mono',monospace;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px;
}
#header-info{display:flex;align-items:center;gap:8px;margin-left:auto}
.badge{
  display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:var(--radius-xs);
  font-size:11px;font-weight:500;border:1px solid transparent;white-space:nowrap;
}
.badge-provider{
  background:var(--chrome);color:var(--muted);border-color:var(--line);
  font-family:'JetBrains Mono',monospace;font-size:11px;
}
.badge-provider strong{color:var(--accent)}
.badge-unsaved{
  background:var(--warning-dim);color:var(--warning);border-color:rgba(251,191,36,0.3);
  font-weight:600;
}
.badge-dot{width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block}

/* ─── Toolbar ────────────────────────────────────────────── */
#toolbar{
  display:flex;align-items:center;gap:10px;padding:10px 20px;
  background:var(--surface);border-bottom:1px solid var(--line);flex-shrink:0;
}
#locale-tabs-wrap{
  display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:2px;
  scrollbar-width:none;-webkit-overflow-scrolling:touch;
}
#locale-tabs-wrap::-webkit-scrollbar{display:none}
#locale-tabs{display:flex;gap:4px;align-items:center}
.locale-tab{
  display:inline-flex;align-items:center;gap:6px;padding:5px 11px;
  border-radius:var(--radius-sm);border:1px solid var(--line);
  background:var(--chrome);color:var(--muted);font-size:12px;font-weight:600;
  cursor:pointer;transition:all .15s;white-space:nowrap;letter-spacing:.3px;
}
.locale-tab:hover{background:var(--chrome-elevated);color:var(--text);border-color:var(--line-strong)}
.locale-tab.active{
  background:var(--accent-dim);color:var(--accent-hover);
  border-color:var(--accent);box-shadow:0 0 12px var(--accent-dim2);
}
.locale-tab .badge-src{
  font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;
  color:var(--dim);background:rgba(255,255,255,0.05);padding:1px 4px;border-radius:3px;
}
.locale-tab .missing-pill{
  font-size:10px;font-weight:700;color:var(--warning);background:var(--warning-dim);
  padding:0 4px;border-radius:3px;line-height:14px;
}
.locale-tab .draft-dot{
  width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;
}
.locale-tab .tab-close{
  display:inline-flex;align-items:center;justify-content:center;
  width:15px;height:15px;border-radius:var(--radius-xs);margin-left:3px;
  color:var(--dim);font-size:14px;font-weight:400;line-height:1;transition:all .15s;
}
.locale-tab .tab-close:hover{
  background:var(--error-dim);color:var(--error);
}
.set-source-btn{
  font-size:11px;font-weight:500;color:var(--muted);border:1px dashed var(--line-strong);background:transparent;
  padding:4px 9px;border-radius:var(--radius-sm);cursor:pointer;transition:all .15s;margin-left:4px;
  white-space:nowrap;
}
.set-source-btn:hover{
  background:var(--surface-hover);color:var(--accent-hover);border-color:var(--accent);
}

#toolbar-div{width:1px;height:22px;background:var(--line);flex-shrink:0}
#filter-tabs{
  display:inline-flex;background:var(--chrome);padding:2px;border-radius:var(--radius-sm);
  border:1px solid var(--line);flex-shrink:0;
}
.filter-tab{
  padding:3px 10px;border-radius:var(--radius-xs);border:none;
  background:transparent;color:var(--muted);font-size:12px;font-weight:500;
  cursor:pointer;transition:all .15s;white-space:nowrap;
}
.filter-tab:hover{color:var(--text)}
.filter-tab.active{background:var(--surface);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,0.3)}

#search-wrap{position:relative;flex:1;min-width:160px;max-width:280px}
#search-icon{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--dim);pointer-events:none}
#search{
  width:100%;padding:6px 10px 6px 28px;border-radius:var(--radius-sm);
  border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:12px;outline:none;
  transition:border-color .15s,box-shadow .15s;
}
#search:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim2)}
#search::placeholder{color:var(--dim)}

.toolbar-actions{margin-left:auto;display:flex;gap:8px;flex-shrink:0}

/* ─── Workspace Layout ────────────────────────────────────── */
#workspace{display:flex;flex:1;overflow:hidden}

/* ─── Left Sidebar: Prefix Navigator ──────────────────────── */
#sidebar{
  width:220px;background:var(--surface);border-right:1px solid var(--line);
  display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;
}
#sidebar-head{
  padding:12px 16px 8px;font-size:11px;font-weight:700;letter-spacing:.6px;
  text-transform:uppercase;color:var(--dim);display:flex;justify-content:space-between;align-items:center;
}
#prefix-list{flex:1;overflow-y:auto;padding:0 8px 12px}
.prefix-item{
  display:flex;align-items:center;padding:6px 10px;gap:7px;
  border-radius:var(--radius-sm);color:var(--muted);font-size:12px;font-weight:500;
  cursor:pointer;transition:all .12s;margin-bottom:2px;user-select:none;
}
.prefix-item:hover{background:var(--surface-hover);color:var(--text)}
.prefix-item.active{background:var(--accent-dim);color:var(--accent-hover);font-weight:600}
.prefix-name{
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'JetBrains Mono',monospace;
  font-size:11.5px;flex:1;text-align:left;
}
.prefix-badge{
  font-size:10px;padding:1px 6px;border-radius:10px;background:var(--chrome);
  color:var(--dim);font-weight:600;flex-shrink:0;margin-left:auto;
}
.prefix-dot-slot{width:6px;height:6px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.prefix-dot{
  width:6px;height:6px;border-radius:50%;background:var(--warning);flex-shrink:0;
}

/* ─── Main Content Area: Translation Cards ────────────────── */
#main-area{flex:1;overflow-y:auto;padding:16px 24px 80px;background:var(--bg)}
#card-list{display:flex;flex-direction:column;gap:10px;max-width:1100px;margin:0 auto}

.key-card{
  background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);
  padding:14px 16px;transition:border-color .15s,box-shadow .15s;
}
.key-card:hover{border-color:var(--line-strong)}
.key-card.is-dirty{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.key-card.is-missing{border-left:3px solid var(--warning)}

.card-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.card-key{
  font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;
  color:var(--text);word-break:break-all;flex:1;min-width:180px;
}
.card-status{
  font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;
  padding:2px 6px;border-radius:var(--radius-xs);
}
.status-missing{background:var(--warning-dim);color:var(--warning);border:1px solid rgba(251,191,36,0.3)}
.status-draft{background:var(--accent-dim);color:var(--accent-hover);border:1px solid var(--accent)}
.status-synced{background:rgba(255,255,255,0.04);color:var(--dim)}

.card-actions{display:flex;gap:4px;align-items:center;margin-left:auto}
.icon-btn{
  display:inline-flex;align-items:center;justify-content:center;
  width:28px;height:28px;border-radius:var(--radius-sm);
  border:1px solid transparent;background:transparent;color:var(--muted);
  cursor:pointer;transition:all .15s;padding:0;
}
.icon-btn:hover:not(:disabled){background:var(--surface-hover);color:var(--text);border-color:var(--line)}
.icon-btn:disabled{opacity:.3;cursor:not-allowed}
.icon-btn-ai{color:var(--accent)}
.icon-btn-ai:hover:not(:disabled){background:var(--accent-dim);color:var(--accent-hover);border-color:var(--accent)}
.icon-btn-ai.loading{animation:spin 1s linear infinite;color:var(--muted)}
.icon-btn-danger:hover:not(:disabled){background:var(--error-dim);color:var(--error);border-color:rgba(248,113,113,0.3)}

.card-source{
  background:var(--chrome);border:1px solid var(--line);border-radius:var(--radius-sm);
  padding:8px 12px;margin-bottom:10px;display:flex;gap:8px;font-size:12.5px;
}
.source-tag{
  font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;
  color:var(--dim);text-transform:uppercase;flex-shrink:0;padding-top:2px;
}
.source-text{color:var(--muted);line-height:1.45;word-break:break-word;flex:1}

.card-input-wrap{position:relative}
.card-textarea{
  width:100%;background:var(--chrome);border:1px solid var(--line);border-radius:var(--radius-sm);
  color:var(--text);font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;
  padding:8px 12px;outline:none;resize:vertical;min-height:38px;
  transition:border-color .15s,box-shadow .15s;
}
.card-textarea:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-dim2);background:var(--bg)}
.card-textarea:hover:not(:focus){border-color:var(--line-strong)}
.card-textarea.is-dirty{border-color:var(--accent);background:var(--accent-dim2)}

/* ─── Buttons ────────────────────────────────────────────── */
.btn{
  display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:var(--radius-sm);
  border:1px solid var(--line);background:var(--chrome);color:var(--text);
  font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;
  font-family:'Inter',sans-serif;
}
.btn:hover:not(:disabled){background:var(--chrome-elevated);border-color:var(--line-strong);color:#fff}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-primary{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 2px 8px var(--accent-glow)}
.btn-primary:hover:not(:disabled){background:var(--accent-hover);border-color:var(--accent-hover);color:#fff}
.btn-danger{color:var(--error);border-color:rgba(248,113,113,0.3)}
.btn-danger:hover:not(:disabled){background:var(--error-dim);border-color:var(--error);color:var(--error)}

/* ─── Footer Action Bar ──────────────────────────────────── */
#footer{
  position:fixed;bottom:0;left:0;right:0;min-height:56px;padding:0 24px;
  background:rgba(22,27,34,0.94);backdrop-filter:blur(12px);
  border-top:1px solid var(--line);display:flex;align-items:center;gap:12px;z-index:30;
}
#footer-info{font-size:12px;color:var(--muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#footer-info strong{color:var(--text)}
#footer-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}

/* ─── Toast System (Top-Right Floating Cards) ────────────── */
#toast-container{
  position:fixed;top:20px;right:20px;z-index:1000;display:flex;flex-direction:column;
  gap:10px;pointer-events:none;max-width:440px;width:calc(100vw - 40px);
}
.toast-card{
  pointer-events:auto;background:var(--chrome-elevated);border:1px solid var(--line-strong);
  border-radius:var(--radius);padding:14px 16px;box-shadow:0 12px 36px rgba(0,0,0,0.6);
  backdrop-filter:blur(10px);display:flex;gap:12px;align-items:flex-start;
  animation:toastIn .25s ease-out;position:relative;overflow:hidden;
}
.toast-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px}
.toast-card.toast-error{border-color:rgba(248,113,113,0.3)}
.toast-card.toast-error::before{background:var(--error)}
.toast-card.toast-success{border-color:rgba(34,197,94,0.3)}
.toast-card.toast-success::before{background:var(--success)}
.toast-card.toast-warning{border-color:rgba(251,191,36,0.3)}
.toast-card.toast-warning::before{background:var(--warning)}
.toast-card.toast-info{border-color:rgba(139,92,246,0.3)}
.toast-card.toast-info::before{background:var(--accent)}

.toast-icon{flex-shrink:0;margin-top:2px}
.toast-body{flex:1;min-width:0}
.toast-title{font-weight:600;font-size:13px;color:var(--text);margin-bottom:3px}
.toast-msg{font-size:12px;color:var(--muted);line-height:1.45;word-break:break-word}
.toast-close{
  flex-shrink:0;background:transparent;border:none;color:var(--dim);cursor:pointer;
  padding:2px;font-size:16px;line-height:1;transition:color .15s;
}
.toast-close:hover{color:var(--text)}
@keyframes toastIn{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes toastOut{to{transform:translateY(-10px);opacity:0}}

/* ─── Modal ──────────────────────────────────────────────── */
.modal-bg{
  position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;
  align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px);
  padding:16px;
}
.modal-bg.hidden{display:none}
.modal{
  background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius);
  padding:24px;min-width:320px;max-width:480px;width:100%;box-shadow:0 20px 48px rgba(0,0,0,0.6);
}
.modal h3{font-size:15px;font-weight:700;margin-bottom:16px;color:var(--text)}
.modal label{display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px}
.modal input,.modal textarea{
  width:100%;padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--line);
  background:var(--bg);color:var(--text);font-size:13px;outline:none;font-family:'Inter',sans-serif;
  transition:border-color .15s;
}
.modal input:focus,.modal textarea:focus{border-color:var(--accent)}
.modal textarea{resize:vertical;min-height:70px}
.modal-row{margin-bottom:16px}
.modal-footer{display:flex;gap:8px;justify-content:flex-end;margin-top:24px}

/* ─── Loading Overlay ────────────────────────────────────── */
#loading-overlay{
  position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;
  justify-content:center;flex-direction:column;gap:14px;z-index:100;
}
#loading-overlay.hidden{display:none}
.loader-ring{
  width:40px;height:40px;border:3px solid var(--line);
  border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;
}
#loading-overlay p{color:var(--muted);font-size:13px;font-weight:500}
@keyframes spin{to{transform:rotate(360deg)}}

.empty-state{text-align:center;padding:64px 20px;color:var(--muted)}
.empty-state h4{font-size:15px;color:var(--text);margin-bottom:6px}

/* ─── Mobile Responsiveness ──────────────────────────────── */
@media (max-width: 860px) {
  #header{padding:0 14px;gap:10px}
  #header-path{display:none}
  #toolbar{
    flex-wrap:wrap;padding:8px 14px;gap:8px;
  }
  #toolbar-div{display:none}
  #search-wrap{
    order:4;width:100%;max-width:none;min-width:100%;margin-top:2px;
  }
  .toolbar-actions{margin-left:auto}

  #workspace{flex-direction:column}
  #sidebar{
    width:100%;border-right:none;border-bottom:1px solid var(--line);
    flex-direction:row;align-items:center;
  }
  #sidebar-head{display:none}
  #prefix-list{
    display:flex;flex-direction:row;gap:6px;overflow-x:auto;padding:8px 14px;
    white-space:nowrap;scrollbar-width:none;-webkit-overflow-scrolling:touch;
  }
  #prefix-list::-webkit-scrollbar{display:none}
  .prefix-item{
    flex-shrink:0;margin-bottom:0;padding:5px 10px;
  }

  #main-area{padding:12px 14px 100px}
  .key-card{padding:12px 14px}
  .card-head{align-items:flex-start}
  .card-key{min-width:0;width:100%;font-size:11.5px}

  #footer{
    flex-wrap:wrap;padding:8px 14px;gap:8px;
  }
  #footer-info{
    width:100%;order:-1;font-size:11px;
  }
  #footer-actions{
    width:100%;display:flex;gap:6px;justify-content:space-between;
  }
  #footer-actions .btn{
    flex:1;justify-content:center;padding:7px 8px;font-size:11px;
  }

  #toast-container{
    top:12px;right:12px;left:12px;width:auto;max-width:none;
  }
}

@media (max-width: 520px) {
  #header-logo{font-size:13px}
  .badge-provider{display:none}
  .card-textarea{font-size:13.5px}
  .modal{padding:18px 16px;min-width:0}
}
</style>
</head>
<body>

<div id="loading-overlay">
  <div class="loader-ring"></div>
  <p>Loading locale editor&hellip;</p>
</div>

<!-- Floating Toasts -->
<div id="toast-container"></div>

<div id="app" style="display:none">

  <!-- Header -->
  <header id="header">
    <div id="header-logo">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      Polyglot Keeper
    </div>
    <div id="header-sep"></div>
    <span id="header-path"></span>

    <div id="header-info">
      <div class="badge badge-provider" id="badge-provider">
        <span class="badge-dot" style="background:var(--accent)"></span>
        <span id="provider-label">AI</span>
      </div>
      <div class="badge badge-unsaved" id="badge-unsaved" style="display:none">
        <span class="badge-dot"></span>
        <span id="unsaved-label">0 unsaved</span>
      </div>
    </div>
  </header>

  <!-- Toolbar -->
  <div id="toolbar">
    <div id="locale-tabs-wrap">
      <div id="locale-tabs"></div>
    </div>
    <div id="toolbar-div"></div>

    <div id="filter-tabs">
      <button class="filter-tab active" data-filter="all">All</button>
      <button class="filter-tab" data-filter="missing">Missing</button>
      <button class="filter-tab" data-filter="modified" title="Show only unsaved draft changes">Drafts</button>
    </div>

    <div id="search-wrap">
      <svg id="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="search" type="search" placeholder="Filter keys or values&hellip;">
    </div>

    <div class="toolbar-actions">
      <button class="btn" id="btn-add-locale">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>Add Locale</span>
      </button>
    </div>
  </div>

  <!-- Workspace with Sidebar + Cards -->
  <div id="workspace">

    <!-- Left Sidebar: Prefix Navigator -->
    <aside id="sidebar">
      <div id="sidebar-head">
        <span>Prefixes</span>
        <span id="total-keys-badge" class="prefix-badge">0</span>
      </div>
      <div id="prefix-list"></div>
    </aside>

    <!-- Main Content: Key Cards -->
    <main id="main-area">
      <div id="card-list"></div>
    </main>

  </div>

  <!-- Footer Action Bar -->
  <footer id="footer">
    <div id="footer-info"></div>

    <div id="footer-actions">
      <button class="btn" id="btn-add-key">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>Add Key</span>
      </button>

      <button class="btn" id="btn-translate-all">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        </svg>
        <span>Translate All Missing</span>
      </button>

      <button class="btn btn-primary" id="btn-save">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>
        <span id="save-btn-text">Save Changes</span>
      </button>
    </div>
  </footer>

</div>

<!-- Add Locale Modal -->
<div class="modal-bg hidden" id="modal-locale">
  <div class="modal">
    <h3>Add New Locale</h3>
    <div class="modal-row">
      <label for="new-locale-input">Locale code (e.g. DE, FR, ES, ZH)</label>
      <input type="text" id="new-locale-input" placeholder="ES" maxlength="8">
    </div>
    <div class="modal-footer">
      <button class="btn" id="modal-locale-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-locale-submit">Create Locale</button>
    </div>
  </div>
</div>

<!-- Add Key Modal -->
<div class="modal-bg hidden" id="modal-key">
  <div class="modal">
    <h3>Add Key to Source Locale</h3>
    <div class="modal-row">
      <label for="new-key-path">Key Path (dot-notation, e.g. auth.login.title)</label>
      <input type="text" id="new-key-path" placeholder="nav.menu.home">
    </div>
    <div class="modal-row">
      <label for="new-key-value">Source Value</label>
      <textarea id="new-key-value" placeholder="Home"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn" id="modal-key-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-key-submit">Add Key</button>
    </div>
  </div>
</div>

<!-- Confirm Modal -->
<div class="modal-bg hidden" id="modal-confirm">
  <div class="modal">
    <h3 id="confirm-title">Confirm</h3>
    <p id="confirm-msg" style="color:var(--muted);font-size:13px;margin-bottom:20px;line-height:1.5"></p>
    <div class="modal-footer">
      <button class="btn" id="confirm-cancel-btn">Cancel</button>
      <button class="btn btn-danger" id="confirm-ok-btn">Delete</button>
    </div>
  </div>
</div>

<script>
// ─── STATE ────────────────────────────────────────────────
const state = {
  data: null,
  activeLocale: '',
  activePrefix: 'all',
  filter: 'all',     // 'all' | 'missing' | 'modified'
  search: '',
  drafts: {},        // { [locale]: { [key]: value } }
  translating: {},   // { [key]: boolean }
  translateAllLoading: false,
  saving: false
};

let confirmCallback = null;

// ─── UTILS ────────────────────────────────────────────────
const esc = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// ─── API CLIENT ───────────────────────────────────────────
const api = async (method, endpoint, body) => {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(endpoint, options);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error || ('HTTP ' + response.status));
  }
  return json;
};

// ─── TOAST NOTIFICATIONS ──────────────────────────────────
const removeToast = (toast) => {
  toast.style.animation = 'toastOut .2s ease-in forwards';
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 200);
};

const showToast = (title, message = '', type = 'info') => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast-card toast-' + type;

  let iconSvg = '';
  if (type === 'error') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  } else if (type === 'success') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  } else {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  toast.innerHTML =
    '<div class="toast-icon">' + iconSvg + '</div>' +
    '<div class="toast-body">' +
      '<div class="toast-title">' + esc(title) + '</div>' +
      (message ? '<div class="toast-msg">' + esc(message) + '</div>' : '') +
    '</div>' +
    '<button class="toast-close" aria-label="Close">&times;</button>';

  const timer = setTimeout(() => {
    removeToast(toast);
  }, 5000);

  toast.querySelector('.toast-close').onclick = () => {
    clearTimeout(timer);
    removeToast(toast);
  };

  container.appendChild(toast);
};

const parseErrorForToast = (err) => {
  const raw = err instanceof Error ? err.message : String(err);
  let title = 'Translation failed';
  if (raw.includes('429') || raw.includes('quota') || raw.includes('RESOURCE_EXHAUSTED')) {
    title = 'API Quota Limit (429)';
  } else if (raw.includes('503') || raw.includes('high demand') || raw.includes('UNAVAILABLE')) {
    title = 'Model Overloaded (503)';
  } else if (raw.includes('API key')) {
    title = 'API Key Error';
  }
  return { title, message: raw };
};

// ─── MODAL CONTROLLERS ────────────────────────────────────
const openModal = (id) => {
  document.getElementById(id).classList.remove('hidden');
};

const closeModal = (id) => {
  document.getElementById(id).classList.add('hidden');
};

const openConfirm = (title, message, callback) => {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = message;
  confirmCallback = callback;
  openModal('modal-confirm');
};

// ─── DATA SELECTORS & HELPERS ─────────────────────────────
const getPrefixes = () => {
  const { data, activeLocale } = state;
  const src = data.sourceLocale;
  const allKeys = Object.keys(data.locales[src] || {}).sort();
  const counts = {};
  const missingMap = {};

  for (const key of allKeys) {
    const parts = key.split('.');
    const prefix = parts.length > 1 ? parts[0] : 'other';
    counts[prefix] = (counts[prefix] || 0) + 1;

    const draft = state.drafts[activeLocale]?.[key];
    const saved = data.locales[activeLocale]?.[key] ?? '';
    const current = draft !== undefined ? draft : saved;
    if (!(current || '').trim()) {
      missingMap[prefix] = true;
    }
  }

  return { counts, missingMap, total: allKeys.length };
};

const getFilteredKeys = () => {
  const { data, activeLocale, search, activePrefix, filter } = state;
  const src = data.sourceLocale;
  const allKeys = Object.keys(data.locales[src] || {}).sort();
  const query = search.toLowerCase();

  return allKeys.filter((key) => {
    if (activePrefix !== 'all') {
      const parts = key.split('.');
      const keyPrefix = parts.length > 1 ? parts[0] : 'other';
      if (keyPrefix !== activePrefix) return false;
    }

    const srcVal = (data.locales[src]?.[key] || '').toLowerCase();
    const draft = state.drafts[activeLocale]?.[key];
    const saved = data.locales[activeLocale]?.[key] || '';
    const current = draft !== undefined ? draft : saved;

    if (query) {
      const matchKey = key.toLowerCase().includes(query);
      const matchSrc = srcVal.includes(query);
      const matchCur = (current || '').toLowerCase().includes(query);
      if (!matchKey && !matchSrc && !matchCur) {
        return false;
      }
    }

    if (filter === 'missing') {
      if ((current || '').trim()) return false;
    } else if (filter === 'modified') {
      if (draft === undefined || draft === saved) return false;
    }

    return true;
  });
};

// ─── RENDERERS ────────────────────────────────────────────
const renderHeaderStatus = () => {
  let allDrafts = 0;
  for (const loc of state.data.allLocales) {
    allDrafts += Object.keys(state.drafts[loc] || {}).length;
  }

  const badge = document.getElementById('badge-unsaved');
  if (allDrafts > 0) {
    badge.style.display = 'inline-flex';
    document.getElementById('unsaved-label').textContent =
      allDrafts + ' unsaved change' + (allDrafts > 1 ? 's' : '');
  } else {
    badge.style.display = 'none';
  }
};

const renderLocaleTabs = () => {
  const { data, activeLocale } = state;
  const src = data.sourceLocale;
  const allSrcKeys = Object.keys(data.locales[src] || {});

  const tabsHtml = data.allLocales.map((locale) => {
    const isActive = locale === activeLocale;
    const isSource = locale === src;
    const draftCount = Object.keys(state.drafts[locale] || {}).length;

    let missingCount = 0;
    if (!isSource) {
      for (const key of allSrcKeys) {
        const draft = state.drafts[locale]?.[key];
        const saved = data.locales[locale]?.[key] || '';
        const current = draft !== undefined ? draft : saved;
        if (!(current || '').trim()) missingCount++;
      }
    }

    const cls = 'locale-tab' + (isActive ? ' active' : '');
    const badge = isSource ? '<span class="badge-src">source</span>' : '';
    const missingPill = missingCount > 0 ? '<span class="missing-pill">' + missingCount + '</span>' : '';
    const dot = draftCount > 0 ? '<span class="draft-dot"></span>' : '';
    const delBtn = !isSource
      ? '<span class="tab-close" data-del-locale="' + esc(locale) + '" title="Delete locale ' + esc(locale.toUpperCase()) + '">&times;</span>'
      : '';

    return '<button class="' + cls + '" data-locale="' + esc(locale) + '">' +
      esc(locale.toUpperCase()) + ' ' + badge + missingPill + dot + delBtn + '</button>';
  }).join('');

  let setSourceBtnHtml = '';
  if (activeLocale !== src) {
    setSourceBtnHtml =
      '<button class="set-source-btn" data-set-default="' + esc(activeLocale) + '" title="Set ' + esc(activeLocale.toUpperCase()) + ' as default source locale">Set as Source</button>';
  }

  document.getElementById('locale-tabs').innerHTML = tabsHtml + setSourceBtnHtml;
};

const renderPrefixList = () => {
  const prefData = getPrefixes();
  document.getElementById('total-keys-badge').textContent = prefData.total;

  const prefixes = Object.keys(prefData.counts).sort();
  let html = '<div class="prefix-item' + (state.activePrefix === 'all' ? ' active' : '') + '" data-prefix="all">' +
    '<span class="prefix-dot-slot"></span>' +
    '<span class="prefix-name">All keys</span>' +
    '<span class="prefix-badge">' + prefData.total + '</span>' +
    '</div>';

  for (const prefix of prefixes) {
    const isActive = state.activePrefix === prefix;
    const hasMissing = !!prefData.missingMap[prefix] && state.activeLocale !== state.data.sourceLocale;
    const cls = 'prefix-item' + (isActive ? ' active' : '');
    const dotHtml = '<span class="prefix-dot-slot">' + (hasMissing ? '<span class="prefix-dot"></span>' : '') + '</span>';

    html += '<div class="' + cls + '" data-prefix="' + esc(prefix) + '">' +
      dotHtml +
      '<span class="prefix-name">' + esc(prefix) + '</span>' +
      '<span class="prefix-badge">' + prefData.counts[prefix] + '</span>' +
      '</div>';
  }

  document.getElementById('prefix-list').innerHTML = html;
};

const renderCardList = () => {
  const { data, activeLocale, translating, drafts } = state;
  const src = data.sourceLocale;
  const isSourceView = activeLocale === src;
  const keys = getFilteredKeys();
  const container = document.getElementById('card-list');

  if (!keys.length) {
    container.innerHTML = '<div class="empty-state">' +
      '<h4>No keys found</h4>' +
      '<p>' + (state.filter === 'missing' ? '🎉 All translations are complete in this section.' : 'Try changing search or filter.') + '</p>' +
      '</div>';
    return;
  }

  const html = keys.map((key) => {
    const srcVal = data.locales[src]?.[key] || '';
    const savedVal = data.locales[activeLocale]?.[key] || '';
    const draft = drafts[activeLocale]?.[key];
    const currentVal = draft !== undefined ? draft : savedVal;
    const isDirty = draft !== undefined && draft !== savedVal;
    const isMissing = !isSourceView && !(currentVal || '').trim();
    const isTranslating = !!translating[key];

    const cardCls = 'key-card' + (isDirty ? ' is-dirty' : '') + (isMissing ? ' is-missing' : '');

    let statusHtml = '';
    if (isSourceView) {
      statusHtml = '<span class="card-status status-synced">SOURCE</span>';
    } else if (isDirty) {
      statusHtml = '<span class="card-status status-draft">DRAFT</span>';
    } else if (isMissing) {
      statusHtml = '<span class="card-status status-missing">MISSING</span>';
    } else {
      statusHtml = '<span class="card-status status-synced">SAVED</span>';
    }

    const resetBtn = isDirty ?
      '<button class="icon-btn" data-reset-key="' + esc(key) + '" title="Reset draft changes">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>' +
      '</button>' : '';

    const aiBtn = !isSourceView ?
      '<button class="icon-btn icon-btn-ai' + (isTranslating ? ' loading' : '') + '" data-ai-key="' + esc(key) + '" title="AI Translate with Key Rotation" ' + (isTranslating ? 'disabled' : '') + '>' +
        (isTranslating
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>') +
      '</button>' : '';

    const delBtn =
      '<button class="icon-btn icon-btn-danger" data-del-key="' + esc(key) + '" title="Delete key permanently">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
      '</button>';

    const rows = (currentVal.includes('\\n') || currentVal.length > 70) ? 3 : 1;

    const sourceBox = !isSourceView ?
      '<div class="card-source">' +
        '<span class="source-tag">' + esc(src.toUpperCase()) + '</span>' +
        '<span class="source-text">' + esc(srcVal) + '</span>' +
      '</div>' : '';

    return '<div class="' + cardCls + '">' +
      '<div class="card-head">' +
        '<span class="card-key">' + esc(key) + '</span>' +
        statusHtml +
        '<div class="card-actions">' +
          resetBtn +
          aiBtn +
          delBtn +
        '</div>' +
      '</div>' +
      sourceBox +
      '<div class="card-input-wrap">' +
        '<textarea class="card-textarea' + (isDirty ? ' is-dirty' : '') + '" rows="' + rows + '"' +
          (isTranslating ? ' disabled' : '') +
          ' placeholder="Enter translation&hellip;"' +
          ' data-key-input="' + esc(key) + '">' +
          esc(currentVal) +
        '</textarea>' +
      '</div>' +
    '</div>';
  }).join('');

  container.innerHTML = html;
};

const renderFooter = () => {
  const { activeLocale, data, drafts, saving, translateAllLoading } = state;
  const src = data.sourceLocale;
  const isSource = activeLocale === src;
  const draftCount = Object.keys(drafts[activeLocale] || {}).length;
  const keys = getFilteredKeys();

  const info = document.getElementById('footer-info');
  if (draftCount > 0) {
    info.innerHTML = 'Showing <strong>' + keys.length + '</strong> keys &middot; <strong>' + draftCount + '</strong> unsaved change' + (draftCount > 1 ? 's' : '') + ' in <strong>' + activeLocale.toUpperCase() + '</strong>';
  } else {
    info.innerHTML = 'Showing <strong>' + keys.length + '</strong> keys in <strong>' + activeLocale.toUpperCase() + '</strong>';
  }

  const btnTranslateAll = document.getElementById('btn-translate-all');
  const btnSave = document.getElementById('btn-save');

  btnTranslateAll.disabled = isSource || translateAllLoading;
  btnTranslateAll.innerHTML = translateAllLoading
    ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Translating\u2026'
    : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> <span>Translate All Missing</span>';

  btnSave.disabled = saving || draftCount === 0;
  btnSave.innerHTML = saving
    ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Saving\u2026'
    : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Changes' + (draftCount > 0 ? ' (' + draftCount + ')' : '');
};

const render = () => {
  renderLocaleTabs();
  renderPrefixList();
  renderCardList();
  renderFooter();
  renderHeaderStatus();
};

// ─── STATE ACTIONS ────────────────────────────────────────
const setActiveLocale = (locale) => {
  state.activeLocale = locale;
  render();
};

const setFilter = (filter) => {
  state.filter = filter;
  const buttons = document.querySelectorAll('#filter-tabs .filter-tab');
  buttons.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
  });
  renderCardList();
  renderFooter();
};

const setDraft = (locale, key, value) => {
  if (!state.drafts[locale]) {
    state.drafts[locale] = {};
  }
  state.drafts[locale][key] = value;
  renderLocaleTabs();
  renderFooter();
  renderHeaderStatus();
};

const resetKeyDraft = (key) => {
  const { activeLocale, drafts } = state;
  if (drafts[activeLocale]) {
    delete drafts[activeLocale][key];
  }
  renderLocaleTabs();
  renderCardList();
  renderFooter();
  renderHeaderStatus();
};

const translateKey = async (key) => {
  const { activeLocale, data } = state;
  const src = data.sourceLocale;
  if (activeLocale === src) return;

  const srcVal = data.locales[src]?.[key] || '';
  if (!srcVal) return;

  state.translating[key] = true;
  renderCardList();

  try {
    const res = await api('POST', '/api/translate', {
      batch: { [key]: srcVal },
      targetLang: activeLocale
    });
    if (res.translations && res.translations[key] !== undefined) {
      setDraft(activeLocale, key, res.translations[key]);
      showToast('Key translated', key + ' \u2192 ' + res.translations[key], 'success');
      renderCardList();
    }
  } catch (err) {
    const parsed = parseErrorForToast(err);
    showToast(parsed.title, parsed.message, 'error');
  } finally {
    delete state.translating[key];
    renderCardList();
  }
};

const translateAll = async () => {
  const { activeLocale, data, drafts } = state;
  const src = data.sourceLocale;
  if (activeLocale === src) return;

  const missingKeys = getFilteredKeys().filter((key) => {
    const draft = drafts[activeLocale]?.[key];
    const saved = data.locales[activeLocale]?.[key] || '';
    const current = draft !== undefined ? draft : saved;
    return !(current || '').trim();
  });

  if (!missingKeys.length) {
    showToast('Nothing to translate', 'No missing keys found in current filter.', 'info');
    return;
  }

  state.translateAllLoading = true;
  renderFooter();

  const batch = {};
  for (const key of missingKeys) {
    batch[key] = data.locales[src]?.[key] || '';
  }

  try {
    const res = await api('POST', '/api/translate', {
      batch,
      targetLang: activeLocale
    });
    let count = 0;
    for (const [k, v] of Object.entries(res.translations || {})) {
      setDraft(activeLocale, k, v);
      count++;
    }
    showToast('Batch Translation Complete', 'Translated ' + count + ' key' + (count !== 1 ? 's' : '') + ' for ' + activeLocale.toUpperCase() + '.', 'success');
    render();
  } catch (err) {
    const parsed = parseErrorForToast(err);
    showToast(parsed.title, parsed.message, 'error');
  } finally {
    state.translateAllLoading = false;
    renderFooter();
  }
};

const saveLocale = async () => {
  const { activeLocale, data, drafts } = state;
  const existing = data.locales[activeLocale] || {};
  const merged = Object.assign({}, existing, drafts[activeLocale] || {});

  state.saving = true;
  renderFooter();

  try {
    await api('POST', '/api/save', { locale: activeLocale, data: merged });
    data.locales[activeLocale] = merged;
    drafts[activeLocale] = {};
    showToast('Changes Saved', 'Locale ' + activeLocale.toUpperCase() + ' successfully written to disk.', 'success');
    render();
  } catch (err) {
    showToast('Save Failed', err.message, 'error');
  } finally {
    state.saving = false;
    renderFooter();
  }
};

const openAddLocaleModal = () => {
  document.getElementById('new-locale-input').value = '';
  openModal('modal-locale');
  setTimeout(() => document.getElementById('new-locale-input').focus(), 50);
};

const addLocale = async () => {
  const code = (document.getElementById('new-locale-input').value || '').toUpperCase().trim();
  if (!code) {
    showToast('Invalid Locale', 'Please enter a locale code (e.g. DE, FR, ES).', 'warning');
    return;
  }

  try {
    const res = await api('POST', '/api/locales', { locale: code });
    state.data.allLocales.push(res.locale);

    const initial = {};
    for (const k of Object.keys(state.data.locales[state.data.sourceLocale] || {})) {
      initial[k] = '';
    }
    state.data.locales[res.locale] = initial;
    state.drafts[res.locale] = {};
    state.activeLocale = res.locale;
    closeModal('modal-locale');
    showToast('Locale Created', 'Locale ' + code + ' added and initialized with source keys.', 'success');
    render();
  } catch (err) {
    showToast('Add Locale Failed', err.message, 'error');
  }
};

const deleteLocale = async (locale) => {
  try {
    await api('DELETE', '/api/locales', { locale });
    state.data.allLocales = state.data.allLocales.filter((l) => l !== locale);
    delete state.data.locales[locale];
    delete state.drafts[locale];

    const targets = state.data.allLocales.filter((l) => l !== state.data.sourceLocale);
    state.activeLocale = targets.length ? targets[0] : state.data.sourceLocale;
    showToast('Locale Deleted', 'Removed ' + locale.toUpperCase() + ' from project.', 'info');
    render();
  } catch (err) {
    showToast('Delete Failed', err.message, 'error');
  }
};

const confirmDeleteLocale = (locale) => {
  openConfirm(
    'Delete Locale ' + locale.toUpperCase() + '?',
    'This will permanently delete the file ' + locale + '.json from your project. This action cannot be undone.',
    () => deleteLocale(locale)
  );
};

const setDefaultLocale = async (locale) => {
  try {
    await api('POST', '/api/default-locale', { locale });
    state.data.sourceLocale = locale.toLowerCase();
    showToast('Source Locale Updated', locale.toUpperCase() + ' is now the primary source locale.', 'success');
    render();
  } catch (err) {
    showToast('Failed to Update Source', err.message, 'error');
  }
};

const confirmSetDefaultLocale = (locale) => {
  openConfirm(
    'Set ' + locale.toUpperCase() + ' as Primary Source?',
    'This will set ' + locale.toUpperCase() + ' as the default source locale in polyglot.config.json. All other locales will be translated from this source.',
    () => setDefaultLocale(locale)
  );
};

const openAddKeyModal = () => {
  document.getElementById('new-key-path').value = '';
  document.getElementById('new-key-value').value = '';
  openModal('modal-key');
  setTimeout(() => document.getElementById('new-key-path').focus(), 50);
};

const addKey = async () => {
  const key = (document.getElementById('new-key-path').value || '').trim();
  const val = (document.getElementById('new-key-value').value || '').trim();
  if (!key) {
    showToast('Invalid Key', 'Please enter a valid key path.', 'warning');
    return;
  }

  try {
    await api('POST', '/api/keys', { key, value: val });
    const src = state.data.sourceLocale;
    if (!state.data.locales[src]) state.data.locales[src] = {};
    state.data.locales[src][key] = val;
    closeModal('modal-key');
    showToast('Key Added', 'Added "' + key + '" to ' + src.toUpperCase() + '.', 'success');
    render();
  } catch (err) {
    showToast('Add Key Failed', err.message, 'error');
  }
};

const deleteKey = async (key) => {
  try {
    await api('DELETE', '/api/keys', { key });
    for (const loc of state.data.allLocales) {
      if (state.data.locales[loc]) delete state.data.locales[loc][key];
      if (state.drafts[loc]) delete state.drafts[loc][key];
    }
    showToast('Key Deleted', 'Removed "' + key + '" from all locales.', 'info');
    render();
  } catch (err) {
    showToast('Delete Failed', err.message, 'error');
  }
};

const confirmDeleteKey = (key) => {
  openConfirm(
    'Delete Key "' + key + '"?',
    'This will delete the key from ALL locale files permanently.',
    () => deleteKey(key)
  );
};

// ─── EVENT LISTENERS ──────────────────────────────────────
const setupGlobalEventListeners = () => {
  // Locale tabs delegation
  document.getElementById('locale-tabs').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del-locale]');
    if (del) {
      e.stopPropagation();
      confirmDeleteLocale(del.getAttribute('data-del-locale'));
      return;
    }
    const setDef = e.target.closest('[data-set-default]');
    if (setDef) {
      e.stopPropagation();
      confirmSetDefaultLocale(setDef.getAttribute('data-set-default'));
      return;
    }
    const tab = e.target.closest('[data-locale]');
    if (tab) {
      setActiveLocale(tab.getAttribute('data-locale'));
    }
  });

  // Filter tabs delegation
  document.getElementById('filter-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (btn) setFilter(btn.getAttribute('data-filter'));
  });

  // Prefix sidebar delegation
  document.getElementById('prefix-list').addEventListener('click', (e) => {
    const item = e.target.closest('[data-prefix]');
    if (item) {
      state.activePrefix = item.getAttribute('data-prefix');
      renderPrefixList();
      renderCardList();
    }
  });

  // Card list delegation
  const mainArea = document.getElementById('card-list');
  mainArea.addEventListener('click', (e) => {
    const aiBtn = e.target.closest('[data-ai-key]');
    if (aiBtn && !aiBtn.disabled) {
      translateKey(aiBtn.getAttribute('data-ai-key'));
      return;
    }
    const resetBtn = e.target.closest('[data-reset-key]');
    if (resetBtn) {
      resetKeyDraft(resetBtn.getAttribute('data-reset-key'));
      return;
    }
    const delBtn = e.target.closest('[data-del-key]');
    if (delBtn) {
      confirmDeleteKey(delBtn.getAttribute('data-del-key'));
    }
  });

  mainArea.addEventListener('input', (e) => {
    const textarea = e.target.closest('[data-key-input]');
    if (textarea) {
      setDraft(state.activeLocale, textarea.getAttribute('data-key-input'), textarea.value);
    }
  });

  // Search input
  document.getElementById('search').addEventListener('input', (e) => {
    state.search = e.target.value;
    renderPrefixList();
    renderCardList();
  });

  // Toolbar & Footer actions
  document.getElementById('btn-add-locale').onclick = openAddLocaleModal;
  document.getElementById('btn-add-key').onclick = openAddKeyModal;
  document.getElementById('btn-translate-all').onclick = translateAll;
  document.getElementById('btn-save').onclick = saveLocale;

  // Modal actions
  document.getElementById('modal-locale-cancel').onclick = () => closeModal('modal-locale');
  document.getElementById('modal-locale-submit').onclick = addLocale;
  document.getElementById('modal-key-cancel').onclick = () => closeModal('modal-key');
  document.getElementById('modal-key-submit').onclick = addKey;
  document.getElementById('confirm-cancel-btn').onclick = () => closeModal('modal-confirm');
  document.getElementById('confirm-ok-btn').onclick = () => {
    closeModal('modal-confirm');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  };

  // Enter keys in modals
  document.getElementById('new-locale-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addLocale();
  });
  document.getElementById('new-key-path').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('new-key-value').focus();
  });

  // Keyboard shortcut Ctrl+S / Cmd+S
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveLocale();
    }
  });

  // Backdrop modal dismiss
  document.addEventListener('click', (e) => {
    const modals = ['modal-locale', 'modal-key', 'modal-confirm'];
    for (const id of modals) {
      const modal = document.getElementById(id);
      if (e.target === modal) closeModal(id);
    }
  });
};

// ─── INITIALIZATION ───────────────────────────────────────
const init = async () => {
  try {
    const data = await api('GET', '/api/data');
    state.data = data;

    const targets = data.allLocales.filter((l) => l !== data.sourceLocale);
    state.activeLocale = targets.length ? targets[0] : data.sourceLocale;

    state.drafts = {};
    for (const loc of data.allLocales) {
      state.drafts[loc] = {};
    }

    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('app').style.display = 'flex';

    const cfg = data.config?.json || {};
    document.getElementById('header-path').textContent = cfg.localesDir || 'locales';

    const keyCount = data.keyCount || 1;
    const providerLabel = (data.providerName || 'AI') + ' \u00b7 ' + keyCount + (keyCount > 1 ? ' keys rotated' : ' key');
    document.getElementById('provider-label').textContent = providerLabel;

    setupGlobalEventListeners();
    render();
  } catch (err) {
    document.querySelector('#loading-overlay p').textContent = 'Failed to load editor: ' + err.message;
  }
};

init();
</script>
</body>
</html>
`
