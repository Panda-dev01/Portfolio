"use strict";

/*
  Readable Chatfolio app.js
  - No ThemeForest / Envato redirect
  - No jQuery
  - Works with the existing index.html structure
*/

const App = (() => {
  const state = {
    flows: {},
    keywords: {},
    projectIndex: 0,
    projects: [],
    projectGlobalButtons: [],
    projectFinalButtons: []
  };

  let chatWindow;
  let chatInput;
  let sendButton;
  let menuButton;
  let introScreen;

  const selectors = {
    chatWindow: "#chat-window",
    chatInput: "#chat-input",
    sendButton: "#send-button",
    menuButton: "#btn-menu-toggle",
    introScreen: "#intro-screen",
    masterModal: "#master-modal",
    modalContentArea: "#modal-content-area",
    contactForm: "#ajax-contact-form",
    submitButton: "#form-submit-btn"
  };

  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getAttr(element, name, fallback = "") {
    return element?.getAttribute(name) || fallback;
  }

  function normalize(value = "") {
    return value.toLowerCase().trim();
  }

  function scrollChatToBottom() {
    if (!chatWindow) return;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function hideIntro() {
    introScreen?.classList.add("fade-out");
  }

  function toggleSendButtonState() {
    if (!sendButton || !chatInput) return;
    sendButton.disabled = chatInput.value.trim().length === 0;
  }

  function setBusy(isBusy) {
    if (chatInput) chatInput.disabled = isBusy;
    if (sendButton) sendButton.disabled = isBusy || !chatInput?.value.trim();
    qsa(".btn-primary-nav").forEach((button) => button.classList.toggle("disabled", isBusy));
  }

  function createMessageRow(type = "ai") {
    const row = document.createElement("div");
    row.className = `message-row ${type === "user" ? "user-message" : "ai-message"}`;

    if (type === "ai") {
      const avatar = document.getElementById("chat-avatar")?.cloneNode(true);
      if (avatar) avatar.classList.add("chat-avatar");
      if (avatar) row.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    row.appendChild(bubble);

    return { row, bubble };
  }

  function appendUserMessage(text) {
    const { row, bubble } = createMessageRow("user");
    bubble.textContent = text;
    chatWindow.appendChild(row);
    scrollChatToBottom();
  }

  function appendAIMessage(content, options = {}) {
    const { row, bubble } = createMessageRow("ai");
    if (options.html) {
      bubble.innerHTML = content;
    } else {
      bubble.textContent = content;
    }
    chatWindow.appendChild(row);
    scrollChatToBottom();
    return bubble;
  }

  function showTyping() {
    const { row, bubble } = createMessageRow("ai");
    row.classList.add("typing-active");
    bubble.innerHTML = `
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    `;
    chatWindow.appendChild(row);
    scrollChatToBottom();
    return row;
  }

  function addOptions(buttons = []) {
    if (!buttons.length) return;

    const wrapper = document.createElement("div");
    wrapper.className = "contextual-options";

    buttons.forEach((button) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn btn-primary ${button.styleClass || ""}`.trim();
      btn.innerHTML = `<span class="button-content"><span>${escapeHtml(button.text)}</span></span>`;

      btn.addEventListener("click", () => {
        if (button.link) {
          window.open(button.link, "_blank");
          return;
        }
        if (button.action === "open_contact_form") {
          openContactModal();
          return;
        }
        if (button.action) startConversation(button.action, button.text);
      });

      wrapper.appendChild(btn);
    });

    chatWindow.appendChild(wrapper);
    scrollChatToBottom();
  }

  function parseButtons(container) {
    return qsa(".options li", container).map((item) => ({
      text: item.textContent.trim(),
      action: getAttr(item, "data-action"),
      link: getAttr(item, "data-link"),
      styleClass: getAttr(item, "data-class")
    }));
  }

  function parseGenericFlows() {
    qsa(".generic-flow").forEach((flowElement) => {
      const id = getAttr(flowElement, "data-flow-id") || flowElement.id.replace("flow-", "");
      if (!id) return;

      const blocks = qsa(":scope > *", flowElement)
        .filter((child) => !child.classList.contains("options"))
        .map((child) => child.outerHTML)
        .join("");

      state.flows[id] = {
        type: "generic",
        html: `<div class="rich-paragraph">${blocks}</div>`,
        options: parseButtons(flowElement)
      };

      registerTriggers(flowElement, id);
    });
  }

  function parseProjectsFlow() {
    const projectsFlow = qs("#flow-projects");
    if (!projectsFlow) return;

    state.projects = qsa(".project-item", projectsFlow).map((item) => ({
      title: getAttr(item, "data-title", "Project"),
      link: getAttr(item, "data-link"),
      image: getAttr(item, "data-image"),
      media: getAttr(item, "data-media", "image"),
      youtubeId: getAttr(item, "data-youtube-id"),
      videoUrl: getAttr(item, "data-video-url"),
      summary: qs(".summary", item)?.textContent.trim() || "",
      gallery: qsa(".gallery-urls img", item).map((img) => img.getAttribute("src"))
    }));

    state.projectGlobalButtons = qsa(".project-buttons .global li", projectsFlow).map((item) => ({
      text: item.textContent.trim(),
      action: getAttr(item, "data-action"),
      styleClass: getAttr(item, "data-class")
    }));

    state.projectFinalButtons = qsa(".project-buttons .final li", projectsFlow).map((item) => ({
      text: item.textContent.trim(),
      action: getAttr(item, "data-action"),
      styleClass: getAttr(item, "data-class")
    }));

    state.flows.projects = {
      type: "projects",
      intro: qs(".intro", projectsFlow)?.innerHTML || "Here are my recent projects."
    };

    registerTriggers(projectsFlow, "projects");
  }

  function parseClientsFlow() {
    const clientsFlow = qs("#flow-clients");
    if (!clientsFlow) return;

    const logos = qsa(".client-item", clientsFlow).map((item) => ({
      name: getAttr(item, "data-name"),
      logo: getAttr(item, "data-logo")
    }));

    state.flows.clients = {
      type: "clients",
      intro: qs(".intro", clientsFlow)?.innerHTML || "",
      logos,
      options: parseButtons(clientsFlow)
    };

    registerTriggers(clientsFlow, "clients");
  }

  function parseContactFlow() {
    const contactFlow = qs("#flow-contact");
    if (!contactFlow) return;

    const direct = qsa(".contact-row", contactFlow).map((item) => ({
      label: getAttr(item, "data-label"),
      icon: getAttr(item, "data-icon"),
      value: item.textContent.trim()
    }));

    const socials = qsa(".social-item", contactFlow).map((item) => ({
      icon: getAttr(item, "data-icon"),
      url: getAttr(item, "data-url"),
      styleClass: getAttr(item, "data-class")
    }));

    state.flows.contact = {
      type: "contact",
      intro: qs(".intro", contactFlow)?.innerHTML || "",
      direct,
      socials,
      options: parseButtons(contactFlow)
    };

    registerTriggers(contactFlow, "contact");
  }

  function registerTriggers(element, flowId) {
    const triggers = getAttr(element, "data-triggers");
    if (!triggers) return;
    triggers.split(",").map(normalize).filter(Boolean).forEach((trigger) => {
      state.keywords[trigger] = flowId;
    });
  }

  function findFlowId(input) {
    const text = normalize(input);
    if (!text) return "error";

    if (state.flows[text]) return text;
    if (state.keywords[text]) return state.keywords[text];

    const exactTrigger = Object.keys(state.keywords).find((keyword) => text === keyword);
    if (exactTrigger) return state.keywords[exactTrigger];

    const containedTrigger = Object.keys(state.keywords)
      .sort((a, b) => b.length - a.length)
      .find((keyword) => keyword.length > 2 && text.includes(keyword));

    return containedTrigger ? state.keywords[containedTrigger] : "error";
  }

  function renderGeneric(flow) {
    appendAIMessage(flow.html, { html: true });
    addOptions(flow.options || []);
  }

  function renderProjects(flow) {
    state.projectIndex = 0;
    appendAIMessage(`<div class="rich-paragraph"><p>${flow.intro}</p></div>`, { html: true });
    renderNextProject();
  }

  function renderNextProject() {
    const project = state.projects[state.projectIndex];
    if (!project) return;

    const isLast = state.projectIndex === state.projects.length - 1;
    const mediaIcon = project.media === "youtube" || project.media === "video" ? "fa-solid fa-play" : "fa-regular fa-image";
    const previewLink = project.link
      ? `<a href="${escapeHtml(project.link)}" target="_blank" class="preview-link">Preview <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`
      : "";

    const html = `
      <div class="single-project-card project-fade-in">
        <div class="project-card">
          <div class="project-media-wrapper project-${escapeHtml(project.media)}" data-project-index="${state.projectIndex}">
            ${project.image ? `<img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}">` : ""}
            <span class="media-icon-overlay"><i class="${mediaIcon}"></i></span>
          </div>
          <div class="details">
            <h4>${escapeHtml(project.title)}</h4>
            <p>${escapeHtml(project.summary)}</p>
            ${previewLink}
          </div>
        </div>
      </div>
    `;

    appendAIMessage(html, { html: true });

    const buttons = [];
    if (!isLast) {
      buttons.push({ text: "Show Next Project", action: "__next_project" });
      buttons.push(...state.projectGlobalButtons);
    } else {
      buttons.push(...state.projectFinalButtons);
    }

    addOptions(buttons);
    state.projectIndex += 1;
  }

  function renderClients(flow) {
    let html = `<div class="rich-paragraph"><p>${flow.intro}</p></div>`;
    html += `<div class="client-logos-wrapper">`;
    flow.logos.forEach((logo, index) => {
      html += `
        <div class="client-logo-item animated-logo" style="animation-delay:${index * 80}ms">
          <img src="${escapeHtml(logo.logo)}" alt="${escapeHtml(logo.name)}">
        </div>
      `;
    });
    html += `</div>`;
    appendAIMessage(html, { html: true });
    addOptions(flow.options || []);
  }

  function renderContact(flow) {
    let html = `<div class="contact-section-wrapper"><div class="rich-paragraph"><p>${flow.intro}</p></div>`;

    flow.direct.forEach((item) => {
      html += `
        <div class="contact-direct-row">
          <i class="${escapeHtml(item.icon)}"></i>
          <span class="type-target">${escapeHtml(item.label)}</span>
          <span>${escapeHtml(item.value)}</span>
        </div>
      `;
    });

    html += `<div class="contact-social-row">`;
    flow.socials.forEach((item) => {
      html += `
        <a href="${escapeHtml(item.url)}" target="_blank" class="contact-social-icon visible">
          <i class="${escapeHtml(item.icon)} ${escapeHtml(item.styleClass)}"></i>
        </a>
      `;
    });
    html += `</div></div>`;

    appendAIMessage(html, { html: true });
    addOptions(flow.options || []);
  }

  async function startConversation(flowId, visibleUserText = "") {
    hideIntro();

    if (visibleUserText) appendUserMessage(visibleUserText);

    if (flowId === "__next_project") {
      renderNextProject();
      return;
    }

    const flow = state.flows[flowId] || state.flows.error;
    if (!flow) return;

    setBusy(true);
    const typing = showTyping();

    await new Promise((resolve) => setTimeout(resolve, 450));
    typing.remove();

    if (flow.type === "projects") renderProjects(flow);
    else if (flow.type === "clients") renderClients(flow);
    else if (flow.type === "contact") renderContact(flow);
    else renderGeneric(flow);

    setBusy(false);
    toggleSendButtonState();
  }

  function handleUserSubmit() {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    toggleSendButtonState();
    const flowId = findFlowId(text);
    startConversation(flowId, text);
  }

  function setupNavigation() {
    qsa("[data-action], [data-flow]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const targetModal = button.getAttribute("data-target");
        if (targetModal) return; // handled by custom modal script in index.html

        const action = button.getAttribute("data-action") || button.getAttribute("data-flow");
        if (!action || action === "none") return;

        if (action === "open_contact_form") {
          openContactModal();
          return;
        }

        const label = button.textContent.trim();
        startConversation(action, label);
      });
    });

    qsa("[data-link]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const link = button.getAttribute("data-link");
        if (!link) return;
        event.stopPropagation();
        if (button.hasAttribute("onclick")) return;
        window.open(link, "_blank");
      });
    });
  }

  function setupInput() {
    chatInput.addEventListener("input", toggleSendButtonState);
    sendButton.addEventListener("click", handleUserSubmit);
    chatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleUserSubmit();
      }
    });
  }

  function setupMenuToggle() {
    if (!menuButton) return;
    menuButton.addEventListener("click", () => {
      document.body.classList.toggle("open-menu");
    });
  }

  function setupMasterModal() {
    const modal = qs(selectors.masterModal);
    if (!modal) return;

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeContactModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeContactModal();
    });
  }

  function setupContactForm() {
    const form = qs(selectors.contactForm);
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = form.querySelector('[name="user_name"]')?.value.trim() || "";
      const email = form.querySelector('[name="user_email"]')?.value.trim() || "";
      const message = form.querySelector('[name="user_message"]')?.value.trim() || "";

      const mailto = `mailto:itx.ammarshahid1234@gmail.com?subject=${encodeURIComponent("Portfolio Inquiry from " + name)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
      window.location.href = mailto;

      form.reset();
      closeContactModal();
      startConversation("msg_success");
    });
  }

  function setupThemeToggle() {
    const checkbox = qs("#checkbox");
    if (!checkbox) return;

    const savedTheme = localStorage.getItem("portfolio-theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
      checkbox.checked = true;
    }

    checkbox.addEventListener("change", () => {
      document.body.classList.toggle("dark", checkbox.checked);
      localStorage.setItem("portfolio-theme", checkbox.checked ? "dark" : "light");
    });
  }

  function setupProjectMediaClicks() {
    document.addEventListener("click", (event) => {
      const media = event.target.closest(".project-media-wrapper");
      if (!media) return;

      const index = Number(media.getAttribute("data-project-index"));
      const project = state.projects[index];
      if (!project) return;

      if (project.media === "youtube" && project.youtubeId) {
        openMasterModal(`
          <iframe width="100%" height="420" src="https://www.youtube.com/embed/${escapeHtml(project.youtubeId)}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        `);
      } else if (project.media === "video" && project.videoUrl) {
        openMasterModal(`<video src="${escapeHtml(project.videoUrl)}" controls autoplay style="width:100%"></video>`);
      } else if (project.media === "gallery" && project.gallery.length) {
        const images = project.gallery.map((src) => `<img src="${escapeHtml(src)}" alt="" style="width:100%;border-radius:20px;margin-bottom:15px;display:block;">`).join("");
        openMasterModal(images);
      } else if (project.image) {
        openMasterModal(`<img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" style="width:100%;border-radius:20px;display:block;">`);
      }
    });
  }

  function init() {
    chatWindow = qs(selectors.chatWindow);
    chatInput = qs(selectors.chatInput);
    sendButton = qs(selectors.sendButton);
    menuButton = qs(selectors.menuButton);
    introScreen = qs(selectors.introScreen);

    if (!chatWindow || !chatInput || !sendButton) return;

    parseGenericFlows();
    parseProjectsFlow();
    parseClientsFlow();
    parseContactFlow();

    setupNavigation();
    setupInput();
    setupMenuToggle();
    setupMasterModal();
    setupContactForm();
    setupThemeToggle();
    setupProjectMediaClicks();
    toggleSendButtonState();

    const preloader = qs("#preloader");
    setTimeout(() => preloader?.classList.add("preloaded"), 500);
  }

  return { init, startConversation };
})();

function openMasterModal(html = "") {
  const modal = document.querySelector("#master-modal");
  const content = document.querySelector("#modal-content-area");
  if (!modal || !content) return;
  if (html) content.innerHTML = html;
  modal.classList.add("modal-contact");
  modal.classList.add("visible");
  document.body.style.overflow = "hidden";
}

function closeMasterModal() {
  const modal = document.querySelector("#master-modal");
  if (!modal) return;
  modal.classList.remove("visible");
  modal.classList.remove("modal-contact");
  document.body.style.overflow = "";
}

function openContactModal() {
  openMasterModal();
}

function closeContactModal() {
  closeMasterModal();
}

function downloadCV() {
  window.open("assets/link-to-cv.html", "_blank");
}

window.addEventListener("DOMContentLoaded", App.init);
