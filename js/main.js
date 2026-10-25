(() => {
  "use strict";

  const CONFIG = window.SITE_CONFIG || {};
  const ALL_PHONES = Array.isArray(window.PHONES) ? window.PHONES : [];

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const page = document.body?.dataset.page || "";

  const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);

  const normalize = (value = "") =>
    String(value).toLowerCase().trim().replace(/\s+/g, " ");

  const visiblePhones = () =>
    ALL_PHONES.filter(phone => phone.available === true);

  const stateLabel = phone => {
    const condition = normalize(phone.condition);
    if (condition === "boxed" || condition === "new, boxed" || condition === "new boxed") return "Boxed";
    if (condition.startsWith("95")) return "95% New";
    return "99% New";
  };

  const battery = phone =>
    Number.isFinite(Number(phone.batteryHealth))
      ? Number(phone.batteryHealth)
      : 100;

  const availability = phone =>
    phone.status === "in-stock" ? "In Harare" : "Pre-Order";

  const availabilityClass = phone =>
    phone.status === "in-stock" ? "stock" : "preorder";

  const hasPrice = value =>
    value !== null && value !== undefined && value !== "" &&
    Number.isFinite(Number(value));

  const formatPrice = phone =>
    hasPrice(phone.price)
      ? `$${Number(phone.price).toLocaleString("en-US")}`
      : "Price pending";

  const deviceDescription = phone =>
    phone.description ||
    `This ${phone.model} comes with ${phone.storage} of storage. ` +
    `The listed unit is ${stateLabel(phone)} with ${battery(phone)}% battery health ` +
    `and is currently ${availability(phone).toLowerCase()}.`;

  const shuffle = items => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  };

  const getParams = () => new URLSearchParams(location.search);

  const setURLParams = updates => {
    const params = getParams();

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    const next =
      `${location.pathname}${params.toString() ? `?${params}` : ""}`;

    history.replaceState({}, "", next);
  };

  function bindImageFallbacks(root = document) {
    qsa("img[data-product-image]", root).forEach(img => {
      if (img.dataset.boundFallback) return;

      img.dataset.boundFallback = "true";

      img.addEventListener("error", () =>
        img.closest(".phone-card-media, .home-product-media, .product-media")
          ?.classList.add("is-missing")
      );
    });
  }

  function searchText(phone) {
    return normalize([
      phone.brand,
      phone.family,
      phone.model,
      phone.storage,
      stateLabel(phone),
      `${battery(phone)}%`,
      ...(phone.tags || [])
    ].join(" "));
  }

  function iphoneSeries(phone) {
    const match = phone.model.match(/iPhone\s+(\d+)/i);
    return match ? match[1] : "Other";
  }

  function groupBy(items, keyFn) {
    return items.reduce((groups, item) => {
      const key = keyFn(item);
      (groups[key] ||= []).push(item);
      return groups;
    }, {});
  }

  function uniqueModels(items) {
    return [...new Map(
      items.map(phone => [phone.model, phone])
    ).values()].sort((a, b) =>
      a.model.localeCompare(
        b.model,
        undefined,
        { numeric: true }
      )
    );
  }

  function brandPhones(brand, source = visiblePhones()) {
    if (brand === "All") return source;

    return source.filter(phone => phone.brand === brand);
  }

  /* =========================================================
     HOME PAGE
     ========================================================= */

  function renderHome() {
    const modelRoot = qs("#home-models");

    if (!modelRoot) return;

    let brand = "All";
    let homeQuery = "";
    const randomizedHomePhones = shuffle(visiblePhones());

    const homeProductCard = phone => {
      const price = formatPrice(phone);
      const oldPrice = hasPrice(phone.oldPrice)
        ? `$${Number(phone.oldPrice).toLocaleString("en-US")}`
        : "";

      return `
        <article class="home-product-card">
          <a
            class="home-product-link"
            href="product.html?id=${encodeURIComponent(phone.id)}"
            aria-label="View ${escapeHTML(phone.model)}"
          >
            <div class="home-product-media">
              <img
                data-product-image
                src="${escapeHTML(phone.image)}"
                alt="${escapeHTML(phone.model)}"
                loading="lazy"
                width="600"
                height="720"
              >
              <span class="image-fallback">
                Add ${escapeHTML(phone.image.split("/").pop())}
              </span>
            </div>

            <div class="home-product-body">
              <div class="home-product-badges">
                <span class="badge ${availabilityClass(phone)}">
                  ${availability(phone)}
                </span>
                <span class="badge state">${stateLabel(phone)}</span>
              </div>

              <h2>${escapeHTML(phone.model)} ${escapeHTML(phone.storage)}</h2>

              <div class="home-price-row">
                <span class="home-price ${price === "Price pending" ? "pending" : ""}">
                  ${price}
                </span>
                ${oldPrice ? `<del>${oldPrice}</del>` : ""}
              </div>
            </div>
          </a>
        </article>
      `;
    };

    const appleHomeSections = phones => {
      const groups = groupBy(phones, iphoneSeries);

      const keys = Object.keys(groups).sort((a, b) => {
        if (a === "Other") return 1;
        if (b === "Other") return -1;
        return Number(b) - Number(a);
      });

      return keys.map(series => `
        <section class="model-section">
          <h2>
            ${
              series === "Other"
                ? "Other iPhone Models"
                : `iPhone ${escapeHTML(series)} Series`
            }
          </h2>

          <div class="model-chip-grid">
            ${
              uniqueModels(groups[series])
                .map(phone => `
                  <button
                    class="model-chip"
                    type="button"
                    data-home-link="phones.html?brand=Apple&${
                      series === "Other"
                        ? `model=${encodeURIComponent(phone.model)}`
                        : `series=${encodeURIComponent(series)}&model=${encodeURIComponent(phone.model)}`
                    }"
                  >
                    ${escapeHTML(phone.model)}
                  </button>
                `)
                .join("")
            }
          </div>
        </section>
      `).join("");
    };

    const samsungHomeSections = phones => {
      const familyOrder = ["Galaxy S", "Galaxy A", "Galaxy Note"];

      return familyOrder
        .filter(family => phones.some(phone => phone.family === family))
        .map(family => `
          <section class="model-section">
            <h2>${family === "Galaxy S" ? "Galaxy S Series" : family === "Galaxy A" ? "Galaxy A Series" : "Galaxy Note Series"}</h2>

            <div class="model-chip-grid">
              ${
                uniqueModels(phones.filter(phone => phone.family === family))
                  .map(phone => `
                    <button
                      class="model-chip"
                      type="button"
                      data-home-link="phones.html?brand=Samsung&family=${encodeURIComponent(family)}&model=${encodeURIComponent(phone.model)}"
                    >
                      ${escapeHTML(phone.model)}
                    </button>
                  `)
                  .join("")
              }
            </div>
          </section>
        `).join("");
    };

    const render = () => {
      qsa("[data-home-brand]").forEach(button =>
        button.classList.toggle(
          "is-active",
          button.dataset.homeBrand === brand
        )
      );

      const displayBrand =
        brand === "All" ? "All devices" :
        brand === "Apple" ? "iPhone" :
        brand === "Samsung" ? "Samsung" : "Xiaomi Redmi";

      qs("#home-brand-eyebrow").textContent = displayBrand;
      qs("#home-title").textContent =
        brand === "All"
          ? "All devices"
          : brand === "Apple"
            ? "Select iPhone Model"
            : brand === "Samsung"
              ? "Select Samsung Model"
              : "Select Xiaomi Redmi Model";

      const phones = brand === "All"
        ? randomizedHomePhones.filter(phone =>
            !homeQuery || searchText(phone).includes(normalize(homeQuery))
          )
        : brandPhones(brand);

      modelRoot.classList.toggle("is-product-grid", brand === "All" && phones.length > 0);

      if (!phones.length) {
        modelRoot.innerHTML = homeQuery
          ? `
            <div class="empty-state">
              <h2>No phones matched</h2>
              <p>Try another model or search term.</p>
            </div>
          `
          : `
            <div class="empty-state">
              <h2>No phones published yet</h2>
              <p>
                Models appear here once a verified listing is set to
                <strong>available: true</strong> in <code>js/phones.js</code>.
              </p>
            </div>
          `;
        return;
      }

      if (brand === "All") {
        modelRoot.innerHTML = phones.map(homeProductCard).join("");
        bindImageFallbacks(modelRoot);
      } else if (brand === "Apple") {
        modelRoot.innerHTML = `
          <section class="model-section">
            <button
              class="model-chip all-models"
              type="button"
              data-home-link="phones.html?brand=Apple"
            >
              All iPhones
            </button>
          </section>
          ${appleHomeSections(phones)}
        `;
      } else {
        modelRoot.innerHTML = `
          <section class="model-section">
            <button
              class="model-chip all-models"
              type="button"
              data-home-link="phones.html?brand=Samsung"
            >
              All Samsung phones
            </button>
          </section>
          ${samsungHomeSections(phones)}
        `;
      }
    };

    document.addEventListener("click", event => {
      const brandButton = event.target.closest("[data-home-brand]");

      if (brandButton) {
        const selectedBrand = brandButton.dataset.homeBrand;

        if (selectedBrand === "All") {
          brand = "All";
          render();
        } else {
          location.href = `phones.html?brand=${encodeURIComponent(selectedBrand)}`;
        }
        return;
      }

      const linkButton = event.target.closest("[data-home-link]");

      if (linkButton) {
        location.href = linkButton.dataset.homeLink;
      }
    });

    const homeSearchInput = qs("#home-search");

    homeSearchInput?.addEventListener("input", () => {
      homeQuery = homeSearchInput.value.trim();
      render();
    });

    qsa("[data-search-form]").forEach(form =>
      form.addEventListener("submit", event => {
        event.preventDefault();
        homeQuery = new FormData(form).get("q")?.toString().trim() || "";
        render();
      })
    );

    render();
  }

  /* =========================================================
     PHONE LIST / CATALOGUE PAGE
     ========================================================= */

  function renderList() {
    const resultsRoot = qs("#phone-results");

    if (!resultsRoot) return;

    const params = getParams();

    const requestedBrand = params.get("brand");

    const state = {
      brand: ["All", "Apple", "Samsung", "Xiaomi Redmi"].includes(requestedBrand)
        ? requestedBrand
        : "Apple",

      series: params.get("series") || "",
      family: params.get("family") || "",
      model: params.get("model") || "",
      q: params.get("q") || "",
      storage: params.get("storage") || "",
      battery: params.get("battery") || "",
      sort: params.get("sort") || ""
    };

    const pending = {
      storage: state.storage,
      battery: state.battery
    };

    let modelModalBrand =
      state.brand === "All"
        ? "Apple"
        : state.brand;

    const searchInput = qs("#catalogue-search");

    if (searchInput) {
      searchInput.value = state.q;
    }

    const filterPhones = () => {
      let phones =
        state.brand === "All"
          ? visiblePhones()
          : visiblePhones().filter(
              phone => phone.brand === state.brand
            );

      if (state.brand === "Apple" && state.series) {
        phones = phones.filter(
          phone => iphoneSeries(phone) === state.series
        );
      }

      if ((state.brand === "Samsung" || state.brand === "Xiaomi Redmi") && state.family) {
        phones = phones.filter(
          phone => phone.family === state.family
        );
      }

      if (state.model) {
        phones = phones.filter(
          phone => phone.model === state.model
        );
      }

      if (state.q) {
        phones = phones.filter(
          phone =>
            searchText(phone).includes(
              normalize(state.q)
            )
        );
      }

      if (state.storage) {
        phones = phones.filter(
          phone => phone.storage === state.storage
        );
      }

      if (state.battery) {
        phones = phones.filter(
          phone =>
            battery(phone) >= Number(state.battery)
        );
      }

      if (state.sort === "price-asc") {
        phones.sort(
          (a, b) =>
            (Number(a.price) || Infinity) -
            (Number(b.price) || Infinity)
        );
      }

      if (state.sort === "price-desc") {
        phones.sort(
          (a, b) =>
            (Number(b.price) || -Infinity) -
            (Number(a.price) || -Infinity)
        );
      }

      return phones;
    };

    const renderBrandState = () => {
      qsa("[data-brand]").forEach(button =>
        button.classList.toggle(
          "is-active",
          button.dataset.brand === state.brand
        )
      );

      const displayBrand =
        state.brand === "Apple" ? "iPhone" :
        state.brand === "Samsung" ? "Samsung" :
        state.brand === "Xiaomi Redmi" ? "Xiaomi Redmi" : "All devices";

      const mobileBrand = qs("#mobile-page-brand");
      const listHeading = qs("#list-heading");
      if (mobileBrand) mobileBrand.textContent = displayBrand;
      if (listHeading) listHeading.textContent = displayBrand;

      document.title =
        `${displayBrand} | ${CONFIG.businessName || "KukuLanka"}`;

      const catalogueMeta = document.querySelector('meta[name="description"]');
      if (catalogueMeta) {
        catalogueMeta.setAttribute(
          "content",
          `Browse ${displayBrand} phone prices from ${CONFIG.businessName || "KukuLanka"} in Harare, Zimbabwe. Search by model, storage and condition, then order on WhatsApp.`
        );
      }
    };

    const renderSeries = () => {
      const root = qs("#series-tabs");

      if (state.brand === "All") {
        root.innerHTML = "";
        return;
      }

      const phones = brandPhones(state.brand);

      if (state.brand !== "Samsung" && !phones.length) {
        root.innerHTML = "";
        return;
      }

      if (state.brand === "Apple") {
        const series = [...new Set(phones.map(iphoneSeries))]
          .filter(value => value !== "Other")
          .sort((a, b) => Number(b) - Number(a));

        root.innerHTML = series
          .map(value => {
            const seriesPhones = phones.filter(phone => iphoneSeries(phone) === value);
            const representative =
              seriesPhones.find(phone => phone.model === `iPhone ${value}`) ||
              seriesPhones[0];

            return `
              <button
                class="series-tab ${state.series === value ? "is-active" : ""}"
                type="button"
                data-series="${escapeHTML(value)}"
              >
                <span class="series-thumb" aria-hidden="true">
                  <img
                    data-series-image
                    src="${escapeHTML(representative?.image || "")}"
                    alt=""
                    loading="lazy"
                  >
                </span>
                <span class="series-label">iPhone ${escapeHTML(value)} Series</span>
              </button>
            `;
          })
          .join("");
      } else if (state.brand === "Samsung") {
        const samsungCataloguePhones = ALL_PHONES.filter(phone => phone.brand === "Samsung");
        const families = ["Galaxy S", "Galaxy A", "Galaxy Note"]
          .filter(family => samsungCataloguePhones.some(phone => phone.family === family));

        root.innerHTML = families
          .map(family => {
            const representative = phones.find(phone => phone.family === family);
            return `
              <button
                class="series-tab ${state.family === family ? "is-active" : ""}"
                type="button"
                data-family="${escapeHTML(family)}"
              >
                <span class="series-thumb" aria-hidden="true">
                  <img
                    data-series-image
                    src="${escapeHTML(representative?.image || "")}"
                    alt=""
                    loading="lazy"
                  >
                </span>
                <span class="series-label">${family === "Galaxy S" ? "S Series" : family === "Galaxy A" ? "A Series" : "Note Series"}</span>
              </button>
            `;
          })
          .join("");
      } else {
        const families = ["Redmi A", "Redmi Note"]
          .filter(family => phones.some(phone => phone.family === family));

        root.innerHTML = families
          .map(family => {
            const representative = phones.find(phone => phone.family === family);
            return `
              <button
                class="series-tab ${state.family === family ? "is-active" : ""}"
                type="button"
                data-family="${escapeHTML(family)}"
              >
                <span class="series-thumb" aria-hidden="true">
                  <img
                    data-series-image
                    src="${escapeHTML(representative?.image || "")}"
                    alt=""
                    loading="lazy"
                  >
                </span>
                <span class="series-label">${family === "Redmi A" ? "A Series" : "Note Series"}</span>
              </button>
            `;
          })
          .join("");
      }

      qsa("img[data-series-image]", root).forEach(img => {
        img.addEventListener("error", () => {
          img.closest(".series-thumb")?.classList.add("is-missing");
        });
      });
    };

    const card = phone => {
      const price = formatPrice(phone);

      return `
        <article class="phone-card">
          <a
            class="phone-card-link"
            href="product.html?id=${encodeURIComponent(phone.id)}"
            aria-label="View ${escapeHTML(phone.model)}"
          >
            <div class="phone-card-media">
              <img
                data-product-image
                src="${escapeHTML(phone.image)}"
                alt="${escapeHTML(phone.model)}"
                loading="lazy"
                width="600"
                height="720"
              >

              <span class="image-fallback">
                Add ${escapeHTML(
                  phone.image.split("/").pop()
                )}
              </span>
            </div>

            <div class="phone-card-body">
              <div class="card-badges">
                <span
                  class="badge ${availabilityClass(phone)}"
                >
                  ${availability(phone)}
                </span>

                <span class="badge state">
                  ${stateLabel(phone)}
                </span>
              </div>

              <h2>
                ${escapeHTML(phone.model)}
                ${escapeHTML(phone.storage)}
              </h2>

              <p class="phone-meta">
                ${escapeHTML(phone.storage)} storage
                <br>
                Battery health ${battery(phone)}%
              </p>

              <p
                class="price ${
                  price === "Price pending"
                    ? "pending"
                    : ""
                }"
              >
                ${price}
              </p>
            </div>
          </a>
        </article>
      `;
    };

    const renderResults = () => {
      const phones = filterPhones();

      qs("#result-count").textContent =
        `${phones.length} ` +
        `${phones.length === 1 ? "phone" : "phones"}`;

      resultsRoot.innerHTML =
        phones.length
          ? phones.map(card).join("")
          : `
            <div class="empty-state">
              <h2>No phones matched</h2>

              <p>
                ${
                  visiblePhones().length
                    ? "Try another model, search term or filter."
                    : "No verified listings are published yet. Set a real listing to available: true in js/phones.js when it is ready for customers."
                }
              </p>
            </div>
          `;

      bindImageFallbacks(resultsRoot);

      const activeFilters =
        [state.storage, state.battery]
          .filter(Boolean)
          .length;

      const count = qs("#filter-count");

      count.hidden = activeFilters === 0;
      count.textContent = String(activeFilters);

      qs("#filter-button")
        .classList.toggle(
          "is-active",
          activeFilters > 0
        );

      qs("#price-sort")
        .classList.toggle(
          "is-active",
          Boolean(state.sort)
        );
    };

    const renderStorageOptions = () => {
      const storages = [
        ...new Set(
          brandPhones(state.brand)
            .map(phone => phone.storage)
        )
      ]
        .filter(Boolean)
        .sort(
          (a, b) =>
            parseInt(a, 10) -
            parseInt(b, 10)
        );

      qs("#storage-options").innerHTML =
        storages.length
          ? storages
              .map(storage => `
                <button
                  type="button"
                  data-storage="${escapeHTML(storage)}"
                  class="${
                    pending.storage === storage
                      ? "is-selected"
                      : ""
                  }"
                >
                  ${escapeHTML(storage)}
                </button>
              `)
              .join("")
          : `
            <p class="phone-meta">
              No storage options published yet.
            </p>
          `;
    };

    const modelGroupsHTML = brand => {
      const phones = brand === "Samsung"
        ? ALL_PHONES.filter(phone => phone.brand === "Samsung")
        : brandPhones(brand);

      if (!phones.length) {
        return `
          <div class="empty-state">
            <p>
              No models published for
              ${escapeHTML(brand)} yet.
            </p>
          </div>
        `;
      }

      if (brand === "Apple") {
        const groups =
          groupBy(phones, iphoneSeries);

        return Object.keys(groups)
          .sort(
            (a, b) =>
              Number(b) - Number(a)
          )
          .map(series => `
            <section class="modal-model-section">
              <h3>
                ${
                  series === "Other"
                    ? "Other iPhone Models"
                    : `iPhone ${escapeHTML(series)} Series`
                }
              </h3>

              <div class="modal-model-grid">
                ${
                  uniqueModels(groups[series])
                    .map(phone => `
                      <button
                        class="modal-model-button"
                        type="button"
                        data-select-model="${escapeHTML(phone.model)}"
                      >
                        ${escapeHTML(phone.model)}
                      </button>
                    `)
                    .join("")
                }
              </div>
            </section>
          `)
          .join("");
      }

      const families = brand === "Samsung"
        ? ["Galaxy S", "Galaxy A", "Galaxy Note"]
        : ["Redmi A", "Redmi Note"];

      return families
        .filter(family =>
          phones.some(
            phone =>
              phone.family === family
          )
        )
        .map(family => `
          <section class="modal-model-section">
            <h3>
              ${
                family === "Galaxy S"
                  ? "Galaxy S Series"
                  : family === "Galaxy A"
                    ? "Galaxy A Series"
                    : family === "Galaxy Note"
                      ? "Galaxy Note Series"
                      : family === "Redmi A"
                        ? "Redmi A Series"
                        : "Redmi Note Series"
              }
            </h3>

            <div class="modal-model-grid">
              ${
                uniqueModels(
                  phones.filter(
                    phone =>
                      phone.family === family
                  )
                )
                  .map(phone => `
                    <button
                      class="modal-model-button"
                      type="button"
                      data-select-model="${escapeHTML(phone.model)}"
                    >
                      ${escapeHTML(phone.model)}
                    </button>
                  `)
                  .join("")
              }
            </div>
          </section>
        `)
        .join("");
    };

    const renderModelModal = () => {
      qsa("[data-model-brand]").forEach(button =>
        button.classList.toggle(
          "is-active",
          button.dataset.modelBrand === modelModalBrand
        )
      );

      qs("#model-sheet-title").textContent =
        "Choose Model";

      qs("#model-sheet-content").innerHTML =
        modelGroupsHTML(modelModalBrand);
    };

    const sync = ({ updateURL = true } = {}) => {
      renderBrandState();
      renderSeries();
      renderStorageOptions();
      renderResults();

      if (updateURL) {
        setURLParams({
          brand: state.brand,

          series:
            state.brand === "Apple"
              ? state.series
              : null,

          family:
            (state.brand === "Samsung" || state.brand === "Xiaomi Redmi")
              ? state.family
              : null,

          model: state.model,
          q: state.q,
          storage: state.storage,
          battery: state.battery,
          sort: state.sort
        });
      }
    };

    const openModal = id => {
      const modal = qs(`#${id}`);

      if (!modal) return;

      if (id === "model-modal") {
        renderModelModal();
      }

      if (id === "filter-modal") {
        pending.storage =
          state.storage;

        pending.battery =
          state.battery;

        renderStorageOptions();

        qsa("[data-battery]").forEach(button =>
          button.classList.toggle(
            "is-selected",
            button.dataset.battery ===
              pending.battery
          )
        );
      }

      modal.hidden = false;

      document.body.style.overflow =
        "hidden";

      qs(".sheet-close", modal)?.focus();
    };

    const closeModal = id => {
      const modal = qs(`#${id}`);

      if (!modal) return;

      modal.hidden = true;

      document.body.style.overflow = "";
    };

    qsa("[data-all-devices]").forEach(button =>
      button.addEventListener("click", () => {
        location.href = "index.html";
      })
    );

    qsa("[data-brand]").forEach(button =>
      button.addEventListener("click", () => {
        state.brand =
          button.dataset.brand;

        state.series = "";
        state.family = "";
        state.model = "";
        state.storage = "";
        state.battery = "";

        modelModalBrand =
          state.brand === "All"
            ? "Apple"
            : state.brand;

        sync();
      })
    );

    qs("#series-tabs")
      .addEventListener("click", event => {
        const series =
          event.target.closest("[data-series]");

        const family =
          event.target.closest("[data-family]");

        if (series) {
          state.series =
            state.series === series.dataset.series
              ? ""
              : series.dataset.series;

          state.model = "";
        }

        if (family) {
          state.family =
            state.family === family.dataset.family
              ? ""
              : family.dataset.family;

          state.model = "";
        }

        sync();
      });

    qs("#price-sort")
      .addEventListener("click", () => {
        state.sort =
          state.sort === "price-asc"
            ? "price-desc"
            : state.sort === "price-desc"
              ? ""
              : "price-asc";

        sync();
      });

    qs("#model-button")
      .addEventListener(
        "click",
        () => openModal("model-modal")
      );

    qs("#filter-button")
      .addEventListener(
        "click",
        () => openModal("filter-modal")
      );

    document.addEventListener("click", event => {
      const close =
        event.target.closest("[data-close-modal]");

      if (close) {
        closeModal(
          close.dataset.closeModal
        );
      }

      const brand =
        event.target.closest("[data-model-brand]");

      if (brand) {
        modelModalBrand =
          brand.dataset.modelBrand;

        renderModelModal();
      }

      const model =
        event.target.closest("[data-select-model]");

      if (model) {
        state.brand =
          modelModalBrand;

        state.model =
          model.dataset.selectModel;

        state.series =
          state.brand === "Apple"
            ? iphoneSeries({
                model: state.model
              })
            : "";

        const found =
          visiblePhones().find(
            phone =>
              phone.brand === state.brand &&
              phone.model === state.model
          );

        state.family =
          (state.brand === "Samsung" || state.brand === "Xiaomi Redmi")
            ? found?.family || ""
            : "";

        closeModal("model-modal");

        sync();
      }

      const storage =
        event.target.closest("[data-storage]");

      if (storage) {
        pending.storage =
          pending.storage === storage.dataset.storage
            ? ""
            : storage.dataset.storage;

        renderStorageOptions();
      }

      const batteryButton =
        event.target.closest("[data-battery]");

      if (batteryButton) {
        pending.battery =
          pending.battery ===
          batteryButton.dataset.battery
            ? ""
            : batteryButton.dataset.battery;

        qsa("[data-battery]").forEach(button =>
          button.classList.toggle(
            "is-selected",
            button.dataset.battery ===
              pending.battery
          )
        );
      }

      const filterSection =
        event.target.closest(
          "[data-filter-section]"
        );

      if (filterSection) {
        qsa("[data-filter-section]")
          .forEach(button =>
            button.classList.toggle(
              "is-active",
              button === filterSection
            )
          );

        qsa("[data-filter-panel]")
          .forEach(panel =>
            panel.classList.toggle(
              "is-active",
              panel.dataset.filterPanel ===
                filterSection.dataset.filterSection
            )
          );
      }
    });

    qs("#apply-filters")
      .addEventListener("click", () => {
        state.storage =
          pending.storage;

        state.battery =
          pending.battery;

        closeModal("filter-modal");

        sync();
      });

    qs("#reset-filters")
      .addEventListener("click", () => {
        pending.storage = "";
        pending.battery = "";

        state.storage = "";
        state.battery = "";

        closeModal("filter-modal");

        sync();
      });

    let searchTimer;

    searchInput?.addEventListener(
      "input",
      () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {
          state.q =
            searchInput.value.trim();

          state.model = "";

          sync();
        }, 120);
      }
    );

    qsa("[data-search-form]")
      .forEach(form =>
        form.addEventListener(
          "submit",
          event => {
            event.preventDefault();

            state.q =
              searchInput.value.trim();

            state.model = "";

            sync();
          }
        )
      );

    document.addEventListener(
      "keydown",
      event => {
        if (event.key !== "Escape") {
          return;
        }

        qsa(".modal-layer:not([hidden])")
          .forEach(modal =>
            closeModal(modal.id)
          );
      }
    );

    sync({ updateURL: false });
  }

  /* =========================================================
     PRODUCT PAGE
     ========================================================= */

  function renderProduct() {
    const root = qs("#product-view");

    if (!root) return;

    const id =
      getParams().get("id");

    const phone =
      visiblePhones().find(
        item => item.id === id
      );

    if (!phone) {
      root.className =
        "product-empty";

      root.innerHTML = `
        <h1>Phone unavailable</h1>

        <p>
          This phone is not currently published.
          It may have been removed, sold, or
          temporarily hidden.
        </p>

        <a href="phones.html">
          Browse available phones
        </a>
      `;

      return;
    }

    document.title =
      `${phone.model} ${phone.storage} | ` +
      `${CONFIG.businessName || "KukuLanka"}`;

    const productMetaDescription =
      `${phone.model} ${phone.storage} in ${stateLabel(phone)} condition from ${CONFIG.businessName || "KukuLanka"} in Harare, Zimbabwe. Price ${formatPrice(phone)}. ${availability(phone)}. Order on WhatsApp.`;

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.setAttribute("content", productMetaDescription);

    const canonical = document.querySelector('link[rel="canonical"]');
    const productURL = `https://kukulanka.co.zw/product.html?id=${encodeURIComponent(phone.id)}`;
    if (canonical) canonical.setAttribute("href", productURL);

    const setPropertyMeta = (property, content) => {
      const meta = document.querySelector(`meta[property="${property}"]`);
      if (meta) meta.setAttribute("content", content);
    };
    const setNamedMeta = (name, content) => {
      const meta = document.querySelector(`meta[name="${name}"]`);
      if (meta) meta.setAttribute("content", content);
    };

    setPropertyMeta("og:title", document.title);
    setPropertyMeta("og:description", productMetaDescription);
    setPropertyMeta("og:url", productURL);
    setPropertyMeta("og:image", `https://kukulanka.co.zw/${phone.image}`);
    setNamedMeta("twitter:title", document.title);
    setNamedMeta("twitter:description", productMetaDescription);
    setNamedMeta("twitter:image", `https://kukulanka.co.zw/${phone.image}`);

    document.querySelector("#product-seo-schema")?.remove();
    const productSchema = document.createElement("script");
    productSchema.id = "product-seo-schema";
    productSchema.type = "application/ld+json";
    productSchema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${phone.model} ${phone.storage}`,
      description: deviceDescription(phone),
      image: [`https://kukulanka.co.zw/${phone.image}`],
      brand: { "@type": "Brand", name: phone.brand === "Apple" ? "Apple" : phone.brand },
      sku: phone.id,
      offers: {
        "@type": "Offer",
        url: productURL,
        priceCurrency: CONFIG.currency || "USD",
        price: Number(phone.price),
        availability: phone.status === "in-stock"
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
        itemCondition: phone.condition === "Boxed"
          ? "https://schema.org/NewCondition"
          : "https://schema.org/UsedCondition"
      }
    });
    document.head.appendChild(productSchema);

    const message = [
      `Hi, I'm interested in this phone from the ${CONFIG.businessName || "KukuLanka"} website:`,
      "",
      `${phone.model} ${phone.storage}`,
      `State: ${stateLabel(phone)}`,
      `Battery health: ${battery(phone)}%`,
      `Price: ${formatPrice(phone)}`,
      `Availability: ${availability(phone)}`,
      `Product ID: ${phone.id}`,
      "",
      "Can you confirm current availability?"
    ].join("\n");

    const digits =
      String(
        CONFIG.whatsappNumber || ""
      ).replace(/\D/g, "");

    const whatsappURL =
      `https://wa.me/${
        digits.length >= 8
          ? digits
          : ""
      }?text=${encodeURIComponent(message)}`;

    root.innerHTML = `
      <div class="product-media">
        <button
          class="product-back"
          type="button"
          aria-label="Back"
          onclick="history.back()"
        >
          ‹
        </button>

        <img
          data-product-image
          src="${escapeHTML(phone.image)}"
          alt="${escapeHTML(phone.model)}"
          width="900"
          height="1000"
        >

        <span class="image-fallback">
          Add ${escapeHTML(
            phone.image.split("/").pop()
          )}
        </span>
      </div>

      <div class="product-info">
        <div class="product-price-row">
          <div class="product-price">
            ${formatPrice(phone)}
          </div>

          <span
            class="availability-pill ${availabilityClass(phone)}"
          >
            ${availability(phone)}
          </span>
        </div>

        <h1>
          ${escapeHTML(phone.model)}
          ${escapeHTML(phone.storage)}
        </h1>

        <p class="product-spec-line">
          ${escapeHTML(phone.storage)}
          storage
        </p>

        <p class="product-description">
          ${escapeHTML(deviceDescription(phone))}
        </p>

        <div class="product-facts">
          <div class="product-fact">
            <span>State</span>
            <strong>
              ${stateLabel(phone)}
            </strong>
          </div>

          <div class="product-fact">
            <span>Battery health</span>
            <strong>
              ${battery(phone)}%
            </strong>
          </div>
        </div>

        <a
          class="whatsapp-button"
          href="${escapeHTML(whatsappURL)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span
            class="whatsapp-mark"
            aria-hidden="true"
          >
            ☎
          </span>
          Order on WhatsApp
        </a>
      </div>
    `;

    bindImageFallbacks(root);
  }

  /* =========================================================
     INITIALISE CURRENT PAGE
     ========================================================= */

  if (page === "home") {
    renderHome();
  }

  if (page === "list") {
    renderList();
  }

  if (page === "product") {
    renderProduct();
  }
})();