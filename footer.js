
document.addEventListener("DOMContentLoaded", () => {
    const footer = document.querySelector("#merssh-footer");
    if (!footer) return;

    const year = footer.querySelector("#footer-year");
    const form = footer.querySelector("#merssh-newsletter");
    const email = footer.querySelector("#footer-email");
    const message = footer.querySelector("#newsletter-message");
    const columns = footer.querySelectorAll(".footer-column:not(.footer-newsletter)");
    const mobile = window.matchMedia("(max-width: 480px)");

    if (year) year.textContent = new Date().getFullYear();

    function setupMenus() {
        columns.forEach(column => {
            const heading = column.querySelector(".footer-heading");
            if (!heading) return;

            heading.setAttribute("aria-expanded", String(!mobile.matches));
            column.classList.toggle("is-open", !mobile.matches);
        });
    }

    columns.forEach(column => {
        const heading = column.querySelector(".footer-heading");
        if (!heading) return;

        heading.addEventListener("click", () => {
            if (!mobile.matches) return;

            const shouldOpen = heading.getAttribute("aria-expanded") !== "true";

            columns.forEach(item => {
                item.classList.remove("is-open");
                const button = item.querySelector(".footer-heading");
                if (button) button.setAttribute("aria-expanded", "false");
            });

            if (shouldOpen) {
                column.classList.add("is-open");
                heading.setAttribute("aria-expanded", "true");
            }
        });
    });

    setupMenus();

    if (mobile.addEventListener) {
        mobile.addEventListener("change", setupMenus);
    } else {
        mobile.addListener(setupMenus);
    }

    if (form && email && message) {
        form.addEventListener("submit", event => {
            event.preventDefault();
            message.classList.remove("error");

            if (!email.value.trim() || !email.validity.valid) {
                message.textContent = "Please enter a valid email address.";
                message.classList.add("error");
                email.focus();
                return;
            }

            message.textContent = "Email validated! Connect your newsletter service to complete subscription.";
        });

        email.addEventListener("input", () => {
            message.textContent = "";
            message.classList.remove("error");
        });
    }
});
