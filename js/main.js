// Mobile nav toggle
const toggle = document.getElementById('nav-toggle');
const links = document.getElementById('nav-links');

if (toggle && links) {
  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('open');
    }
  });
}

// Set minimum date for date inputs to today
document.querySelectorAll('input[type="date"]').forEach(input => {
  if (!input.getAttribute('min')) {
    input.setAttribute('min', new Date().toISOString().split('T')[0]);
  }
});
