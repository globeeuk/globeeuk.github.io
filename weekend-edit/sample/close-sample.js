const closeSample = document.querySelector('.close-sample');

closeSample.addEventListener('click', (event) => {
  event.preventDefault();
  window.close();
  // Browsers can refuse to close a tab that the reader opened directly.
  window.setTimeout(() => window.location.replace(closeSample.href), 150);
});
