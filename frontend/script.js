const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");

menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("show");
});

document.querySelectorAll(".nav-menu a").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-menu a").forEach(nav => {
      nav.classList.remove("active");
    });

    item.classList.add("active");

    if (window.innerWidth <= 768) {
      sidebar.classList.remove("show");
    }
  });
});