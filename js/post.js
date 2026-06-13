const API_BASE = "https://kenyanvibe.com/wp-json/wp/v2/posts";

const statusEl = document.getElementById("status");
const postEl = document.getElementById("post");

function formatDate(isoDate) {
  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getSlugFromPath() {
  const segments = window.location.pathname.split("/").filter(Boolean);

  if (segments[0] === "posts" && segments[1]) {
    return decodeURIComponent(segments[1]);
  }

  const queryParams = new URLSearchParams(window.location.search);
  const querySlug = queryParams.get("slug");

  if (querySlug) {
    return querySlug;
  }

  return "";
}

function renderPost(post) {
  postEl.innerHTML = "";

  const title = document.createElement("h1");
  title.innerHTML = post.title?.rendered || "Untitled";

  const date = document.createElement("p");
  date.textContent = formatDate(post.date);

  const content = document.createElement("div");
  content.innerHTML = post.content?.rendered || "";

  postEl.appendChild(title);
  if (date.textContent) {
    postEl.appendChild(date);
  }
  postEl.appendChild(content);
}

async function loadPost() {
  const slug = getSlugFromPath();

  if (!slug) {
    statusEl.textContent = "Missing post slug.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}?slug=${encodeURIComponent(slug)}`);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const posts = await response.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      statusEl.textContent = "Post not found.";
      return;
    }

    const post = posts[0];
    renderPost(post);
    statusEl.textContent = "";

    const plainTitle = (post.title?.rendered || "Post").replace(/<[^>]*>/g, "");
    document.title = plainTitle;
  } catch (error) {
    statusEl.textContent = "Could not load this post right now.";
  }
}

loadPost();
