const API_BASE = "https://kenyanvibe.com/wp-json/wp/v2/posts";
const HOME_CACHE_KEY = "kv_home_posts_cache_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

const statusEl = document.getElementById("status");
const postListEl = document.getElementById("post-list");

function buildPostsUrl() {
  const params = new URLSearchParams({
    per_page: "5",
    _embed: "wp:featuredmedia,wp:term",
    _fields: "id,slug,date,title,excerpt,_embedded",
  });

  return `${API_BASE}?${params.toString()}`;
}

function readCache(cacheKey) {
  try {
    const rawValue = localStorage.getItem(cacheKey);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.cachedAt !== "number" ||
      !Array.isArray(parsed.data)
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

function writeCache(cacheKey, data) {
  try {
    const payload = {
      cachedAt: Date.now(),
      data,
    };

    localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch (error) {
    // Ignore storage errors and keep runtime behavior unaffected.
  }
}

function isCacheFresh(cacheEntry) {
  return Date.now() - cacheEntry.cachedAt <= CACHE_TTL_MS;
}

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

    const featuredImageUrl = getFeaturedImageUrl(post);
    const categories = getCategoryNames(post);

    const excerpt = document.createElement("div");
    excerpt.innerHTML = post.excerpt?.rendered || "";
    normalizeWordPressLazyImages(excerpt);

    item.appendChild(heading);
    if (date.textContent) {
      item.appendChild(date);
    }
    if (featuredImageUrl) {
      const featuredImage = document.createElement("img");
      featuredImage.src = featuredImageUrl;
      featuredImage.alt = getFeaturedImageAlt(post);
      featuredImage.width = 180;
      featuredImage.loading = "lazy";
      featuredImage.decoding = "async";
      item.appendChild(featuredImage);
    }
    if (categories.length > 0) {
      const categoryText = document.createElement("p");
      categoryText.textContent = `Categories: ${categories.join(", ")}`;
      item.appendChild(categoryText);
    }
    item.appendChild(excerpt);

    postListEl.appendChild(item);
  }
}

async function fetchPostsFromApi() {
  const response = await fetch(buildPostsUrl());

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const posts = await response.json();

  if (!Array.isArray(posts)) {
    throw new Error("Unexpected response shape");
  }

  return posts;
}

async function loadPosts() {
  const cached = readCache(HOME_CACHE_KEY);
  const hasFreshCache = cached && isCacheFresh(cached) && cached.data.length > 0;

  if (hasFreshCache) {
    renderPosts(cached.data);
    statusEl.textContent = "";
  }

  try {
    const posts = await fetchPostsFromApi();

    if (!Array.isArray(posts) || posts.length === 0) {
      if (!hasFreshCache) {
        statusEl.textContent = "No posts found.";
      }
      return;
    }

    writeCache(HOME_CACHE_KEY, posts);
    renderPosts(posts);
    statusEl.textContent = "";
  } catch (error) {
    if (!hasFreshCache) {
      statusEl.textContent = "Could not load posts right now.";
    }
  }
}

loadPosts();
