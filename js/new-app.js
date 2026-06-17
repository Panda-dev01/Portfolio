"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const chatWindow = document.getElementById("chat-window");
    const chatInput = document.getElementById("chat-input");
    const sendButton = document.getElementById("send-button");
    const navButtons = document.querySelectorAll("[data-flow]");
    const actionButtons = document.querySelectorAll("[data-action]");
    const introScreen = document.getElementById("intro-screen");

    const flows = {};
    const triggers = {};

    document.querySelectorAll("[data-flow-id], [id^='flow-']").forEach(section => {
        const id = section.dataset.flowId || section.id.replace("flow-", "");
        flows[id] = section;

        const triggerText = section.dataset.triggers || "";
        triggerText.split(",").forEach(t => {
            if (t.trim()) triggers[t.trim().toLowerCase()] = id;
        });
    });

    document.querySelectorAll("#flow-projects, #flow-clients, #flow-contact").forEach(section => {
        const id = section.id.replace("flow-", "");
        flows[id] = section;

        const triggerText = section.dataset.triggers || "";
        triggerText.split(",").forEach(t => {
            if (t.trim()) triggers[t.trim().toLowerCase()] = id;
        });
    });

    function hideIntro() {
        if (introScreen) introScreen.style.display = "none";
    }

    function scrollBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function addMessage(content, type = "ai") {
        hideIntro();

        const row = document.createElement("div");
        row.className = `message-row ${type}-message`;

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";
        bubble.innerHTML = content;

        row.appendChild(bubble);
        chatWindow.appendChild(row);
        scrollBottom();
    }

    function addUserMessage(text) {
        addMessage(text, "user");
    }

    function renderOptions(section) {
        const options = section.querySelectorAll(".options li, .project-buttons li");
        if (!options.length) return "";

        let html = `<div class="button-container">`;

        options.forEach(opt => {
            const text = opt.textContent.trim();
            const action = opt.dataset.action || "";
            const link = opt.dataset.link || "";
            const cls = opt.dataset.class || "";

            if (link) {
                html += `<a href="${link}" target="_blank" class="btn btn-primary ${cls}">
                    <span class="button-content"><span>${text}</span></span>
                </a>`;
            } else {
                html += `<button class="btn btn-primary ${cls}" data-action="${action}">
                    <span class="button-content"><span>${text}</span></span>
                </button>`;
            }
        });

        html += `</div>`;
        return html;
    }

    function runFlow(flowId) {
        const section = flows[flowId];

        if (!section) {
            addMessage(`
                <p>Sorry, ye section nahi mila.</p>
                <p>Try: <strong>about</strong>, <strong>skills</strong>, <strong>projects</strong>, <strong>clients</strong>, <strong>contact</strong></p>
            `);
            return;
        }

        if (flowId === "projects") {
            renderProjects(section);
            return;
        }

        if (flowId === "clients") {
            renderClients(section);
            return;
        }

        if (flowId === "contact") {
            renderContact(section);
            return;
        }

        let content = "";

        Array.from(section.children).forEach(child => {
            if (!child.classList.contains("options")) {
                content += child.outerHTML;
            }
        });

        content += renderOptions(section);

        addMessage(content);
    }

    function renderProjects(section) {
        const intro = section.querySelector(".intro")?.outerHTML || "";
        const projects = section.querySelectorAll(".project-item");

        let html = intro;
        html += `<div class="projects-chat-grid">`;

        projects.forEach(project => {
            const title = project.dataset.title || "Project";
            const image = project.dataset.image || "";
            const summary = project.querySelector(".summary")?.textContent || "";
            const link = project.dataset.link || "#";

            html += `
                <div class="chat-project-card">
                    <img src="${image}" alt="${title}">
                    <div>
                        <h3>${title}</h3>
                        <p>${summary}</p>
                        <a href="${link}" target="_blank" class="btn btn-primary">View Project</a>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        html += renderOptions(section);

        addMessage(html);
    }

    function renderClients(section) {
        const intro = section.querySelector(".intro")?.outerHTML || "";
        const clients = section.querySelectorAll(".client-item");

        let html = intro;
        html += `<div class="client-logo-grid">`;

        clients.forEach(client => {
            const name = client.dataset.name || "Client";
            const logo = client.dataset.logo || "";

            html += `
                <div class="client-logo-card">
                    <img src="${logo}" alt="${name}">
                </div>
            `;
        });

        html += `</div>`;
        html += renderOptions(section);

        addMessage(html);
    }

    function renderContact(section) {
        const intro = section.querySelector(".intro")?.outerHTML || "";
        const contacts = section.querySelectorAll(".contact-row");
        const socials = section.querySelectorAll(".social-item");

        let html = intro;
        html += `<div class="contact-details">`;

        contacts.forEach(item => {
            html += `
                <div class="contact-detail-row">
                    <i class="${item.dataset.icon}"></i>
                    <strong>${item.dataset.label}</strong>
                    <span>${item.textContent.trim()}</span>
                </div>
            `;
        });

        html += `</div>`;

        html += `<div class="social-row">`;
        socials.forEach(item => {
            html += `
                <a href="${item.dataset.url}" target="_blank" class="social-icon ${item.dataset.class}">
                    <i class="${item.dataset.icon}"></i>
                </a>
            `;
        });
        html += `</div>`;

        html += `<button class="btn btn-primary" onclick="openContactModal()">Send Message</button>`;
        html += renderOptions(section);

        addMessage(html);
    }

    function handleInput(text) {
        const value = text.toLowerCase().trim();

        if (!value) return;

        addUserMessage(text);

        const matchedFlow = triggers[value] || value;

        setTimeout(() => {
            runFlow(matchedFlow);
        }, 400);
    }

    navButtons.forEach(btn => {
        btn.addEventListener("click", function () {
            runFlow(this.dataset.flow);
        });
    });

    document.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-action]");

        if (btn) {
            const action = btn.dataset.action;
            if (action) runFlow(action);
        }
    });

    if (chatInput) {
        chatInput.addEventListener("input", function () {
            sendButton.disabled = this.value.trim() === "";
        });

        chatInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();

                const text = chatInput.value.trim();
                chatInput.value = "";
                sendButton.disabled = true;

                handleInput(text);
            }
        });
    }

    if (sendButton) {
        sendButton.addEventListener("click", function () {
            const text = chatInput.value.trim();
            chatInput.value = "";
            sendButton.disabled = true;

            handleInput(text);
        });
    }

    window.openContactModal = function () {
        const modal = document.getElementById("master-modal");
        if (modal) modal.classList.add("active");
    };

    window.closeContactModal = function () {
        const modal = document.getElementById("master-modal");
        if (modal) modal.classList.remove("active");
    };

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeContactModal();
        }
    });

    const preloader = document.getElementById("preloader");
    if (preloader) {
        window.addEventListener("load", function () {
            preloader.classList.add("fade-out");
            setTimeout(() => preloader.style.display = "none", 600);
        });
    }
});