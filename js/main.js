/* おもろまち自治会サイト 共通JS
   役割: スマホ用ナビ（ハンバーガー）の開閉のみ */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".site-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // ナビ内リンクをタップしたら閉じる（スマホ）
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    // ===== microCMS 連携（お知らせ・イベント） =====
    initOshiraseList();
    initTopOshiraseList();
    initEventList();
  });

  /* ---------- microCMS 基本設定 ---------- */
  var MICROCMS_BASE_URL = "https://omoromachi-jichikai-oshirase.microcms.io/api/v1/";
  var MICROCMS_API_KEY = "flI2HmRldoyvObskOVnLBAkHNM82fSOVaqI8";

  /**
   * microCMS の指定エンドポイントから全件取得する
   * @param {string} endpoint "oshirase" | "event"
   * @returns {Promise<Array>} contents 配列
   */
  function fetchMicroCMS(endpoint) {
    return fetch(MICROCMS_BASE_URL + endpoint + "?limit=100", {
      headers: { "X-MICROCMS-API-KEY": MICROCMS_API_KEY }
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("microCMS API error (" + endpoint + "): " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        return (data && data.contents) || [];
      });
  }

  function fetchOshirase() {
    return fetchMicroCMS("oshirase");
  }

  function fetchEvents() {
    return fetchMicroCMS("event");
  }

  /**
   * ISO日付文字列を "YYYY.MM.DD" 形式に整形する
   * @param {string} dateStr
   * @returns {string}
   */
  function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "." + m + "." + day;
  }

  function sortByDate(list, order) {
    return list.slice().sort(function (a, b) {
      var diff = new Date(a.date) - new Date(b.date);
      return order === "asc" ? diff : -diff;
    });
  }

  /**
   * リッチエディタのHTML文字列からプレーンテキストの抜粋を作る
   * @param {string} html
   * @param {number} maxLen
   * @returns {string}
   */
  function excerptFromHtml(html, maxLen) {
    if (!html) return "";
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    var text = (tmp.textContent || "").replace(/\s+/g, " ").trim();
    if (text.length > maxLen) {
      text = text.slice(0, maxLen) + "…";
    }
    return text;
  }

  /**
   * microCMSの画像フィールドを取得する（フィールドIDの揺れに対応）
   * @param {Object} item
   * @returns {Object|null} {url, width, height} 形式、無ければnull
   */
  function getImageField(item) {
    var candidates = [item.image, item.mainvisual, item.visual, item.thumbnail];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] && candidates[i].url) return candidates[i];
    }
    return null;
  }

  /**
   * お知らせ本文を表示用HTMLに整形する。
   * リッチエディタのHTML（タグ入り）はそのまま使い、
   * プレーンテキスト（タグなし）の場合のみ改行を<br>に、URLをリンクに変換する。
   * @param {string} raw
   * @returns {string}
   */
  function formatBodyHtml(raw) {
    if (!raw) return "";
    if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
    var esc = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    esc = esc.replace(/(https?:\/\/[^\s<]+)/g, function (url) {
      return '<a href="' + url + '" target="_blank" rel="noopener">' + url + "</a>";
    });
    return esc.replace(/\n/g, "<br>");
  }

  function showEmptyState(container, message) {
    if (!container) return;
    container.classList.add("is-message");
    container.textContent = message;
  }

  /* ---------- news.html: お知らせ一覧 ---------- */
  function initOshiraseList() {
    var container = document.getElementById("oshirase-list");
    if (!container) return;

    fetchOshirase()
      .then(function (list) {
        var sorted = sortByDate(list, "desc");
        renderOshiraseList(container, sorted);
      })
      .catch(function (err) {
        console.error("お知らせの取得に失敗しました:", err);
        showEmptyState(container, "現在お知らせを読み込めません。時間をおいて再度お試しください。");
      });
  }

  function renderOshiraseList(container, items) {
    container.innerHTML = "";
    container.classList.remove("is-message");

    if (!items.length) {
      showEmptyState(container, "現在お知らせはありません。");
      return;
    }

    items.forEach(function (item) {
      var li = document.createElement("li");

      var imageData = getImageField(item);
      if (imageData) {
        var thumb = document.createElement("div");
        thumb.className = "info-thumb";
        var img = document.createElement("img");
        img.src = imageData.url;
        img.alt = item.title || "";
        img.loading = "lazy";
        thumb.appendChild(img);
        li.appendChild(thumb);
      }

      var dateEl = document.createElement("span");
      dateEl.className = "info-date";
      dateEl.textContent = formatDate(item.date);
      li.appendChild(dateEl);

      var titleEl = document.createElement("h3");
      titleEl.textContent = item.title || "";
      li.appendChild(titleEl);

      var bodyEl = document.createElement("div");
      bodyEl.className = "info-body";
      bodyEl.innerHTML = formatBodyHtml(item.body);
      li.appendChild(bodyEl);

      container.appendChild(li);
    });
  }

  /* ---------- index.html: まちのニュース（最新3件） ---------- */
  function initTopOshiraseList() {
    var container = document.getElementById("top-oshirase-list");
    if (!container) return;

    fetchOshirase()
      .then(function (list) {
        var sorted = sortByDate(list, "desc").slice(0, 3);
        renderTopOshiraseList(container, sorted);
      })
      .catch(function (err) {
        console.error("お知らせの取得に失敗しました:", err);
        showEmptyState(container, "現在お知らせを読み込めません。時間をおいて再度お試しください。");
      });
  }

  function renderTopOshiraseList(container, items) {
    container.innerHTML = "";
    container.classList.remove("is-message");

    if (!items.length) {
      showEmptyState(container, "現在お知らせはありません。");
      return;
    }

    items.forEach(function (item) {
      var article = document.createElement("article");
      article.className = "card";

      var thumb = document.createElement("div");
      thumb.className = "card-thumb";
      var topImageData = getImageField(item);
      if (topImageData) {
        var topImg = document.createElement("img");
        topImg.src = topImageData.url;
        topImg.alt = item.title || "";
        topImg.loading = "lazy";
        thumb.appendChild(topImg);
      }
      article.appendChild(thumb);

      var body = document.createElement("div");
      body.className = "card-body";

      var dateEl = document.createElement("span");
      dateEl.className = "card-date";
      dateEl.textContent = formatDate(item.date);
      body.appendChild(dateEl);

      var titleEl = document.createElement("h3");
      titleEl.textContent = item.title || "";
      body.appendChild(titleEl);

      var excerptEl = document.createElement("p");
      excerptEl.textContent = excerptFromHtml(item.body, 60);
      body.appendChild(excerptEl);

      var moreEl = document.createElement("p");
      moreEl.className = "card-more";
      var moreLink = document.createElement("a");
      moreLink.href = "news.html";
      moreLink.textContent = "続きを読む →";
      moreEl.appendChild(moreLink);
      body.appendChild(moreEl);

      article.appendChild(body);
      container.appendChild(article);
    });
  }

  /* ---------- event.html: イベント情報（開催予定／過去） ---------- */
  function initEventList() {
    var upcomingContainer = document.getElementById("event-list-upcoming");
    var pastContainer = document.getElementById("event-list-past");
    if (!upcomingContainer && !pastContainer) return;

    fetchEvents()
      .then(function (list) {
        var now = new Date();
        var isUpcoming = function (item) {
          if (item.status) return item.status === "開催予定";
          var d = new Date(item.date);
          return !isNaN(d) && d >= now;
        };
        var upcoming = sortByDate(list.filter(isUpcoming), "asc");
        var past = sortByDate(
          list.filter(function (item) { return !isUpcoming(item); }),
          "desc"
        );

        if (upcomingContainer) renderEventCards(upcomingContainer, upcoming, "現在開催予定のイベントはありません。");
        if (pastContainer) renderEventCards(pastContainer, past, "過去のイベント情報はまだありません。");
      })
      .catch(function (err) {
        console.error("イベント情報の取得に失敗しました:", err);
        if (upcomingContainer) showEmptyState(upcomingContainer, "現在イベント情報を読み込めません。時間をおいて再度お試しください。");
        if (pastContainer) showEmptyState(pastContainer, "現在イベント情報を読み込めません。時間をおいて再度お試しください。");
      });
  }

  function renderEventCards(container, items, emptyMessage) {
    container.innerHTML = "";
    container.classList.remove("is-message");

    if (!items.length) {
      showEmptyState(container, emptyMessage);
      return;
    }

    items.forEach(function (item) {
      var article = document.createElement("article");
      article.className = "card";

      var thumb = document.createElement("div");
      thumb.className = "card-thumb thumb-event";
      var imageData = getImageField(item);
      if (imageData) {
        var img = document.createElement("img");
        img.src = imageData.url;
        img.alt = item.title || "";
        img.loading = "lazy";
        thumb.appendChild(img);
      }
      article.appendChild(thumb);

      var body = document.createElement("div");
      body.className = "card-body";

      var dateEl = document.createElement("span");
      dateEl.className = "card-date";
      dateEl.textContent = formatDate(item.date);
      body.appendChild(dateEl);

      var titleEl = document.createElement("h3");
      titleEl.textContent = item.title || "";
      body.appendChild(titleEl);

      var excerptEl = document.createElement("p");
      excerptEl.textContent = excerptFromHtml(item.body, 80);
      body.appendChild(excerptEl);

      article.appendChild(body);
      container.appendChild(article);
    });
  }
})();
