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

function getFeaturedImageUrl(post) {
  const media = post?._embedded?.["wp:featuredmedia"]?.[0];

  if (!media) {
    return "";
  }

  return (
    media.media_details?.sizes?.thumbnail?.source_url ||
    media.source_url ||
    ""
  );
}

function getFeaturedImageAlt(post) {
  const media = post?._embedded?.["wp:featuredmedia"]?.[0];

  if (!media) {
    return "";
  }

  return media.alt_text || media.title?.rendered || "";
}

function getCategoryNames(post) {
  const terms = post?._embedded?.["wp:term"];

  if (!Array.isArray(terms)) {
    return [];
  }

  const categories = [];

  for (const group of terms) {
    if (!Array.isArray(group)) {
      continue;
    }

    for (const term of group) {
      if (term?.taxonomy === "category" && term?.name) {
        categories.push(term.name);
      }
    }
  }

  return categories;
}

function normalizeWordPressLazyImages(container) {
  const images = container.querySelectorAll("img");

  for (const image of images) {
    const src = image.getAttribute("src") || "";
    const dataSrc = image.getAttribute("data-src") || "";
    const dataSrcset = image.getAttribute("data-srcset") || "";

    if (src.startsWith("data:image/gif;base64") && dataSrc) {
      image.setAttribute("src", dataSrc);
    }

    if (!image.getAttribute("srcset") && dataSrcset) {
      image.setAttribute("srcset", dataSrcset);
    }
  }
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

  const featuredImageUrl = getFeaturedImageUrl(post);
  const categories = getCategoryNames(post);

  const content = document.createElement("div");
  content.innerHTML = post.content?.rendered || "";
  normalizeWordPressLazyImages(content);

  postEl.appendChild(title);
  if (date.textContent) {
    postEl.appendChild(date);
  }
  if (featuredImageUrl) {
    const featuredImage = document.createElement("img");
    featuredImage.src = featuredImageUrl;
    featuredImage.alt = getFeaturedImageAlt(post);
    featuredImage.width = 220;
    postEl.appendChild(featuredImage);
  }
  if (categories.length > 0) {
    const categoryText = document.createElement("p");
    categoryText.textContent = `Categories: ${categories.join(", ")}`;
    postEl.appendChild(categoryText);
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
    const response = await fetch(
      `${API_BASE}?slug=${encodeURIComponent(slug)}&_embed`
    );

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
