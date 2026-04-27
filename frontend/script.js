// ─── Konfiguration ───────────────────────────────────────────
const API_URL = "http://localhost:3000/api";
let currentPostId = null;
let currentUser = null;

// ─── Clerk initialisieren ────────────────────────────────────
window.addEventListener("load", async () => {
  try {
    await window.Clerk.load();
    updateAuthUI();
    window.Clerk.addListener(() => updateAuthUI());
  } catch (err) {
    console.error("Clerk Fehler:", err);
    showToast("Authentifizierungsdienst nicht verfügbar", "warning");
  }
  loadPosts();
});

// ─── Auth UI aktualisieren ────────────────────────────────────
function updateAuthUI() {
  const user = window.Clerk?.user;
  const authButtons = document.getElementById("auth-buttons");
  const userInfo = document.getElementById("user-info");
  const userName = document.getElementById("user-name");
  const loginHint = document.getElementById("login-hint");

  if (user) {
    currentUser = user;
    const name =
      user.firstName || user.emailAddresses?.[0]?.emailAddress || "Benutzer";
    userName.textContent = `👤 ${name}`;
    authButtons.classList.add("hidden");
    userInfo.classList.remove("hidden");
    userInfo.classList.add("flex");
    loginHint?.classList.add("hidden");
    document.getElementById("admin-nav-btn")?.classList.remove("hidden");
    document.getElementById("comment-login-required")?.classList.add("hidden");
    document
      .getElementById("comment-form-container")
      ?.classList.remove("hidden");
  } else {
    currentUser = null;
    authButtons.classList.remove("hidden");
    userInfo.classList.add("hidden");
    userInfo.classList.remove("flex");
    loginHint?.classList.remove("hidden");
    document.getElementById("admin-nav-btn")?.classList.add("hidden");
    document
      .getElementById("comment-login-required")
      ?.classList.remove("hidden");
    document.getElementById("comment-form-container")?.classList.add("hidden");
  }
}

// ─── Clerk Token holen ────────────────────────────────────────
async function getToken() {
  try {
    return (await window.Clerk?.session?.getToken()) || null;
  } catch {
    return null;
  }
}

// ─── Clerk Modals ─────────────────────────────────────────────
function openSignIn() {
  window.Clerk.redirectToSignIn({
    afterSignInUrl: "http://127.0.0.1:5500/frontend/index.html",
  });
}

function openSignUp() {
  window.Clerk.redirectToSignUp({
    afterSignUpUrl: "http://127.0.0.1:5500/frontend/index.html",
  });
}

function closeClerkModal(event) {
  if (
    !event ||
    event.target === document.getElementById("clerk-modal-overlay")
  ) {
    document.getElementById("clerk-modal-overlay").classList.add("hidden");
    document.getElementById("clerk-mount-point").innerHTML = "";
  }
}

async function signOut() {
  await window.Clerk?.signOut();
  window.location.href = "http://127.0.0.1:5500/frontend/index.html";
}

// ─── Seiten Navigation ────────────────────────────────────────
function showPage(name) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(`page-${name}`).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Alle Blogbeiträge laden ──────────────────────────────────
async function loadPosts() {
  try {
    const res = await fetch(`${API_URL}/posts`);
    if (!res.ok) throw new Error();
    const posts = await res.json();
    renderPosts(posts);
  } catch {
    document.getElementById("posts-list").innerHTML = `
      <div class="alert alert-error">
        <span>❌ Beiträge konnten nicht geladen werden. Ist das Backend gestartet?</span>
      </div>`;
  }
}

function renderPosts(posts) {
  const container = document.getElementById("posts-list");
  if (!posts.length) {
    container.innerHTML = `<div class="alert alert-info"><span>Noch keine Beiträge vorhanden.</span></div>`;
    return;
  }
  container.innerHTML = posts
    .map(
      (post) => `
    <div class="card bg-base-200 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
         onclick="openPost('${post._id}')">
      <div class="card-body">
        <h3 class="card-title text-xl hover:text-primary transition-colors">
          ${escapeHtml(post.title)}
        </h3>
        <p class="text-base-content/60 mt-2 line-clamp-2">${escapeHtml(post.content)}</p>
        <div class="card-actions justify-between items-center mt-3">
          <span class="text-xs text-base-content/40">
            ✍️ ${escapeHtml(post.author || "Admin")} · ${formatDate(post.createdAt)}
          </span>
          <button class="btn btn-primary btn-sm" onclick="openPost('${post._id}')">Lesen →</button>
${
  currentUser
    ? `
  <button class="btn btn-warning btn-sm" onclick="event.stopPropagation(); editPost('${post._id}', \`${escapeHtml(post.title)}\`, \`${escapeHtml(post.content)}\`)">✏️</button>
  <button class="btn btn-error btn-sm" onclick="event.stopPropagation(); deletePost('${post._id}')">🗑️</button>
`
    : ""
}
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

// ─── Einzelnen Beitrag öffnen ─────────────────────────────────
async function openPost(postId) {
  currentPostId = postId;
  showPage("detail");

  document.getElementById("detail-loading").classList.remove("hidden");
  document.getElementById("detail-content").classList.add("hidden");

  try {
    const res = await fetch(`${API_URL}/posts/${postId}`);
    if (!res.ok) throw new Error();
    const post = await res.json();

    document.getElementById("detail-title").textContent = post.title;
    document.getElementById("detail-text").textContent = post.content;
    document.getElementById("detail-author").textContent =
      post.author || "Admin";
    document.getElementById("detail-date").textContent = formatDate(
      post.createdAt,
    );
    document.getElementById("detail-loading").classList.add("hidden");
    document.getElementById("detail-content").classList.remove("hidden");
  } catch {
    document.getElementById("detail-loading").innerHTML = `
      <div class="alert alert-error"><span>Beitrag konnte nicht geladen werden.</span></div>`;
  }

  updateAuthUI();
  loadComments(postId);
}

// ─── Kommentare laden ─────────────────────────────────────────
async function loadComments(postId) {
  const container = document.getElementById("comments-list");
  container.innerHTML = `<div class="flex justify-center py-6">
    <span class="loading loading-spinner loading-md text-primary"></span>
  </div>`;

  try {
    const res = await fetch(`${API_URL}/posts/${postId}/comments`);
    if (!res.ok) throw new Error();
    const comments = await res.json();
    document.getElementById("comment-count").textContent = comments.length;
    renderComments(comments);
  } catch {
    container.innerHTML = `<div class="alert alert-error"><span>Kommentare konnten nicht geladen werden.</span></div>`;
  }
}

function renderComments(comments) {
  const container = document.getElementById("comments-list");
  if (!comments.length) {
    container.innerHTML = `
      <div class="text-center text-base-content/40 py-10">
        <div class="text-4xl mb-2">💬</div>
        <p>Noch keine Kommentare. Sei der Erste!</p>
      </div>`;
    return;
  }
  container.innerHTML = comments
    .map(
      (c) => `
    <div class="comment-card card bg-base-200 shadow-sm">
      <div class="card-body py-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="avatar placeholder">
              <div class="bg-primary text-primary-content rounded-full w-8">
                <span class="text-sm">${escapeHtml(c.username?.charAt(0)?.toUpperCase() || "?")}</span>
              </div>
            </div>
            <span class="font-semibold text-sm">${escapeHtml(c.username)}</span>
          </div>
          <span class="text-xs text-base-content/40">${formatDate(c.createdAt)}</span>
        </div>
        <p class="text-base-content/80 text-sm leading-relaxed">${escapeHtml(c.text)}</p>
        ${
          currentUser && c.userId === currentUser.id
            ? `
          <div class="card-actions justify-end mt-1">
            <button class="btn btn-ghost btn-xs text-error" onclick="deleteComment('${c._id}')">
              🗑️ Löschen
            </button>
          </div>`
            : ""
        }
      </div>
    </div>
  `,
    )
    .join("");
}

// ─── Kommentar absenden ───────────────────────────────────────
async function submitComment() {
  const textEl = document.getElementById("comment-text");
  const text = textEl.value.trim();
  const errorDiv = document.getElementById("comment-error");
  const errorMsg = document.getElementById("comment-error-msg");
  const btn = document.getElementById("submit-comment-btn");

  // Fehler zurücksetzen
  errorDiv.classList.add("hidden");
  textEl.classList.remove("textarea-error");

  // Frontend Validierung
  if (!text) {
    errorMsg.textContent = "Kommentar darf nicht leer sein!";
    errorDiv.classList.remove("hidden");
    textEl.classList.add("textarea-error");
    return;
  }

  if (!currentUser) {
    showToast("Bitte melde dich an!", "warning");
    openSignIn();
    return;
  }

  const token = await getToken();
  if (!token) {
    showToast("Bitte neu anmelden.", "error");
    return;
  }

  const username =
    currentUser.firstName ||
    currentUser.emailAddresses?.[0]?.emailAddress ||
    "Anonym";

  // Button deaktivieren
  btn.disabled = true;
  btn.innerHTML = `<span class="loading loading-spinner loading-sm"></span> Wird gesendet...`;

  try {
    const res = await fetch(`${API_URL}/posts/${currentPostId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text, username }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorMsg.textContent = data.error || "Fehler beim Senden";
      errorDiv.classList.remove("hidden");
      textEl.classList.add("textarea-error");
      return;
    }

    // Erfolg!
    textEl.value = "";
    document.getElementById("char-count").textContent = "0";
    showToast("Kommentar gespeichert! 🎉", "success");
    loadComments(currentPostId);
  } catch {
    showToast("Netzwerkfehler. Ist das Backend gestartet?", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Kommentar absenden";
  }
}

// ─── Kommentar löschen ────────────────────────────────────────
async function deleteComment(commentId) {
  if (!confirm("Kommentar wirklich löschen?")) return;

  const token = await getToken();
  if (!token) {
    showToast("Nicht autorisiert", "error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      showToast("Kommentar gelöscht", "success");
      loadComments(currentPostId);
    } else {
      const data = await res.json();
      showToast(data.error || "Fehler beim Löschen", "error");
    }
  } catch {
    showToast("Netzwerkfehler", "error");
  }
}

// ─── Zeichenzähler ────────────────────────────────────────────
document.getElementById("comment-text")?.addEventListener("input", function () {
  document.getElementById("char-count").textContent = this.value.length;
  if (this.value.trim()) {
    this.classList.remove("textarea-error");
    document.getElementById("comment-error").classList.add("hidden");
  }
});

// ─── Toast Nachrichten ────────────────────────────────────────
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const alertClass =
    {
      success: "alert-success",
      error: "alert-error",
      warning: "alert-warning",
      info: "alert-info",
    }[type] || "alert-info";

  const toast = document.createElement("div");
  toast.className = `alert ${alertClass} shadow-lg max-w-sm`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.3s";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Hilfsfunktionen ──────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Post erstellen ───────────────────────────────────────────
async function createPost() {
  const titleEl = document.getElementById("post-title");
  const contentEl = document.getElementById("post-content");
  const title = titleEl.value.trim();
  const content = contentEl.value.trim();
  const btn = document.getElementById("create-post-btn");

  // Fehler zurücksetzen
  document.getElementById("post-title-error").classList.add("hidden");
  document.getElementById("post-content-error").classList.add("hidden");
  document.getElementById("post-success").classList.add("hidden");
  titleEl.classList.remove("input-error");
  contentEl.classList.remove("textarea-error");

  // Frontend Validierung
  if (!title) {
    document.getElementById("post-title-error-msg").textContent =
      "Titel darf nicht leer sein!";
    document.getElementById("post-title-error").classList.remove("hidden");
    titleEl.classList.add("input-error");
    return;
  }
  if (!content) {
    document.getElementById("post-content-error-msg").textContent =
      "Inhalt darf nicht leer sein!";
    document.getElementById("post-content-error").classList.remove("hidden");
    contentEl.classList.add("textarea-error");
    return;
  }

  const token = await getToken();
  if (!token) {
    showToast("Bitte anmelden!", "error");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="loading loading-spinner loading-sm"></span> Wird erstellt...`;

  try {
    const res = await fetch(`${API_URL}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, content }),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Fehler!", "error");
      return;
    }

    titleEl.value = "";
    contentEl.value = "";
    document.getElementById("post-success").classList.remove("hidden");
    showToast("Beitrag erfolgreich erstellt! 🎉", "success");
    setTimeout(() => showPage("home"), 2000);
    loadPosts();
  } catch {
    showToast("Netzwerkfehler!", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Beitrag veröffentlichen";
  }
}
async function deletePost(postId) {
  if (!confirm("Beitrag wirklich löschen?")) return;

  const token = await getToken();
  if (!token) {
    showToast("Nicht autorisiert", "error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      showToast("Beitrag gelöscht! ✅", "success");
      loadPosts();
    } else {
      const data = await res.json();
      showToast(data.error || "Fehler beim Löschen", "error");
    }
  } catch {
    showToast("Netzwerkfehler", "error");
  }
}

// ─── Post bearbeiten ──────────────────────────────────────────
function editPost(postId, title, content) {
  // Titel und Inhalt in das Formular einfügen
  showPage("admin");
  document.getElementById("post-title").value = title;
  document.getElementById("post-content").value = content;

  // Button Text ändern
  const btn = document.getElementById("create-post-btn");
  btn.innerHTML = "✏️ Änderungen speichern";

  // Button Funktion ändern
  btn.onclick = async () => {
    const newTitle = document.getElementById("post-title").value.trim();
    const newContent = document.getElementById("post-content").value.trim();

    if (!newTitle || !newContent) {
      showToast("Titel und Inhalt dürfen nicht leer sein!", "error");
      return;
    }

    const token = await getToken();
    if (!token) {
      showToast("Bitte anmelden!", "error");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="loading loading-spinner loading-sm"></span> Wird gespeichert...`;

    try {
      const res = await fetch(`${API_URL}/posts/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Fehler!", "error");
        return;
      }

      showToast("Beitrag aktualisiert! ✅", "success");
      loadPosts();
      setTimeout(() => showPage("home"), 1500);
    } catch {
      showToast("Netzwerkfehler!", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = "✏️ Änderungen speichern";
    }
  };
}
// ─── Dark/Light Mode ─────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const icon = document.getElementById("theme-icon");

  if (html.getAttribute("data-theme") === "dark") {
    html.setAttribute("data-theme", "light");
    icon.textContent = "☀️";
    localStorage.setItem("theme", "light");
  } else {
    html.setAttribute("data-theme", "dark");
    icon.textContent = "🌙";
    localStorage.setItem("theme", "dark");
  }
}

// Theme beim Laden wiederherstellen
const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
document.addEventListener("DOMContentLoaded", () => {
  const icon = document.getElementById("theme-icon");
  if (icon) {
    icon.textContent = savedTheme === "dark" ? "🌙" : "☀️";
  }
});
