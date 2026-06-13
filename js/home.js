const POSTS_ENDPOINT = "https://kenyanvibe.com/wp-json/wp/v2/posts?per_page=5&_embed";

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
