const API_BASE = "https://kenyanvibe.com/wp-json/wp/v2/posts";
const POST_CACHE_PREFIX = "kv_post_cache_v1:";
const CACHE_TTL_MS = 5 * 60 * 1000;

const statusEl = document.getElementById("status");
const postEl = document.getElementById("post");

function buildPostUrl(slug) {
  const params = new URLSearchParams({
    slug,
    _embed: "wp:featuredmedia,wp:term",
    _fields: "id,slug,date,title,content,_embedded",
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
      !parsed.data ||
      typeof parsed.data !== "object"
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
    featuredImage.loading = "lazy";
    featuredImage.decoding = "async";
    postEl.appendChild(featuredImage);
  }
  if (categories.length > 0) {
    const categoryText = document.createElement("p");
    categoryText.textContent = `Categories: ${categories.join(", ")}`;
    postEl.appendChild(categoryText);
  }
  postEl.appendChild(content);
}

async function fetchPostFromApi(slug) {
  const response = await fetch(buildPostUrl(slug));

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const posts = await response.json();

  if (!Array.isArray(posts)) {
    throw new Error("Unexpected response shape");
  }

  return posts;
}

async function loadPost() {
  const slug = getSlugFromPath();

  if (!slug) {
    statusEl.textContent = "Missing post slug.";
    return;
  }

  const cacheKey = `${POST_CACHE_PREFIX}${slug}`;
  const cached = readCache(cacheKey);
  const hasFreshCache = cached && isCacheFresh(cached);

  if (hasFreshCache) {
    renderPost(cached.data);
    statusEl.textContent = "";

    const cachedTitle = (cached.data.title?.rendered || "Post").replace(
      /<[^>]*>/g,
      ""
    );
    document.title = cachedTitle;
  }

  try {
    const posts = await fetchPostFromApi(slug);

    if (!Array.isArray(posts) || posts.length === 0) {
      if (!hasFreshCache) {
        statusEl.textContent = "Post not found.";
      }
      return;
    }

    const post = posts[0];
    writeCache(cacheKey, post);
    renderPost(post);
    statusEl.textContent = "";

    const plainTitle = (post.title?.rendered || "Post").replace(/<[^>]*>/g, "");
    document.title = plainTitle;
  } catch (error) {
    if (!hasFreshCache) {
      statusEl.textContent = "Could not load this post right now.";
    }
  }
}

loadPost();
