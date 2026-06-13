const POSTS_ENDPOINT = "https://kenyanvibe.com/wp-json/wp/v2/posts?per_page=5";

const statusEl = document.getElementById("status");
const postListEl = document.getElementById("post-list");

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

function renderPosts(posts) {
  postListEl.innerHTML = "";

  for (const post of posts) {
    const item = document.createElement("li");

    const heading = document.createElement("h2");
    const link = document.createElement("a");
    link.href = `/posts/${encodeURIComponent(post.slug)}/`;
    link.innerHTML = post.title?.rendered || "Untitled";
    heading.appendChild(link);

    const date = document.createElement("p");
    date.textContent = formatDate(post.date);

    const excerpt = document.createElement("div");
    excerpt.innerHTML = post.excerpt?.rendered || "";

    item.appendChild(heading);
    if (date.textContent) {
      item.appendChild(date);
    }
    item.appendChild(excerpt);

    postListEl.appendChild(item);
  }
}

async function loadPosts() {
  try {
    const response = await fetch(POSTS_ENDPOINT);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const posts = await response.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      statusEl.textContent = "No posts found.";
      return;
    }

    renderPosts(posts);
    statusEl.textContent = "";
  } catch (error) {
    statusEl.textContent = "Could not load posts right now.";
  }
}

loadPosts();
