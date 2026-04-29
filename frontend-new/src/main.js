import { Clerk } from "@clerk/clerk-js";

// ─── Konfiguration ────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY Missing in the .env File!");
}

let currentPostId = null;
let currentUser = null;

// ─── Clerk initialisieren ─────────────────────────────────────
const clerk = new Clerk(publishableKey);

window.addEventListener("load", async () => {
  try {
    await clerk.load();
    window.Clerk = clerk;
    updateAuthUI();
    clerk.addListener(() => updateAuthUI());
  } catch (err) {
    console.error("Clerk Fehler:", err);
    showToast("Authentication Service is not Available!", "warning");
  }
  loadPosts();
});

// ─── Auth UI aktualisieren ────────────────────────────────────
function updateAuthUI() {
  const user = clerk.user;
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

    // Admin Button nur für Admin zeigen
    if (user.id === "user_3CyZiJOM2Wxwo4ZG667yKuCyyXB") {
      document.getElementById("admin-nav-btn")?.classList.remove("hidden");
    } else {
      document.getElementById("admin-nav-btn")?.classList.add("hidden");
    }

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
    return (await clerk.session?.getToken()) || null;
  } catch {
    return null;
  }
}

// ─── Clerk Auth Funktionen ────────────────────────────────────
window.openSignIn = () => {
  clerk.redirectToSignIn({
    afterSignInUrl: "http://localhost:5173",
  });
};

window.openSignUp = () => {
  clerk.redirectToSignUp({
    afterSignUpUrl: "http://localhost:5173",
  });
};

window.signOut = async () => {
  await clerk.signOut();
  window.location.href = window.location.href;
};

// ─── Theme Toggle ─────────────────────────────────────────────
window.toggleTheme = () => {
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
};

// Theme beim Laden wiederherstellen
const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
document.addEventListener("DOMContentLoaded", () => {
  const icon = document.getElementById("theme-icon");
  if (icon) icon.textContent = savedTheme === "dark" ? "🌙" : "☀️";
});

// ─── Seiten Navigation ────────────────────────────────────────
window.showPage = (name) => {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(`page-${name}`).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

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
        <span>❌ Posts could not be loaded. Is the backend running?
</span>
      </div>`;
  }
}

function renderPosts(posts) {
  const container = document.getElementById("posts-list");
  if (!posts.length) {
    container.innerHTML = `<div class="alert alert-info"><span>No posts available yet.
.</span></div>`;
    return;
  }
  container.innerHTML = posts
    .map(
      (post) => `
    <div class="card bg-base-200 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
         onclick="openPost('${post._id}')">
      <div class="card-body">
        <h3 class="card-title text-xl hover:text-primary transition-colors">${escapeHtml(post.title)}</h3>
        <p class="text-base-content/60 mt-2 line-clamp-2">${escapeHtml(post.content)}</p>
        <div class="card-actions justify-between items-center mt-3">
          <span class="text-xs text-base-content/40">
            ✍️ ${escapeHtml(post.author || "Admin")} · ${formatDate(post.createdAt)}
          </span>
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openPost('${post._id}')">Lesen →</button>
            ${
              currentUser &&
              currentUser.id === "user_3CyZiJOM2Wxwo4ZG667yKuCyyXB"
                ? `
              <button class="btn btn-info btn-sm" onclick="event.stopPropagation(); editPost('${post._id}', \`${escapeHtml(post.title)}\`, \`${escapeHtml(post.content)}\`)">✏️</button>
              <button class="btn btn-error btn-sm" onclick="event.stopPropagation(); deletePost('${post._id}')">🗑️</button>
            `
                : ""
            }
          </div>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

// ─── Einzelnen Beitrag öffnen ─────────────────────────────────
window.openPost = async (postId) => {
  currentPostId = postId;
  window.showPage("detail");

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
      <div class="alert alert-error"><span>Post Could not be Loaded.</span></div>`;
  }

  updateAuthUI();
  loadComments(postId);
};

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
    container.innerHTML = `<div class="alert alert-error"><span>Comments could not be loaded.
.</span></div>`;
  }
}

function renderComments(comments) {
  const container = document.getElementById("comments-list");
  if (!comments.length) {
    container.innerHTML = `
      <div class="text-center text-base-content/40 py-10">
        <div class="text-4xl mb-2">💬</div>
        <p>No comments yet. Be the first one.
!</p>
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
            <button class="btn btn-ghost btn-xs text-error" onclick="deleteComment('${c._id}')">🗑️ Delete</button>
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
window.submitComment = async () => {
  const textEl = document.getElementById("comment-text");
  const text = textEl.value.trim();
  const errorDiv = document.getElementById("comment-error");
  const errorMsg = document.getElementById("comment-error-msg");
  const btn = document.getElementById("submit-comment-btn");

  errorDiv.classList.add("hidden");
  textEl.classList.remove("textarea-error");

  if (!text) {
    errorMsg.textContent = "Comment cannot be empty!";
    errorDiv.classList.remove("hidden");
    textEl.classList.add("textarea-error");
    return;
  }

  if (!currentUser) {
    showToast("Please Signin!", "warning");
    return;
  }

  const token = await getToken();
  if (!token) {
    showToast("Please login again", "error");
    return;
  }

  const username =
    currentUser.firstName ||
    currentUser.emailAddresses?.[0]?.emailAddress ||
    "Anonym";

  btn.disabled = true;
  btn.innerHTML = `<span class="loading loading-spinner loading-sm"></span> Sending...`;

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
      errorMsg.textContent = data.error || "Error while Sending";
      errorDiv.classList.remove("hidden");
      textEl.classList.add("textarea-error");
      return;
    }

    textEl.value = "";
    document.getElementById("char-count").textContent = "0";
    showToast("Comment Saved! 🎉", "success");
    loadComments(currentPostId);
  } catch {
    showToast("NetworkError, is the Backend running?", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Send Comment";
  }
};

// ─── Kommentar löschen ────────────────────────────────────────
window.deleteComment = async (commentId) => {
  if (!confirm("Do you really want to Delete the Comment?")) return;
  const token = await getToken();
  if (!token) {
    showToast("Not Athorized", "error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast("Comment Deleted", "success");
      loadComments(currentPostId);
    } else {
      const data = await res.json();
      showToast(data.error || "Error While Deleting", "error");
    }
  } catch {
    showToast("NetworkError", "error");
  }
};

// ─── Post erstellen ───────────────────────────────────────────
window.createPost = async () => {
  const titleEl = document.getElementById("post-title");
  const contentEl = document.getElementById("post-content");
  const title = titleEl.value.trim();
  const content = contentEl.value.trim();
  const btn = document.getElementById("create-post-btn");

  document.getElementById("post-title-error").classList.add("hidden");
  document.getElementById("post-content-error").classList.add("hidden");
  document.getElementById("post-success").classList.add("hidden");
  titleEl.classList.remove("input-error");
  contentEl.classList.remove("textarea-error");

  if (!title) {
    document.getElementById("post-title-error-msg").textContent =
      "Titel cannot be Empty!";
    document.getElementById("post-title-error").classList.remove("hidden");
    titleEl.classList.add("input-error");
    return;
  }
  if (!content) {
    document.getElementById("post-content-error-msg").textContent =
      "Conent cannot be Empty!";
    document.getElementById("post-content-error").classList.remove("hidden");
    contentEl.classList.add("textarea-error");
    return;
  }

  const token = await getToken();
  if (!token) {
    showToast("Please Signin!", "error");
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
      showToast(data.error || "Error!", "error");
      return;
    }

    titleEl.value = "";
    contentEl.value = "";
    document.getElementById("post-success").classList.remove("hidden");
    showToast("Post successfully Created! 🎉", "success");
    setTimeout(() => window.showPage("home"), 2000);
    loadPosts();
  } catch {
    showToast("NetworkError!", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "🚀 Publish Post";
  }
};

// ─── Post löschen ─────────────────────────────────────────────
window.deletePost = async (postId) => {
  if (!confirm("Do You really want to Delete the Post")) return;
  const token = await getToken();
  if (!token) {
    showToast("Not Authorized!", "error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast("Post Deleted! ✅", "success");
      loadPosts();
    } else {
      const data = await res.json();
      showToast(data.error || "Error while Deleting", "error");
    }
  } catch {
    showToast("NetworkError", "error");
  }
};

// ─── Post bearbeiten ──────────────────────────────────────────
window.editPost = (postId, title, content) => {
  window.showPage("admin");
  document.getElementById("post-title").value = title;
  document.getElementById("post-content").value = content;

  const btn = document.getElementById("create-post-btn");
  btn.innerHTML = "✏️ Save Changes";
  btn.onclick = async () => {
    const newTitle = document.getElementById("post-title").value.trim();
    const newContent = document.getElementById("post-content").value.trim();

    if (!newTitle || !newContent) {
      showToast("Titel and Contentcannot be Empty!", "error");
      return;
    }

    const token = await getToken();
    if (!token) {
      showToast("Please Signin!", "error");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="loading loading-spinner loading-sm"></span> Being Saved...`;

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
        showToast(data.error || "Error!", "error");
        return;
      }

      showToast("Post Updated! ✅", "success");
      loadPosts();
      setTimeout(() => window.showPage("home"), 1500);
    } catch {
      showToast("NetworkError!", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = "✏️ Save Changes";
    }
  };
};

// ─── Zeichenzähler ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("comment-text")
    ?.addEventListener("input", function () {
      document.getElementById("char-count").textContent = this.value.length;
      if (this.value.trim()) {
        this.classList.remove("textarea-error");
        document.getElementById("comment-error").classList.add("hidden");
      }
    });
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
