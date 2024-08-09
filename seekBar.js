const seekBarContainer = document.getElementById('seek-bar-container');
let hideTimeout;

// Function to show the seek bar
function showSeekBar() {
  clearTimeout(hideTimeout);
  seekBarContainer.classList.add('show');
}

// Function to hide the seek bar after a timeout
function startHideSeekBarTimeout() {
  hideTimeout = setTimeout(() => {
    seekBarContainer.classList.remove('show');
  }, 5000);
}

// Show the seek bar on initial page load
window.addEventListener('load', () => {
  showSeekBar();
});

// Event listener for mouse movement
document.addEventListener('mousemove', (event) => {
  const screenHeight = window.innerHeight;
  if (event.clientY > screenHeight - 50) { // If mouse is near the bottom
    showSeekBar();
  } else {
    startHideSeekBarTimeout();
  }
});

// Event listener for touch movement
document.addEventListener('touchmove', (event) => {
  const touch = event.touches[0];
  const screenHeight = window.innerHeight;
  if (touch.clientY > screenHeight - 50) { // If touch is near the bottom
    showSeekBar();
  } else {
    startHideSeekBarTimeout();
  }
});

// Ensure seek bar stays visible when interacting with it
seekBarContainer.addEventListener('mouseenter', () => {
  clearTimeout(hideTimeout); // Keep seek bar visible when hovering over it
});

seekBarContainer.addEventListener('mouseleave', () => {
  startHideSeekBarTimeout();
});

// Prevent hiding the seek bar when touching it
seekBarContainer.addEventListener('touchstart', () => {
  clearTimeout(hideTimeout); // Keep seek bar visible when touching it
});

// Start hiding when touch leaves the seek bar area
seekBarContainer.addEventListener('touchend', () => {
  startHideSeekBarTimeout();
});
